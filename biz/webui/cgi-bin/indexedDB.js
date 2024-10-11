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
                db.createObjectStore(storeName, { autoIncrement: true });
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

