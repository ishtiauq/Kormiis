/**
 * IndexedDB Helper for HR Pulse (Offline-First Cache Layer)
 */

const DB_NAME = 'hr_pulse_sync_db';
const DB_VERSION = 2; // Upgraded to v2

const STORE_FILES = 'files';
const STORE_PENDING_WRITES = 'pending_writes';
const STORE_SYNC_STATE = 'sync_state';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Upgrade from v1
      if (db.objectStoreNames.contains('file_metadata')) {
        db.deleteObjectStore('file_metadata'); // We are migrating to sync_state with filename as key
      }

      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'filename' });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING_WRITES)) {
        db.createObjectStore(STORE_PENDING_WRITES, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_STATE)) {
        db.createObjectStore(STORE_SYNC_STATE, { keyPath: 'filename' });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// --- FILES STORE ---
export async function getLocalFile(filename) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const request = store.get(filename);
      request.onsuccess = (e) => resolve(e.target.result?.data || null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('getLocalFile error', err);
    return null;
  }
}

export async function setLocalFile(filename, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const request = store.put({ filename, data });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('setLocalFile error', err);
  }
}

// --- PENDING WRITES STORE ---
export async function addPendingWrite(filename, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const request = store.put({ filename, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('addPendingWrite error', err);
  }
}

export async function getPendingWrites() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readonly');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const request = store.getAll();
      request.onsuccess = (e) => resolve(e.target.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('getPendingWrites error', err);
    return [];
  }
}

export async function removePendingWrite(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_WRITES, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_WRITES);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('removePendingWrite error', err);
  }
}

// --- SYNC STATE STORE ---
export async function setSyncState(filename, syncState) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_STATE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_STATE);
      const request = store.put({ filename, ...syncState });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('setSyncState error', err);
  }
}

export async function getSyncState(filename) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_STATE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_STATE);
      const request = store.get(filename);
      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('getSyncState error', err);
    return null;
  }
}

// Legacy wrappers for modifiedTime
export async function setLastKnownModifiedTime(filename, modifiedTime) {
  const current = await getSyncState(filename) || {};
  await setSyncState(filename, { ...current, modifiedTime });
}

export async function getLastKnownModifiedTime(filename) {
  const state = await getSyncState(filename);
  return state ? state.modifiedTime : null;
}

// --- UTILITIES ---
export async function getLocalCacheSizeMB() {
  try {
    const db = await openDB();
    const stores = [STORE_FILES, STORE_PENDING_WRITES, STORE_SYNC_STATE];
    let totalBytes = 0;
    
    for (const storeName of stores) {
      const items = await new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = (e) => resolve(e.target.result || []);
      });
      totalBytes += new Blob([JSON.stringify(items)]).size;
    }
    return (totalBytes / (1024 * 1024)).toFixed(2);
  } catch (err) {
    console.error('Error calculating cache size', err);
    return '0.00';
  }
}

export async function clearLocalCache() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
