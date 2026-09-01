'use strict';

/**
 * DEPRECATED — LEGACY WhatsApp Cloud Function (Meta Cloud API).
 *
 * This module is NO LONGER exported from index.js and is NOT deployed.
 * The app now uses the Blaze-free "1-Click wa.me" Tier 1 mode:
 *   - src/services/whatsappService.js  (queue + wa.me links + wa_log snapshot)
 *   - src/components/WhatsAppQueueModal.jsx (delivery wizard)
 * No Cloud Functions, no Meta tokens, no Blaze plan required.
 *
 * Kept only for reference / potential future Vercel-based Tier 2.
 */

const crypto = require('crypto');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const {
  db,
  getSnapshot,
  setSnapshot,
  updateSnapshot,
  requireAdmin,
  iso,
} = require('./common');

// Meta Graph API version. If Meta deprecates this version, bump it to a newer
// one (e.g. v22.0) — current versions keep working for ~2 years.
const GRAPH_VERSION = 'v21.0';

// 24 hours = the length of a Meta "customer service window" opened by an
// inbound (user-initiated) message. Messages sent inside this window are free.
const FREE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Shared webhook verify token. All companies point their Meta webhook at the
// single waWebhook URL and use this exact token (shown in Settings). Override
// via environment variable WA_WEBHOOK_VERIFY_TOKEN if desired.
const GLOBAL_VERIFY_TOKEN = process.env.WA_WEBHOOK_VERIFY_TOKEN || 'kormiis-wa-webhook-2025';
// Optional global app secret for X-Hub-Signature-256 verification. Prefer the
// per-company App Secret stored in each company's secrets doc.
const GLOBAL_APP_SECRET = process.env.WA_APP_SECRET || '';

// Map a client event name to the settings.whatsapp toggle that gates it.
const EVENT_TOGGLE = {
  leave: 'notifyLeaves',
  payroll: 'notifyPayroll',
  announcement: 'notifyAnnouncements',
  shift_swap: 'notifyShiftSwap',
  overtime: 'notifyOvertime',
  task: 'notifyTask',
  attendance: 'notifyAttendance',
};

// --- Helpers ---------------------------------------------------------------

function normalizePhone(phone, defaultCountryCode = '880') {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return defaultCountryCode + cleaned.substring(1);
  }
  return cleaned;
}

async function getSecret(companyId) {
  const snap = await db().doc(`companies/${companyId}/secrets/whatsapp`).get();
  return snap.exists ? snap.data() : null;
}

async function setSecret(companyId, payload) {
  await db().doc(`companies/${companyId}/secrets/whatsapp`).set(payload, { merge: true });
}

async function setStatus(companyId, msgId, status, error, messageId) {
  const patch = { status, attemptedAt: new Date().toISOString() };
  if (error) patch.lastError = String(error).slice(0, 400);
  if (status === 'sent') {
    patch.sentAt = new Date().toISOString();
    patch.messageId = messageId || null;
    patch.lastError = null;
  }
  await db().doc(`companies/${companyId}/wa_outbox/${msgId}`).update(patch).catch(() => {});
}

async function graphSendText({ accessToken, phoneNumberId, to, body }) {
  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, errorCode: res.ok ? null : data?.error?.code || null };
  } catch (e) {
    return { ok: false, data: {}, errorCode: null, fetchError: e.message };
  }
}

async function graphGetPhoneInfo({ accessToken, phoneNumberId }) {
  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `Meta returned HTTP ${res.status}` };
    }
    return {
      ok: true,
      displayPhone: data.display_phone_number || '',
      verifiedName: data.verified_name || '',
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function verifySignature(header, rawBody, secret) {
  if (!header || !secret || !rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

/**
 * Core send decision for one outbox message. Returns the final status string.
 * `ctx` lets the webhook flush re-use already-fetched secrets/settings/optins.
 */
async function attemptSend({ companyId, msgId, data, secrets, settings, optins }) {
  if (!secrets || !secrets.accessToken || !secrets.phoneNumberId) {
    await setStatus(companyId, msgId, 'not_configured', 'WhatsApp is not connected yet. Add Meta credentials in Settings.');
    return 'not_configured';
  }

  const toggleKey = EVENT_TOGGLE[data.event];
  if (toggleKey && !(settings?.whatsapp && settings.whatsapp[toggleKey])) {
    await setStatus(companyId, msgId, 'disabled', `"${data.event}" WhatsApp notifications are turned off in Settings.`);
    return 'disabled';
  }

  if (data.requiresAdmin && !['Admin', 'HR'].includes(data.createdByRole)) {
    await setStatus(companyId, msgId, 'not_allowed', 'Only HR/Admin can trigger this WhatsApp event.');
    return 'not_allowed';
  }

  const opt = optins ? optins[data.phone] : null;
  if (!opt || !opt.optedIn) {
    await setStatus(companyId, msgId, 'not_opted_in', 'Employee has not opted in yet. Ask them to send any message to your WhatsApp Business number (one-time).');
    return 'not_opted_in';
  }

  const last = opt.lastUserMessageAt ? new Date(opt.lastUserMessageAt).getTime() : 0;
  const windowOpen = Date.now() - last < FREE_WINDOW_MS;
  if (!windowOpen) {
    await setStatus(companyId, msgId, 'queued_no_window', 'Free 24h WhatsApp window is closed. Will auto-send as soon as this employee messages your WhatsApp number again.');
    return 'queued_no_window';
  }

  const result = await graphSendText({
    accessToken: secrets.accessToken,
    phoneNumberId: secrets.phoneNumberId,
    to: data.phone,
    body: data.message,
  });

  if (result.ok) {
    const id = result.data?.messages && result.data.messages[0]?.id;
    await setStatus(companyId, msgId, 'sent', null, id);
    return 'sent';
  }

  // 131047 / 131026 = outside the free customer-service window (or number not
  // reachable). Treat as parked, not a hard failure.
  if (result.errorCode === 131047 || result.errorCode === 131026) {
    await setStatus(companyId, msgId, 'queued_no_window', result.data?.error?.message || 'No open 24h window for this number.');
    return 'queued_no_window';
  }

  await setStatus(companyId, msgId, 'failed', result.data?.error?.message || result.fetchError || 'Meta send failed.');
  return 'failed';
}

// --- Firestore trigger: send parked/pending outbox messages ----------------

exports.onWaOutboxCreated = onDocumentCreated('companies/{companyId}/wa_outbox/{msgId}', async (event) => {
  const { companyId, msgId } = event.params;
  const data = event.data.data();
  const secrets = await getSecret(companyId);
  const settings = (await getSnapshot(companyId, 'settings', {})) || {};
  const optins = (await getSnapshot(companyId, 'wa_optins', {})) || {};
  await attemptSend({ companyId, msgId, data, secrets, settings, optins });
});

// --- Webhook (inbound messages from employees) -----------------------------

exports.waWebhook = onRequest(async (req, res) => {
  // GET = Meta verification handshake.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === GLOBAL_VERIFY_TOKEN && challenge) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Webhook verification failed.');
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed.');
    return;
  }

  const payload = req.body || {};
  const sigHeader = String(req.headers['x-hub-signature-256'] || '');
  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : '';

  let routed = false;
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = String(value?.metadata?.phone_number_id || '');
      if (!phoneNumberId) continue;

      const routingSnap = await db().doc(`wa_routing/${phoneNumberId}`).get();
      if (!routingSnap.exists) continue;
      const companyId = routingSnap.data().companyId;

      const secret = await getSecret(companyId);
      if (secret?.appSecret) {
        if (!verifySignature(sigHeader, rawBody, secret.appSecret)) {
          res.status(401).send('Invalid signature.');
          return;
        }
      } else if (GLOBAL_APP_SECRET) {
        if (!verifySignature(sigHeader, rawBody, GLOBAL_APP_SECRET)) {
          res.status(401).send('Invalid signature.');
          return;
        }
      }

      routed = true;
      await handleInbound(companyId, value);
    }
  }

  if (!routed) {
    console.warn('[waWebhook] Inbound payload did not match any connected company.', JSON.stringify(payload).slice(0, 400));
  }
  res.status(200).send('EVENT_RECEIVED');
});

async function handleInbound(companyId, value) {
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const froms = new Set();
  for (const m of messages) {
    const from = normalizePhone(m?.from);
    if (from) froms.add(from);
  }
  if (froms.size === 0) return;

  // Record opt-in + refresh the 24h free window.
  await updateSnapshot(
    companyId,
    'wa_optins',
    async (current) => {
      const next = { ...(current || {}) };
      const nowIso = new Date().toISOString();
      for (const from of froms) {
        next[from] = {
          optedIn: true,
          lastUserMessageAt: nowIso,
          firstOptInAt: next[from]?.firstOptInAt || nowIso,
        };
      }
      return next;
    },
    {}
  );

  await updateSnapshot(
    companyId,
    'wa_status',
    async (current) => ({
      ...(current || {}),
      lastWebhookAt: new Date().toISOString(),
      lastInboundFrom: [...froms][0],
    }),
    {}
  );

  // Flush parked messages for these numbers — the window just opened (free).
  const secrets = await getSecret(companyId);
  if (!secrets?.accessToken) return;
  const settings = (await getSnapshot(companyId, 'settings', {})) || {};
  const optins = (await getSnapshot(companyId, 'wa_optins', {})) || {};

  for (const from of froms) {
    const snap = await db()
      .collection(`companies/${companyId}/wa_outbox`)
      .where('phone', '==', from)
      .limit(25)
      .get();
    const parked = snap.docs.filter((d) => ['queued_no_window', 'not_opted_in'].includes(d.data().status));
    for (const d of parked) {
      await attemptSend({ companyId, msgId: d.id, data: d.data(), secrets, settings, optins });
    }
  }
}

// --- Callable functions ----------------------------------------------------

exports.getWhatsAppSetupInfo = onCall(async (request) => {
  await requireAdmin(request);
  const region = 'asia-south1';
  const projectId = process.env.GCLOUD_PROJECT || '';
  const webhookUrl = `https://${region}-${projectId}.cloudfunctions.net/waWebhook`;
  return {
    webhookUrl,
    verifyToken: GLOBAL_VERIFY_TOKEN,
    graphVersion: GRAPH_VERSION,
    freeWindowHours: FREE_WINDOW_MS / 3600000,
  };
});

exports.saveWhatsAppConfig = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const data = request.data || {};
  const phoneNumberId = String(data.phoneNumberId || '').trim();
  const wabaId = String(data.wabaId || '').trim();
  const accessToken = String(data.accessToken || '').trim();
  const appSecret = String(data.appSecret || '').trim();

  if (!phoneNumberId || !accessToken) {
    throw new HttpsError('invalid-argument', 'Phone Number ID and Access Token are required.');
  }

  const info = await graphGetPhoneInfo({ accessToken, phoneNumberId });
  if (!info.ok) {
    throw new HttpsError('failed-precondition', `Meta verification failed: ${info.error}`);
  }

  const nowIso = iso(new Date());
  await setSecret(companyId, {
    accessToken,
    phoneNumberId,
    wabaId,
    appSecret,
    businessPhone: normalizePhone(info.displayPhone),
    displayPhone: info.displayPhone,
    verifiedName: info.verifiedName,
    enabled: true,
    updatedAt: nowIso,
  });

  await db().doc(`wa_routing/${phoneNumberId}`).set({ companyId }, { merge: true });

  await setSnapshot(companyId, 'wa_status', {
    connected: true,
    connectedAt: nowIso,
    lastVerifiedAt: nowIso,
    displayPhone: info.displayPhone,
    verifiedName: info.verifiedName,
    businessPhone: normalizePhone(info.displayPhone),
    enabled: true,
  });

  return {
    ok: true,
    displayPhone: info.displayPhone,
    verifiedName: info.verifiedName,
    webhookUrl: `https://asia-south1-${process.env.GCLOUD_PROJECT || ''}.cloudfunctions.net/waWebhook`,
    verifyToken: GLOBAL_VERIFY_TOKEN,
  };
});

exports.verifyWhatsAppConfig = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const secret = await getSecret(companyId);
  if (!secret?.accessToken) {
    throw new HttpsError('failed-precondition', 'WhatsApp is not connected yet.');
  }
  const info = await graphGetPhoneInfo({
    accessToken: secret.accessToken,
    phoneNumberId: secret.phoneNumberId,
  });
  if (!info.ok) {
    throw new HttpsError('failed-precondition', `Meta verification failed: ${info.error}`);
  }
  const nowIso = iso(new Date());
  await setSnapshot(companyId, 'wa_status', {
    ...(secret && { displayPhone: secret.displayPhone }),
    connected: true,
    lastVerifiedAt: nowIso,
    displayPhone: info.displayPhone,
    verifiedName: info.verifiedName,
    enabled: true,
  });
  return { ok: true, displayPhone: info.displayPhone, verifiedName: info.verifiedName };
});

exports.disconnectWhatsApp = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const secret = await getSecret(companyId);
  if (secret?.phoneNumberId) {
    await db().doc(`wa_routing/${secret.phoneNumberId}`).delete().catch(() => {});
  }
  await db().doc(`companies/${companyId}/secrets/whatsapp`).delete().catch(() => {});
  await setSnapshot(companyId, 'wa_status', { connected: false, disconnectedAt: iso(new Date()) });
  return { ok: true };
});

exports.testWhatsApp = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const data = request.data || {};
  const phone = normalizePhone(data.phone);
  if (!phone) throw new HttpsError('invalid-argument', 'A test phone number is required.');

  const secret = await getSecret(companyId);
  if (!secret?.accessToken) {
    throw new HttpsError('failed-precondition', 'WhatsApp is not connected yet. Save your Meta credentials first.');
  }

  const body = `*✅ Kormiis WhatsApp Connected!*\n\nHello *${data.adminName || 'Admin'}*,\nYour WhatsApp notification system is verified and active.\n\nLeave updates, payroll slips, announcements, shift swaps, overtime approvals and task assignments will now reach your team on WhatsApp — free within each 24h window.\n\n_Automated notification from your HR platform._`;

  const result = await graphSendText({
    accessToken: secret.accessToken,
    phoneNumberId: secret.phoneNumberId,
    to: phone,
    body,
  });

  if (result.ok) {
    return { ok: true, messageId: result.data?.messages && result.data.messages[0]?.id };
  }
  if (result.errorCode === 131047 || result.errorCode === 131026) {
    return {
      ok: false,
      windowClosed: true,
      error: 'Your 24-hour free window is not open for this number. Send any message from that phone to your WhatsApp Business number once, then retry.',
    };
  }
  return { ok: false, error: result.data?.error?.message || result.fetchError || 'Meta send failed.' };
});

exports.getWhatsAppLog = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const snap = await db()
    .collection(`companies/${companyId}/wa_outbox`)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const optins = (await getSnapshot(companyId, 'wa_optins', {})) || {};
  const counts = {};
  list.forEach((m) => {
    counts[m.status] = (counts[m.status] || 0) + 1;
  });

  return {
    list,
    stats: {
      optInCount: Object.keys(optins).length,
      recent: counts,
    },
    status: (await getSnapshot(companyId, 'wa_status', {})) || null,
  };
});