const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { openDB, addLog, fetchLogs, clearLogs } = require('./kafka/indexedDb');
const { sendLogsToKafka } = require('./kafka/kafkaProducer');

var proxy = require('../lib/proxy');
var util = require('./util');
var config = require('../../../lib/config');
var rulesUtil = require('../../../lib/rules/util');
var ca = require('../../../lib/https/ca');

var properties = rulesUtil.properties;
var rules = rulesUtil.rules;
var pluginMgr = proxy.pluginMgr;
var logger = proxy.logger;

let lastLogTime = Date.now();

async function writeProxyLog(data) {
    try {
        await addLog({ timestamp: Date.now(), data });
        console.log('Log added to IndexedDB');
    } catch (err) {
        console.error(`Error adding log to IndexedDB: ${err.message}`);
    }
}

async function sendLogs() {
    try {
        const logs = await fetchLogs();
        if (logs.length > 0) {
            sendLogsToKafka(logs);
            await clearLogs();
            console.log('Logs sent and cleared from IndexedDB');
        }
    } catch (err) {
        console.error('Error sending logs:', err);
    }
}

function scheduleLogSending() {
    setInterval(async () => {
        const currentTime = Date.now();
        if (currentTime - lastLogTime >= 10 * 60 * 1000) { // 10 minutes
            await sendLogs();
            lastLogTime = currentTime;
        }
    }, 60 * 1000); // Check every minute
}

module.exports = async function(req, res) {
    try {
        var data = req.query;
        if (data.ids && typeof data.ids == 'string') {
            data.ids = data.ids.split(',');
        } else {
            data.ids = null;
        }
        var clientIp = util.getClientIp(req);
        var stopRecordConsole = data.startLogTime == -3;
        var stopRecordSvrLog = data.startSvrLogTime == -3;
        var h = req.headers;
        var curLogId = proxy.getLatestId();
        var curSvrLogId = logger.getLatestId();

        // Define the data to be logged
        const logData = {
            ec: 0,
            version: config.version,
            epm: config.epm,
            custom1: properties.get('Custom1'),
            custom2: properties.get('Custom2'),
            custom1Key: properties.get('Custom1Key'),
            custom2Key: properties.get('Custom2Key'),
            supportH2: config.enableH2,
            hasInvalidCerts: ca.hasInvalidCerts,
            clientIp: clientIp,
            mrulesClientId: config.mrulesClientId,
            mrulesTime: config.mrulesTime,
            mvaluesClientId: config.mvaluesClientId,
            mvaluesTime: config.mvaluesTime,
            server: util.getServerInfo(req),
            hasARules: rulesUtil.hasAccountRules ? 1 : undefined,
            curLogId: stopRecordConsole ? undefined : curLogId,
            curSvrLogId: stopRecordSvrLog ? undefined : curSvrLogId,
            lastLogId: stopRecordConsole ? curLogId : undefined,
            lastSvrLogId: stopRecordSvrLog ? curSvrLogId : undefined,
            log: stopRecordConsole ? [] : proxy.getLogs(data.startLogTime, data.count, data.logId),
            svrLog: stopRecordSvrLog ? [] : logger.getLogs(data.startSvrLogTime, data.count),
            plugins: pluginMgr.getPlugins(),
            pluginsRoot: config.PLUGIN_INSTALL_ROOT,
            disabledPlugins: !config.notAllowedDisablePlugins && properties.get('disabledPlugins') || {},
            allowMultipleChoice: properties.get('allowMultipleChoice'),
            backRulesFirst: properties.get('backRulesFirst'),
            disabledAllPlugins: !config.notAllowedDisablePlugins && properties.get('disabledAllPlugins'),
            disabledAllRules: !config.notAllowedDisableRules && properties.get('disabledAllRules'),
            interceptHttpsConnects: properties.isEnableCapture(),
            enableHttp2: properties.isEnableHttp2(),
            defaultRulesIsDisabled: rules.defaultRulesIsDisabled(),
            list: rules.getSelectedList(),
            data: proxy.getData(data, clientIp, h['x-whistle-filter-key'], h['x-whistle-filter-value'], h['x-whistle-filter-client-id'], h[config.CLIENT_ID_HEADER])
        };

        // Check if newIds has a length greater than 0
        if (logData.data && logData.data.newIds && logData.data.newIds.length > 0) {
            // Write the log data to IndexedDB
            await writeProxyLog(logData.data.data);
        }

        util.sendGzip(req, res, logData);
    } catch (error) {
        console.error(`Error processing request: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
};

// Initialize IndexedDB and schedule log sending
(async () => {
    await openDB();
    scheduleLogSending();
})();