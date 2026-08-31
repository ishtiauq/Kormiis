/**
 * Strict Google Drive Database Service
 * Uses a visible /HR-Pulse-DB/ folder in the user's Drive.
 */

import { setLastKnownModifiedTime, getLastKnownModifiedTime, getLocalFile, setLocalFile, addPendingWrite, getPendingWrites, removePendingWrite } from './db.js';

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_NAME = 'HR-Pulse-DB';

const MOCK_DRIVE_KEY = 'hr_pulse_mock_drive_files';

function isMockToken(token) {
  return !token || token.startsWith('mock-');
}

function getMockDrive() {
  const raw = localStorage.getItem(MOCK_DRIVE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse mock drive", e);
    }
  }
  
  const defaultDrive = {
    '_meta.json': {
      id: 'mock-file-_meta.json',
      name: '_meta.json',
      content: { schema_version: "1.0", last_sync: new Date().toISOString(), files: {} },
      modifiedTime: new Date().toISOString(),
      size: 150,
      parents: ['mock-folder-root-id']
    }
  };
  localStorage.setItem(MOCK_DRIVE_KEY, JSON.stringify(defaultDrive));
  return defaultDrive;
}

function saveMockDrive(drive) {
  localStorage.setItem(MOCK_DRIVE_KEY, JSON.stringify(drive));
}

export async function fetchUserProfile(token) {
  if (isMockToken(token)) {
    return {
      name: 'Ishtiauq Ahmed (Simulated)',
      email: 'ishtiauq@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    };
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return await res.json();
}

/**
 * Find or create the root database folder in Google Drive
 */
export async function getOrCreateDbFolder(token) {
  if (isMockToken(token)) {
    return 'mock-folder-root-id';
  }
  const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'appDataFolder' in parents and trashed=false`);
  const url = `${DRIVE_FILES_URL}?q=${query}&fields=files(id,name)`;
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to search for DB folder: ${res.statusText}`);
  const data = await res.json();
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder inside appDataFolder
  const metadata = {
    name: FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['appDataFolder']
  };
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  if (!createRes.ok) throw new Error(`Failed to create DB folder: ${createRes.statusText}`);
  const createData = await createRes.json();
  return createData.id;
}

/**
 * Search for a file inside a specific folder
 */
export async function findFileInFolder(filename, folderId, token) {
  if (isMockToken(token)) {
    const drive = getMockDrive();
    if (filename === '_backups') {
      return { id: 'mock-folder-_backups-id', name: '_backups', modifiedTime: new Date().toISOString() };
    }
    if (folderId === 'mock-folder-_backups-id') {
      const found = Object.values(drive).find(f => f.name === filename && f.parents?.includes(folderId));
      return found ? { id: found.id, name: found.name, modifiedTime: found.modifiedTime } : null;
    }
    const file = drive[filename];
    if (file) {
      return { id: file.id, name: file.name, modifiedTime: file.modifiedTime };
    }
    return null;
  }
  const query = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`);
  const url = `${DRIVE_FILES_URL}?q=${query}&fields=files(id,name,modifiedTime)`;
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to search file ${filename}: ${res.statusText}`);
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Read file contents as JSON
 */
export async function readFileContents(fileId, token) {
  if (isMockToken(token)) {
    const drive = getMockDrive();
    const file = Object.values(drive).find(f => f.id === fileId);
    if (file) {
      return file.content;
    }
    throw new Error(`Mock file ${fileId} not found`);
  }
  const url = `${DRIVE_FILES_URL}/${fileId}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to read file ${fileId}`);
  return await res.json();
}

/**
 * Create a new file in a specific folder
 */
export async function createFileInFolder(filename, folderId, content, token) {
  if (isMockToken(token)) {
    const drive = getMockDrive();
    const id = `mock-file-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newFile = {
      id,
      name: filename,
      content,
      modifiedTime: new Date().toISOString(),
      size: JSON.stringify(content).length,
      parents: [folderId]
    };
    if (folderId === 'mock-folder-_backups-id') {
      drive[id] = newFile;
    } else {
      drive[filename] = newFile;
    }
    saveMockDrive(drive);
    return { id, name: filename, modifiedTime: newFile.modifiedTime };
  }
  const metadata = {
    name: filename,
    parents: [folderId]
  };

  const boundary = 'hr_pulse_multipart_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(content) +
    closeDelimiter;

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: body
  });

  if (!res.ok) throw new Error(`Failed to create file ${filename}`);
  return await res.json();
}

/**
 * Update existing file contents
 */
export async function updateFileContents(fileId, content, token) {
  if (isMockToken(token)) {
    const drive = getMockDrive();
    const file = Object.values(drive).find(f => f.id === fileId);
    if (file) {
      file.content = content;
      file.modifiedTime = new Date().toISOString();
      file.size = JSON.stringify(content).length;
      saveMockDrive(drive);
      return { id: file.id, name: file.name, modifiedTime: file.modifiedTime };
    }
    throw new Error(`Mock file ${fileId} not found to update`);
  }
  const url = `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(content)
  });
  if (!res.ok) throw new Error(`Failed to update file ${fileId}`);
  return await res.json();
}

// --- Strict DB Methods ---

let cachedFolderId = null;

async function getFolderId(token) {
  if (!cachedFolderId) {
    cachedFolderId = await getOrCreateDbFolder(token);
  }
  return cachedFolderId;
}

export function computeChecksum(data) {
  return generateChecksum(JSON.stringify(data));
}

export async function readMeta(token) {
  const filename = '_meta.json';
  const localData = await getLocalFile(filename);

  if (navigator.onLine) {
    try {
      const folderId = await getFolderId(token);
      const file = await findFileInFolder(filename, folderId, token);
      if (file) {
        const remoteData = await readFileContents(file.id, token);
        await setLocalFile(filename, remoteData);
        return remoteData;
      }
    } catch (e) {
      console.warn("Failed to fetch meta remotely", e);
    }
  }

  return localData || null;
}

export async function writeMeta(metaObj, token) {
  const filename = '_meta.json';
  metaObj.last_sync = new Date().toISOString();
  await setLocalFile(filename, metaObj);
  
  if (navigator.onLine) {
    try {
      const folderId = await getFolderId(token);
      const file = await findFileInFolder(filename, folderId, token);
      if (file) {
        await updateFileContents(file.id, metaObj, token);
      } else {
        await createFileInFolder(filename, folderId, metaObj, token);
      }
    } catch (e) {
      console.warn("Failed to write meta remotely", e);
    }
  }
}

export async function readTable(tableName, token, onBackgroundSync) {
  const folderId = await getFolderId(token);
  const filename = `${tableName}.json`;
  
  // 1. Try local cache first
  const localData = await getLocalFile(filename);
  
  // 2. Background fetch
  const bgFetch = async () => {
    try {
      const file = await findFileInFolder(filename, folderId, token);
      if (!file) return;

      const remoteModified = new Date(file.modifiedTime).getTime();
      const localModified = await getLastKnownModifiedTime(filename);

      if (!localModified || remoteModified > localModified) {
        const remoteData = await readFileContents(file.id, token);
        await setLocalFile(filename, remoteData);
        await setLastKnownModifiedTime(filename, remoteModified);
        if (onBackgroundSync && JSON.stringify(localData) !== JSON.stringify(remoteData)) {
          onBackgroundSync(remoteData, tableName);
        }
      }
    } catch (err) {
      console.warn("Background fetch failed for", filename, err);
    }
  };
  
  // Trigger background fetch without awaiting if online
  if (navigator.onLine) {
    bgFetch();
  }

  // Return local data immediately, or wait for fetch if empty
  if (localData) {
    return localData;
  } else {
    const file = await findFileInFolder(filename, folderId, token);
    if (!file) return null;
    const remoteData = await readFileContents(file.id, token);
    await setLocalFile(filename, remoteData);
    await setLastKnownModifiedTime(filename, new Date(file.modifiedTime).getTime());
    return remoteData;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function acquireLock(folderId, token) {
  let attempts = 0;
  while (attempts < 5) {
    const metaFile = await findFileInFolder('_meta.json', folderId, token);
    if (!metaFile) return null; // No meta yet

    const metaObj = await readFileContents(metaFile.id, token);
    
    // Check if locked
    if (metaObj.sync_lock) {
      const lockAge = Date.now() - (metaObj.lock_time || 0);
      if (lockAge > 10000) {
        // Stale lock, force acquire
        metaObj.sync_lock = true;
        metaObj.lock_time = Date.now();
        await updateFileContents(metaFile.id, metaObj, token);
        return metaObj;
      }
      // Wait and retry
      await sleep(2000);
      attempts++;
    } else {
      metaObj.sync_lock = true;
      metaObj.lock_time = Date.now();
      await updateFileContents(metaFile.id, metaObj, token);
      return metaObj;
    }
  }
  throw new Error("Could not acquire DB sync lock");
}

async function releaseLock(folderId, metaObj, token) {
  const metaFile = await findFileInFolder('_meta.json', folderId, token);
  if (metaFile) {
    metaObj.sync_lock = false;
    await updateFileContents(metaFile.id, metaObj, token);
  }
}

function generateChecksum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

function resolveConflict(localData, remoteData, tableName, localModified) {
  let mergedData = localData;
  let conflicts = [];

  // If it's an array, we deep merge based on ID and updated_at
  if (Array.isArray(localData) && Array.isArray(remoteData)) {
    const localMap = new Map(localData.map(item => [item.id, item]));
    const remoteMap = new Map(remoteData.map(item => [item.id, item]));
    
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
    mergedData = [];

    for (let id of allIds) {
      const l = localMap.get(id);
      const r = remoteMap.get(id);

      if (l && r) {
        if (JSON.stringify(l) === JSON.stringify(r)) {
          mergedData.push(r); // Same, just keep remote
        } else {
          // Check if both were modified
          const lTime = new Date(l.updated_at || 0).getTime();
          const rTime = new Date(r.updated_at || 0).getTime();
          
          const localChanged = lTime > (localModified || 0);
          const remoteChanged = rTime > (localModified || 0);
          
          if (localChanged && remoteChanged) {
            // Conflict: both edited since last sync!
            // Auto-merge: local changes overwrite remote fields
            const merged = { ...r, ...l, _conflict: true };
            mergedData.push(merged);
            conflicts.push({ 
              file: tableName, 
              recordId: id, 
              localValue: l, 
              remoteValue: r, 
              resolution: 'Auto-Merged' 
            });
          } else if (remoteChanged) {
            // Only remote changed
            mergedData.push(r);
          } else {
            // Only local changed
            mergedData.push(l);
          }
        }
      } else if (r) {
        mergedData.push(r); // Only exists in remote
      } else if (l) {
        mergedData.push(l); // Only exists in local
      }
    }
  } else {
    // Last-write-wins for nested objects (e.g., settings)
    mergedData = remoteData;
    conflicts.push({ file: tableName, recordId: 'root', localValue: localData, remoteValue: remoteData, resolution: 'Overwritten with Remote' });
  }

  return { mergedData, conflicts };
}

export async function writeTable(tableName, data, fallbackMeta, token) {
  const folderId = await getFolderId(token);
  const filename = `${tableName}.json`;
  let conflictsFound = [];
  
  // 1. Write optimistically to local cache
  await setLocalFile(filename, data);

  if (!navigator.onLine) {
    // Queue offline
    await addPendingWrite(filename, data);
    return { updatedData: data, conflicts: [], offline: true };
  }
  
  let metaObj = null;
  try {
    metaObj = await acquireLock(folderId, token);
  } catch (e) {
    console.warn("Write lock failed, continuing unlocked", e);
    metaObj = fallbackMeta;
  }

  if (!metaObj) metaObj = fallbackMeta; // Fallback if still null

  const file = await findFileInFolder(filename, folderId, token);
  if (file) {
    const localModified = await getLastKnownModifiedTime(filename);
    const remoteModified = new Date(file.modifiedTime).getTime();

    // Conflict Check
    if (localModified && remoteModified > localModified) {
      console.warn(`Conflict detected for ${tableName}! Remote is newer.`);
      const remoteData = await readFileContents(file.id, token);
      const result = resolveConflict(data, remoteData, tableName, localModified);
      data = result.mergedData;
      conflictsFound = result.conflicts;
      
      // Update local cache with resolved data
      await setLocalFile(filename, data);
    }

    const updatedFile = await updateFileContents(file.id, data, token);
    await setLastKnownModifiedTime(filename, new Date(updatedFile.modifiedTime || Date.now()).getTime());
  } else {
    const newFile = await createFileInFolder(filename, folderId, data, token);
    await setLastKnownModifiedTime(filename, new Date(newFile.modifiedTime || Date.now()).getTime());
  }

  const dataString = JSON.stringify(data);
  const checksum = generateChecksum(dataString);
  const recordCount = Array.isArray(data) ? data.length : (data.list ? data.list.length : 0);

  if (!metaObj.files) metaObj.files = {};
  metaObj.files[filename] = {
    checksum,
    last_modified: new Date().toISOString(),
    record_count: recordCount
  };
  
  await releaseLock(folderId, metaObj, token);
  
  return { updatedData: data, conflicts: conflictsFound, offline: false };
}

export async function flushPendingWrites(token, metaObj, onConflictDetected, onSyncComplete) {
  if (!navigator.onLine) return;
  
  const pending = await getPendingWrites();
  if (pending.length === 0) return;
  
  console.log(`Flushing ${pending.length} pending writes...`);
  let syncedCount = 0;
  
  for (const item of pending) {
    const tableName = item.filename.replace('.json', '');
    try {
      const result = await writeTable(tableName, item.data, metaObj, token);
      if (result.conflicts && result.conflicts.length > 0 && onConflictDetected) {
        onConflictDetected(result.conflicts, result.updatedData, tableName);
      }
      await removePendingWrite(item.id);
      syncedCount++;
    } catch (err) {
      console.error(`Failed to flush pending write for ${item.filename}`, err);
      // Stop flushing if we hit an error so order is preserved
      break; 
    }
  }

  if (onSyncComplete && syncedCount > 0) {
    onSyncComplete(syncedCount);
  }
}

export async function createBackup(token, isAuto = false) {
  const folderId = await getFolderId(token);
  const backupsFolder = await getOrCreateFolder('_backups', folderId, token);
  
  const employees = await readTable('employees', token) || [];
  const payroll = await readTable('payroll', token) || {};
  const attendanceLogs = await readTable('attendance_logs', token) || {};
  const leaveRequests = await readTable('leave_requests', token) || [];
  const leaveBalances = await readTable('leave_balances', token) || {};
  const expenses = await readTable('expenses', token) || [];
  const settings = await readTable('settings', token) || {};
  
  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      type: isAuto ? 'auto' : 'manual',
      version: '1.1'
    },
    data: {
      employees,
      payroll,
      attendanceLogs,
      leaveRequests,
      leaveBalances,
      expenses,
      settings
    }
  };
  
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const filename = isAuto ? `auto_backup_${dateStr}.json` : `manual_backup_${dateStr}_${timeStr}.json`;
  
  await createFileInFolder(filename, backupsFolder.id, backupData, token);
  if (isAuto) {
    await pruneBackups(token, backupsFolder.id);
  }
}

export async function listBackups(token) {
  if (isMockToken(token)) {
    const drive = getMockDrive();
    return Object.values(drive)
      .filter(f => f.parents?.includes('mock-folder-_backups-id'))
      .map(f => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime, size: f.size }))
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
  }
  const folderId = await getFolderId(token);
  const backupsFolder = await findFileInFolder('_backups', folderId, token);
  if (!backupsFolder) return [];
  
  const url = `${DRIVE_FILES_URL}?q='${backupsFolder.id}'+in+parents+and+trashed=false&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return data.files || [];
}

export async function restoreBackup(token, fileId) {
  const data = await readFileContents(fileId, token);
  if (!data || !data.data) throw new Error("Invalid backup format");
  
  const metaObj = await readMeta(token) || { schema_version: "1.0", last_sync: new Date().toISOString(), files: {} };
  
  if (data.data.employees) await writeTable('employees', data.data.employees, metaObj, token);
  if (data.data.payroll) await writeTable('payroll', data.data.payroll, metaObj, token);
  
  // Legacy support for older backups
  if (data.data.attendance) {
    if (data.data.attendance.dailyLogs) await writeTable('attendance_logs', data.data.attendance.dailyLogs, metaObj, token);
    if (data.data.attendance.leaves) await writeTable('leave_requests', data.data.attendance.leaves, metaObj, token);
    if (data.data.attendance.balances) await writeTable('leave_balances', data.data.attendance.balances, metaObj, token);
  } else {
    if (data.data.attendanceLogs) await writeTable('attendance_logs', data.data.attendanceLogs, metaObj, token);
    if (data.data.leaveRequests) await writeTable('leave_requests', data.data.leaveRequests, metaObj, token);
    if (data.data.leaveBalances) await writeTable('leave_balances', data.data.leaveBalances, metaObj, token);
  }
  
  if (data.data.expenses) await writeTable('expenses', data.data.expenses, metaObj, token);
  if (data.data.settings) await writeTable('settings', data.data.settings, metaObj, token);
  
  await writeMeta(metaObj, token);
  return data.data;
}

async function getOrCreateFolder(folderName, parentId, token) {
  const existing = await findFileInFolder(folderName, parentId, token);
  if (existing) return existing;
  
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };
  const res = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });
  return await res.json();
}

async function pruneBackups(token, backupsFolderId) {
  if (isMockToken(token)) {
    const drive = getMockDrive();
    const backupFiles = Object.values(drive)
      .filter(f => f.parents?.includes(backupsFolderId) && f.name.includes('auto_backup_'))
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
    
    if (backupFiles.length > 11) {
      const toDelete = backupFiles.slice(11);
      for (const f of toDelete) {
        delete drive[f.id];
      }
      saveMockDrive(drive);
    }
    return;
  }
  const url = `${DRIVE_FILES_URL}?q='${backupsFolderId}'+in+parents+and+trashed=false+and+name+contains+'auto_backup_'&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const files = data.files || [];
  
  if (files.length > 11) {
    const toDelete = files.slice(11);
    for (const f of toDelete) {
      await fetch(`${DRIVE_FILES_URL}/${f.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
  }
}

export async function checkAndRunAutoBackup(token) {
  if (!navigator.onLine) return;
  const lastBackupStr = localStorage.getItem('last_auto_backup');
  const now = Date.now();
  if (!lastBackupStr || (now - parseInt(lastBackupStr)) > 24 * 60 * 60 * 1000) {
    console.log("Running automated 24h backup...");
    try {
      await createBackup(token, true);
      localStorage.setItem('last_auto_backup', now.toString());
    } catch(e) {
      console.warn("Auto backup failed", e);
    }
  }
}

/**
 * Fallback backward compatibility export so existing code doesn't crash 
 * before we update App.jsx completely
 */
// DEPRECATED - Will be removed in next cleanup
export async function loadOrInitializeDatabase() {
  console.warn("loadOrInitializeDatabase is deprecated, use the new strict boot sequence");
  return { data: null, fileId: null };
}
export async function updateAppDataFile() {
  console.warn("updateAppDataFile is deprecated, use writeTable");
}
