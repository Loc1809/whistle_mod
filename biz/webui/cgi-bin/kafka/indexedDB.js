const dbName = 'logDB';
const storeName = 'logs';
const version = 1;

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, {autoIncrement: true});
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(`Error opening database: ${event.target.errorCode}`);
        };
    });
}

function addLog(log) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(log);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject(`Error adding log: ${event.target.errorCode}`);
        };
    });
}

function fetchLogs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(`Error fetching logs: ${event.target.errorCode}`);
        };
    });
}

function clearLogs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject(`Error clearing logs: ${event.target.errorCode}`);
        };
    });
}

module.exports = {
    openDB,
    addLog,
    fetchLogs,
    clearLogs
};