const fs = require('fs');
const path = require('path');
const moment = require('moment');

function writeProxyLog(logDirectory = 'C:/system_log/proxy', index = 0, data) {
    try {
        // Ensure the log directory exists
        if (!fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory, {recursive: true});
        }

        // Generate timestamp
        const timestamp = moment().format('D-M-Y_H-m-s'); // Changed to use hyphen for better compatibility

        // Define the log file path
        const logFilePath = path.join(logDirectory, `${timestamp}_${index}.log`);

        // Generate log content
        let logContent = '';
        for (const [key, value] of Object.entries(data)) {
            logContent += `${key}:\n`;
            for (const [subKey, subValue] of Object.entries(value)) {
                logContent += `  ${subKey}: ${JSON.stringify(subValue, null, 2)}\n`;
            }
            logContent += '\n';
        }

        // Write the data to the log file (create or overwrite if it already exists)
        fs.writeFileSync(logFilePath, logContent, {flag: 'w'}); // 'w' ensures that the file is overwritten if it exists
    } catch (err) {
        console.error(`Error writing log file: ${err.message}`);
    }
}

module.exports = {
    writeProxyLog
};