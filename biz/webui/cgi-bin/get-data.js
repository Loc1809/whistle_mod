const fs = require('fs');
const path = require('path');
const moment = require('moment');

var proxy = require('../lib/proxy');
var util = require('./util');
var config = require('../../../lib/config');
var rulesUtil = require('../../../lib/rules/util');
var ca = require('../../../lib/https/ca');

var properties = rulesUtil.properties;
var rules = rulesUtil.rules;
var pluginMgr = proxy.pluginMgr;
var logger = proxy.logger;

function writeProxyLog(logDirectory = 'C:/system_log/proxy', index = 0, data) {
    // Ensure the log directory exists
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
    }

    // Generate timestamp
    const timestamp = moment().format('D/M/Y_H:m:s');

    // Define the log file path
    const logFilePath = path.join(logDirectory, `${timestamp}_${index}.log`);

    // Write the data to the log file
    const logContent = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    fs.writeFileSync(logFilePath, logContent);

    console.log(`Log file created at: ${logFilePath}`);
}

module.exports = function(req, res) {
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

  // Write the log data
  writeProxyLog('C:/system_log/proxy', 0, logData);

  util.sendGzip(req, res, logData);
};