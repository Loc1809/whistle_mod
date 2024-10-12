const cron = require('node-cron');
const {fetchLogs, clearLogs} = require('./indexedDB');
const {sendLogsToKafka} = require('./kafkaProducer');

cron.schedule('*/10 * * * *', async () => {
    try {
        const logs = await fetchLogs();
        if (logs.length > 0) {
            sendLogsToKafka(logs);
            await clearLogs();
        }
    } catch (error) {
        console.error('Error processing logs:', error);
    }
});

console.log('Cron job started');