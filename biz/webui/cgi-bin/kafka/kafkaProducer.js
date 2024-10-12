const kafka = require('kafka-node');
const client = new kafka.KafkaClient({kafkaHost: 'localhost:9092'});
const producer = new kafka.Producer(client);

producer.on('ready', () => {
    console.log('Kafka producer is ready');
});

producer.on('error', (err) => {
    console.error('Error in Kafka producer:', err);
});

function sendLogsToKafka(logs) {
    const payloads = logs.map(log => ({
        topic: 'logs',
        messages: JSON.stringify(log)
    }));

    producer.send(payloads, (err, data) => {
        if (err) {
            console.error('Error sending logs to Kafka:', err);
        } else {
            console.log('Logs sent to Kafka:', data);
        }
    });
}

module.exports = {
    sendLogsToKafka
};