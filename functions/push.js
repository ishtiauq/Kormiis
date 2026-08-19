'use strict';

/**
 * Feature 8 — Firebase Cloud Messaging push notifications.
 *
 * Device tokens are stored per company in the `fcm_tokens` snapshot:
 *   { [uid]: [token, ...] }
 *
 * - registerDeviceToken / unregisterDeviceToken: called by any signed-in user
 *   from their own device so that user gets pushes on all their devices.
 * - sendPush: HR/admin only. Sends FCM messages to one or more employees
 *   (matched by Firebase uid) or broadcasts to the whole company.
 * - sendTestPush: sends a test message back to the caller's own devices.
 */

const {
  onCall,
  HttpsError,
  admin,
  getSnapshot,
  setSnapshot,
  getCompanyIdForUid,
  requireAdmin,
} = require('./common');

const MAX_TOKEN_ERRORS = 200;

async function getTokenMap(companyId) {
  const map = (await getSnapshot(companyId, 'fcm_tokens', {})) || {};
  return map; // { uid: [token, ...] }
}

async function saveTokenMap(companyId, map) {
  await setSnapshot(companyId, 'fcm_tokens', map);
}

async function resolveTokens(companyId, uids) {
  const map = await getTokenMap(companyId);
  const targets = Array.isArray(uids) && uids.length > 0 ? uids : Object.keys(map);
  const tokens = [];
  targets.forEach((uid) => {
    const list = Array.isArray(map[uid]) ? map[uid] : [];
    list.forEach((t) => tokens.push(t));
  });
  return tokens;
}

async function sendToTokens(tokens, { title, body, url, category, icon }) {
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0, invalidTokens: [] };
  const message = {
    tokens,
    notification: { title, body, icon: icon || '/Kormiis Monogram Logo 192.png' },
    data: {
      url: url || '/',
      category: category || 'system',
      title,
      body: body || '',
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    webpush: {
      notification: {
        title,
        body,
        icon: icon || '/Kormiis Monogram Logo 192.png',
      },
    },
  };
  const response = await admin.messaging().sendEachForMulticast(message);
  const results = response.responses || [];
  const invalidTokens = [];
  results.forEach((r, i) => {
    if (!r.success && r.error) {
      const code = r.error.code || '';
      if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(code)) {
        invalidTokens.push(tokens[i]);
      }
    }
  });
  return { successCount: response.successCount, failureCount: response.failureCount, invalidTokens };
}

exports.registerDeviceToken = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const companyId = await getCompanyIdForUid(uid);
  if (!companyId) throw new HttpsError('failed-precondition', 'Account is not linked to a company.');

  const token = String((request.data || {}).token || '').trim();
  if (!token) throw new HttpsError('invalid-argument', 'A device token is required.');

  const map = await getTokenMap(companyId);
  const list = (Array.isArray(map[uid]) ? map[uid] : []).filter((t) => t !== token);
  list.push(token);
  map[uid] = list.slice(-10); // cap devices per user
  await saveTokenMap(companyId, map);
  return { ok: true };
});

exports.unregisterDeviceToken = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const companyId = await getCompanyIdForUid(uid);
  if (!companyId) throw new HttpsError('failed-precondition', 'Account is not linked to a company.');

  const token = String((request.data || {}).token || '').trim();
  if (!token) return { ok: true };

  const map = await getTokenMap(companyId);
  if (Array.isArray(map[uid])) {
    map[uid] = map[uid].filter((t) => t !== token);
    if (map[uid].length === 0) delete map[uid];
    await saveTokenMap(companyId, map);
  }
  return { ok: true };
});

exports.sendPush = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);

  const data = request.data || {};
  const title = String(data.title || 'Kormiis').slice(0, 100);
  const body = String(data.body || 'You have a new notification').slice(0, 240);
  const url = String(data.url || '/').slice(0, 300);
  const category = String(data.category || 'system').slice(0, 30);

  const tokens = await resolveTokens(companyId, data.employeeIds);
  if (tokens.length === 0) {
    return { sent: 0, delivered: 0, failed: 0, message: 'No registered devices to notify.' };
  }

  const result = await sendToTokens(tokens, { title, body, url, category });

  // Prune tokens that are no longer valid.
  if (result.invalidTokens.length > 0 && result.invalidTokens.length < MAX_TOKEN_ERRORS) {
    const invalid = new Set(result.invalidTokens);
    const map = await getTokenMap(companyId);
    let changed = false;
    Object.keys(map).forEach((uid) => {
      const list = Array.isArray(map[uid]) ? map[uid] : [];
      const kept = list.filter((t) => !invalid.has(t));
      if (kept.length !== list.length) {
        map[uid] = kept;
        if (kept.length === 0) delete map[uid];
        changed = true;
      }
    });
    if (changed) await saveTokenMap(companyId, map);
  }

  return {
    sent: tokens.length,
    delivered: result.successCount,
    failed: result.failureCount,
  };
});

exports.sendTestPush = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const companyId = await getCompanyIdForUid(uid);
  if (!companyId) throw new HttpsError('failed-precondition', 'Account is not linked to a company.');

  const data = request.data || {};
  const tokens = await resolveTokens(companyId, [uid]);
  if (tokens.length === 0) {
    return { sent: 0, delivered: 0, failed: 0, message: 'No device registered for this account. Re-open Settings → Push Notifications.' };
  }
  const result = await sendToTokens(tokens, {
    title: 'Kormiis Test Alert',
    body: 'Firebase Cloud Messaging is working on this device.',
    url: '/',
    category: 'system',
  });
  return { sent: tokens.length, delivered: result.successCount, failed: result.failureCount };
});