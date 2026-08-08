import { db, doc, getDoc, setDoc } from './firebase.js';
import { getAuth } from 'firebase/auth';

// --- Common Helpers ---

const timestamp = () => new Date();

const TZ_OFFSET_MIN = 6 * 60; // Bangladesh UTC+6

function pad2(n) { return String(n).padStart(2, '0'); }

function banglaNow() {
  const d = new Date(Date.now() + TZ_OFFSET_MIN * 60 * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function monthKeyOf(y, m) { return `${y}-${pad2(m)}`; }

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return monthKeyOf(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function lastMonthKey() {
  const n = banglaNow();
  return addMonths(monthKeyOf(n.year, n.month), -1);
}

function prevMonthKey(ym) { return addMonths(ym, -1); }

function monthRangeUtc(ym) {
  const [y, m] = ym.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - TZ_OFFSET_MIN * 60 * 1000);
  const end = new Date(Date.UTC(y, m, 1) - TZ_OFFSET_MIN * 60 * 1000);
  return { start, end };
}

function dateStrOf(t) {
  const d = new Date(t.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function datesInMonth(ym) {
  const { start, end } = monthRangeUtc(ym);
  const out = [];
  for (let t = start; t < end; t = new Date(t.getTime() + 86400000)) {
    out.push(dateStrOf(t));
  }
  return out;
}

function recentDatesWindow(days) {
  const n = banglaNow();
  const todayMidnight = new Date(Date.UTC(n.year, n.month - 1, n.day) - TZ_OFFSET_MIN * 60 * 1000);
  const out = [];
  for (let i = days - 1; i >= 1; i--) {
    out.push(dateStrOf(new Date(todayMidnight.getTime() - i * 86400000)));
  }
  return out;
}

function dowOfDate(dateStr) { return new Date(`${dateStr}T00:00:00Z`).getUTCDay(); }

function parseTimeToMinutes(v) {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (v > 100000) { const d = new Date(v); return d.getHours() * 60 + d.getMinutes(); }
    return v;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s === '--' || s === '-' || s.toLowerCase() === 'n/a') return null;
    const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])?$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ap = m[3] && m[3].toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    }
    const t = Date.parse(s);
    if (!isNaN(t)) { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); }
  }
  return null;
}

async function getSnapshot(companyId, table, fallback = null) {
  const snap = await getDoc(doc(db, `companies/${companyId}/snapshots/${table}`));
  if (snap.exists() && snap.data().data !== undefined) return snap.data().data;
  return fallback;
}

async function setSnapshot(companyId, table, data) {
  await setDoc(doc(db, `companies/${companyId}/snapshots/${table}`), { data, lastUpdated: timestamp() }, { merge: true });
}

async function updateSnapshot(companyId, table, updater, fallback = null) {
  const current = await getSnapshot(companyId, table, fallback);
  const next = await updater(current);
  await setSnapshot(companyId, table, next);
  return next;
}

const userCache = new Map();
async function getUser(uid) {
  if (!uid) return null;
  if (userCache.has(uid)) return userCache.get(uid);
  try {
    const snap = await getDoc(doc(db, `users/${uid}`));
    const data = snap.exists() ? snap.data() : null;
    if (data) userCache.set(uid, data);
    return data;
  } catch(e) {
    return null;
  }
}

async function getCompanyIdForUid(uid) {
  const u = await getUser(uid);
  if (!u) return null;
  return u.companyUid || uid; // Workspace owner's companyId is their uid
}

async function isAdmin(uid) {
  const userJson = localStorage.getItem('kormiis_user');
  let localRole = null;
  let localIsWorkspaceOwner = false;
  if (userJson) {
    try {
      const uObj = JSON.parse(userJson);
      localRole = uObj.role;
      localIsWorkspaceOwner = !!uObj.isWorkspaceOwner;
    } catch(e){}
  }

  const u = await getUser(uid);
  if (!u) {
    // Fallback to local storage role if Firestore doc is missing
    return localIsWorkspaceOwner || ['Admin', 'HR'].includes(localRole);
  }
  
  if (!u.companyUid || u.companyUid === uid) return true;
  return ['Admin', 'HR'].includes(u.role) || localIsWorkspaceOwner || ['Admin', 'HR'].includes(localRole);
}

function assertAuth(context) {
  if (!context || !context.auth || !context.auth.uid) throw new Error('unauthenticated: You must be signed in.');
  return context.auth.uid;
}

async function requireAdmin(context) {
  const uid = assertAuth(context);
  const companyId = await getCompanyIdForUid(uid);
  if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
  if (!(await isAdmin(uid))) throw new Error('permission-denied: Admin/HR access required.');
  const user = await getUser(uid);
  return { uid, companyId, user };
}

function notifyHR(companyId, title, message, ref = null) {
  return updateSnapshot(companyId, 'hr_alerts', async (current) => {
    const list = Array.isArray(current) ? current : [];
    const entry = { id: `hr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, title, message, ref, read: false, createdAt: new Date().toISOString() };
    return [entry, ...list].slice(0, 200);
  }, []);
}

function iso(ts) {
  if (!ts) return null;
  if (typeof ts === 'object' && typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts === 'object' && ts.seconds != null) return new Date(ts.seconds * 1000).toISOString();
  return new Date(ts).toISOString();
}

// Mock onCall to replicate firebase functions behaviour locally
const onCall = (handler) => {
  return async (data) => {
    let uid = null;
    try {
      const userJson = localStorage.getItem('kormiis_user');
      if (userJson) {
        const uObj = JSON.parse(userJson);
        uid = uObj.uid || uObj.id;
      }
    } catch(e) {}
    
    if (!uid) {
      const auth = getAuth();
      uid = auth.currentUser?.uid;
    }
    
    if (!uid) throw new Error('unauthenticated: You must be signed in.');
    return handler({ data, auth: { uid } });
  }
}

// --- Burnout Logic ---

const EXPECTED_START_MIN = 9 * 60;
const RISK_THRESHOLD = 50;

function isActiveEmployee(emp) {
  const s = String(emp.status || 'Active').toLowerCase();
  return s !== 'inactive' && s !== 'terminated';
}

function computeRisk(emp, leaves, logs, loginActivity, ym) {
  const empLeaves = leaves.filter((l) => l.employeeId === emp.id && l.status === 'Approved' && l.startDate);
  const monthRange = datesInMonth(ym);
  const mondayFridaySickCount = empLeaves.filter((l) => {
    const type = String(l.leaveType || '').toLowerCase();
    if (!type.includes('sick')) return false;
    if (!monthRange.includes(l.startDate)) return false;
    const dow = dowOfDate(l.startDate);
    return dow === 1 || dow === 5;
  }).length;

  const windowDates = recentDatesWindow(28);
  let lateTotal = 0; let lateDays = 0;
  for (const d of windowDates) {
    const log = logs[d] && logs[d][emp.id];
    if (!log) continue;
    const checkIn = parseTimeToMinutes(log.checkIn);
    if (checkIn == null) continue;
    lateDays += 1;
    if (checkIn > EXPECTED_START_MIN) lateTotal += checkIn - EXPECTED_START_MIN;
  }
  const averageLateMinutes = lateDays > 0 ? Math.round((lateTotal / lateDays) * 10) / 10 : 0;

  const coveredByLeave = (dateStr) => empLeaves.some((l) => {
    const s = new Date(`${l.startDate}T00:00:00Z`).getTime();
    const e = l.endDate ? new Date(`${l.endDate}T00:00:00Z`).getTime() : s;
    const t = new Date(`${dateStr}T00:00:00Z`).getTime();
    return t >= s && t <= e;
  });
  let unauthorizedAbsenceCount = 0;
  for (const d of monthRange) {
    const log = logs[d] && logs[d][emp.id];
    if (log && String(log.status || '').toLowerCase() === 'absent' && !coveredByLeave(d)) {
      unauthorizedAbsenceCount += 1;
    }
  }

  let loginDropFlag = false;
  if (emp.uid && loginActivity) {
    const cur = (loginActivity[ym] || {})[emp.uid] || 0;
    const prev = (loginActivity[prevMonthKey(ym)] || {})[emp.uid] || 0;
    loginDropFlag = prev > 0 && cur < prev * 0.5;
  }

  const riskScore = Math.min(100, Math.round(mondayFridaySickCount * 15 + averageLateMinutes * 2 + unauthorizedAbsenceCount * 20 + (loginDropFlag ? 30 : 0)));
  return { mondayFridaySickCount, averageLateMinutes, unauthorizedAbsenceCount, loginDropFlag, riskScore };
}

async function runBurnoutAnalysis(companyId, ym) {
  const employees = (await getSnapshot(companyId, 'employees', [])) || [];
  const leaves = (await getSnapshot(companyId, 'leave_requests', [])) || [];
  const logs = (await getSnapshot(companyId, 'attendance_logs', {})) || {};
  const loginActivity = (await getSnapshot(companyId, 'login_activity', {})) || {};

  const active = employees.filter(isActiveEmployee);
  let existing = (await getSnapshot(companyId, 'burnout_risks', [])) || [];
  existing = existing.filter((r) => r.yearMonth !== ym);

  const newRisks = active.map((emp) => {
    const r = computeRisk(emp, leaves, logs, loginActivity, ym);
    return {
      id: `${emp.id}-${ym}`, employeeId: emp.id, yearMonth: ym,
      mondayFridaySickCount: r.mondayFridaySickCount, averageLateMinutes: r.averageLateMinutes,
      unauthorizedAbsenceCount: r.unauthorizedAbsenceCount, loginDropFlag: r.loginDropFlag,
      riskScore: r.riskScore, alertSent: false, createdAt: timestamp(),
    };
  });

  for (const entry of newRisks) {
    if (entry.riskScore > RISK_THRESHOLD) {
      const emp = active.find((e) => e.id === entry.employeeId);
      await notifyHR(companyId, 'Well-being Alert', `${emp ? emp.name : entry.employeeId} scored ${entry.riskScore}/100 on the well-being risk index for ${ym}. Review workload and schedule a check-in.`, { table: 'burnout_risks', id: entry.id });
    }
  }

  await setSnapshot(companyId, 'burnout_risks', [...existing, ...newRisks]);
  return newRisks;
}

export const burnoutApiLocal = {
  getBurnoutRisks: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const ym = request.data && request.data.month ? request.data.month : lastMonthKey();
    const threshold = request.data && typeof request.data.threshold === 'number' ? request.data.threshold : RISK_THRESHOLD;

    const risks = (await getSnapshot(companyId, 'burnout_risks', [])) || [];
    const employees = (await getSnapshot(companyId, 'employees', [])) || [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const flagged = risks
      .filter((r) => r.yearMonth === ym && r.riskScore > threshold)
      .sort((a, b) => b.riskScore - a.riskScore)
      .map((r) => ({
        id: r.id, employeeId: r.employeeId, employeeName: (empMap.get(r.employeeId) || {}).name || r.employeeId, department: (empMap.get(r.employeeId) || {}).department || '',
        mondayFridaySickCount: r.mondayFridaySickCount || 0, averageLateMinutes: r.averageLateMinutes || 0, unauthorizedAbsenceCount: r.unauthorizedAbsenceCount || 0, loginDropFlag: !!r.loginDropFlag,
        riskScore: r.riskScore, alertSent: !!r.alertSent, createdAt: iso(r.createdAt),
      }));

    return { month: ym, threshold, highRiskCount: flagged.length, risks: flagged };
  }),
  acknowledgeRiskAlert: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const docId = request.data && request.data.docId;
    if (!docId) throw new Error('invalid-argument: Missing docId.');

    await updateSnapshot(companyId, 'burnout_risks', async (current) => {
      const list = Array.isArray(current) ? current : [];
      return list.map((r) => (r.id === docId ? { ...r, alertSent: true } : r));
    }, []);
    return { ok: true };
  }),
  runNow: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const ym = (request.data && request.data.month) || lastMonthKey();
    const risks = await runBurnoutAnalysis(companyId, ym);
    return { month: ym, analyzed: risks.length };
  })
};

// --- Gigs Logic ---

function normalizeSkill(s) { return String(s || '').trim().toLowerCase(); }

async function getSkillsForCompany(companyId) { return (await getSnapshot(companyId, 'employee_skills', {})) || {}; }

async function pushNotification(companyId, employeeId, message, ref) {
  await updateSnapshot(companyId, 'notifications', async (current) => {
    const list = Array.isArray(current) ? current : [];
    return [{ id: `n-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, employeeId, message, ref, read: false, createdAt: new Date().toISOString() }, ...list].slice(0, 100);
  }, []);
}

function formatCleanName(rawName, rawEmail, fallback = 'Colleague') {
  if (rawName && typeof rawName === 'string' && rawName.trim() && !rawName.includes('@')) {
    return rawName.trim();
  }
  try {
    const local = localStorage.getItem('kormiis_user');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.name && !parsed.name.includes('@')) return parsed.name;
      if (parsed.displayName && !parsed.displayName.includes('@')) return parsed.displayName;
    }
  } catch(e) {}

  const str = String(rawName || rawEmail || '').trim();
  if (str.includes('@')) {
    const handle = str.split('@')[0];
    return handle.charAt(0).toUpperCase() + handle.slice(1);
  }
  return str || fallback;
}

export const gigApiLocal = {
  createGig: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');

    const data = request.data || {};
    const title = String(data.title || '').trim();
    if (!title) throw new Error('invalid-argument: Title is required.');
    const description = String(data.description || '').trim();
    
    // Default destroying time: 24 hours if not provided
    const expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const poster = await getUser(uid);
    const posterEmployeeId = (poster && poster.employeeId) || uid;
    const posterName = formatCleanName(poster?.name, poster?.email, 'Colleague');
    const posterAvatar = (poster && poster.avatar) || `https://i.pravatar.cc/150?u=${posterEmployeeId}`;

    const gig = {
      id: `gig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title, description, postedBy: posterEmployeeId, postedByUid: uid,
      postedByName: posterName, posterAvatar,
      expiresAt,
      status: 'open', helper: null, offers: [], createdAt: timestamp(), completedAt: null,
    };

    await updateSnapshot(companyId, 'gigs', async (current) => { const list = Array.isArray(current) ? current : []; return [gig, ...list]; }, []);
    return { gig };
  }),
  updateGig: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');

    const { gigId, title, description, expiresAt } = request.data || {};
    if (!gigId) throw new Error('invalid-argument: Missing gigId.');
    if (!title || !String(title).trim()) throw new Error('invalid-argument: Title is required.');

    const isHr = await requireAdmin(request).then(() => true).catch(() => false);
    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new Error('not-found: Gig not found.');
    if (!isHr && gig.postedBy !== myEmployeeId) throw new Error('permission-denied: Only poster or admin can edit.');

    const updated = gigs.map((g) => g.id === gigId ? {
      ...g,
      title: String(title).trim(),
      description: String(description || '').trim(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : g.expiresAt,
    } : g);

    await setSnapshot(companyId, 'gigs', updated);
    return { ok: true };
  }),
  deleteGig: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');

    const gigId = request.data && request.data.gigId;
    if (!gigId) throw new Error('invalid-argument: Missing gigId.');

    const isHr = await requireAdmin(request).then(() => true).catch(() => false);
    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new Error('not-found: Gig not found.');
    if (!isHr && gig.postedBy !== myEmployeeId) throw new Error('permission-denied: Only poster or admin can delete.');

    await setSnapshot(companyId, 'gigs', gigs.filter((g) => g.id !== gigId));
    return { ok: true };
  }),
  getOpenGigs: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');

    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    let gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const employees = (await getSnapshot(companyId, 'employees', [])) || [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const now = new Date();
    // Filter out unaccepted expired gigs (Auto-delete)
    gigs = gigs.filter((g) => {
      if (g.status === 'open' && g.expiresAt && new Date(g.expiresAt) <= now) {
        return false; // Auto-deleted on expiry if not accepted
      }
      return true;
    });

    const decorate = (g) => {
      const offers = (Array.isArray(g.offers) ? g.offers : []).map((o) => {
        const oEmp = empMap.get(o.id);
        return {
          ...o,
          name: formatCleanName(oEmp?.name || o.name, oEmp?.email, 'Colleague'),
          avatar: oEmp?.avatar || o.avatar || `https://i.pravatar.cc/150?u=${o.id}`,
        };
      });
      const hasOffered = offers.some((o) => o.id === myEmployeeId);
      const emp = empMap.get(g.postedBy) || empMap.get(g.postedByUid) || employees.find((e) => e.uid === g.postedByUid || e.uid === g.postedBy);
      let rawPosterName = emp?.name || g.postedByName;
      let posterAvatar = emp?.avatar || g.posterAvatar || (g.postedByUid === uid ? me?.avatar : null) || `https://i.pravatar.cc/150?u=${g.postedBy}`;
      let posterName = formatCleanName(rawPosterName, emp?.email || me?.email, 'Colleague');
      if (g.postedByUid === uid || g.postedBy === myEmployeeId) {
        posterAvatar = me?.avatar || posterAvatar;
      }
      const helperEmp = g.helper ? empMap.get(g.helper.id) : null;
      const helperName = g.helper ? formatCleanName(helperEmp?.name || g.helper.name, helperEmp?.email, 'Helper') : null;
      const helperAvatar = g.helper ? (helperEmp?.avatar || g.helper.avatar || `https://i.pravatar.cc/150?u=${g.helper.id}`) : null;

      return {
        id: g.id, title: g.title, description: g.description || '',
        postedBy: g.postedBy, postedByName: posterName, posterAvatar,
        expiresAt: g.expiresAt, status: g.status,
        helper: g.helper ? { id: g.helper.id, name: helperName, avatar: helperAvatar } : null,
        offers,
        hasOffered,
        createdAt: iso(g.createdAt), completedAt: iso(g.completedAt),
      };
    };

    const open = gigs.filter((g) => g.status === 'open').map(decorate);
    const myPosted = gigs.filter((g) => g.postedBy === myEmployeeId).map(decorate);
    const myAssigned = gigs.filter((g) => g.helper && g.helper.id === myEmployeeId).map(decorate);

    return { open, myPosted, myAssigned, myEmployeeId };
  }),
  offerHelp: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const gigId = request.data && request.data.gigId;
    if (!gigId) throw new Error('invalid-argument: Missing gigId.');

    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;
    const myName = (me && me.name) || 'A colleague';

    const gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new Error('not-found: Gig not found.');
    if (gig.status !== 'open') throw new Error('failed-precondition: This help request is no longer open.');
    if (gig.postedBy === myEmployeeId) throw new Error('failed-precondition: You cannot offer help to your own request.');

    const currentOffers = Array.isArray(gig.offers) ? gig.offers : [];
    if (!currentOffers.some((o) => o.id === myEmployeeId)) {
      currentOffers.push({ id: myEmployeeId, name: myName, offeredAt: new Date().toISOString() });
    }

    await setSnapshot(companyId, 'gigs', gigs.map((g) => g.id === gigId ? { ...g, offers: currentOffers } : g));
    await pushNotification(companyId, gig.postedBy, `${myName} offered to help with "${gig.title}".`, { table: 'gigs', id: gigId });
    return { ok: true };
  }),
  acceptHelp: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');

    const { gigId, helperId } = request.data || {};
    if (!gigId || !helperId) throw new Error('invalid-argument: gigId and helperId are required.');

    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new Error('not-found: Gig not found.');
    if (gig.postedBy !== myEmployeeId) throw new Error('permission-denied: Only the poster can accept help.');

    const employees = (await getSnapshot(companyId, 'employees', [])) || [];
    const helperEmp = employees.find((e) => e.id === helperId);
    const helperName = helperEmp?.name || 'Helper';
    const helperAvatar = helperEmp?.avatar || helperEmp?.photoURL || '';

    const updatedGig = {
      ...gig,
      status: 'accepted',
      helper: { id: helperId, name: helperName, avatar: helperAvatar },
    };

    await setSnapshot(companyId, 'gigs', gigs.map((g) => g.id === gigId ? updatedGig : g));
    await pushNotification(companyId, helperId, `Your offer to help with "${gig.title}" was accepted!`, { table: 'gigs', id: gigId });
    return { gig: updatedGig };
  }),
  declineHelp: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');

    const { gigId, helperId } = request.data || {};
    if (!gigId || !helperId) throw new Error('invalid-argument: gigId and helperId are required.');

    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new Error('not-found: Gig not found.');
    if (gig.postedBy !== myEmployeeId) throw new Error('permission-denied: Only the poster can decline help.');

    const currentOffers = Array.isArray(gig.offers) ? gig.offers : [];
    const updatedOffers = currentOffers.filter((o) => o.id !== helperId);

    const updatedGig = {
      ...gig,
      offers: updatedOffers,
    };

    await setSnapshot(companyId, 'gigs', gigs.map((g) => g.id === gigId ? updatedGig : g));
    return { ok: true };
  }),
  completeGig: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const gigId = request.data && request.data.gigId;
    if (!gigId) throw new Error('invalid-argument: Missing gigId.');

    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const gigs = (await getSnapshot(companyId, 'gigs', [])) || [];
    const gig = gigs.find((g) => g.id === gigId);
    if (!gig) throw new Error('not-found: Gig not found.');
    if (gig.status !== 'accepted' && gig.status !== 'in_progress') throw new Error('failed-precondition: Only accepted help requests can be completed.');
    if (gig.postedBy !== myEmployeeId && (!gig.helper || gig.helper.id !== myEmployeeId)) throw new Error('permission-denied: Only poster or accepted helper can complete.');

    const completedAt = timestamp();
    await setSnapshot(companyId, 'gigs', gigs.map((g) => g.id === gigId ? { ...g, status: 'completed', completedAt } : g));
    if (gig.helper) {
      await updateSnapshot(companyId, 'gig_contributions', async (current) => {
        const list = Array.isArray(current) ? current : [];
        return [{ id: `contrib-${Date.now()}-${Math.floor(Math.random() * 1000)}`, employeeId: gig.helper.id, gigId, completedAt, yearMonth: new Date().toISOString().slice(0, 7) }, ...list];
      }, []);
    }

    return { ok: true };
  }),
  getMySkills: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;
    const skills = await getSkillsForCompany(companyId);
    return { skills: skills[myEmployeeId] || [] };
  }),
  addSkill: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const skill = String((request.data && request.data.skillName) || '').trim();
    if (!skill) throw new Error('invalid-argument: skillName is required.');
    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const skills = await getSkillsForCompany(companyId);
    const current = skills[myEmployeeId] || [];
    if (!current.some((s) => normalizeSkill(s) === normalizeSkill(skill))) {
      skills[myEmployeeId] = [...current, skill];
      await setSnapshot(companyId, 'employee_skills', skills);
    }
    return { skills: skills[myEmployeeId] };
  }),
  removeSkill: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const skill = String((request.data && request.data.skillName) || '').trim();
    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;

    const skills = await getSkillsForCompany(companyId);
    skills[myEmployeeId] = (skills[myEmployeeId] || []).filter((s) => normalizeSkill(s) !== normalizeSkill(skill));
    await setSnapshot(companyId, 'employee_skills', skills);
    return { skills: skills[myEmployeeId] };
  })
};

// --- Performance Logic ---

const DEFAULT_WEIGHTS = { on_time: 30, late_penalty: 10, absence_penalty: 20, overtime_discourage: 10, leave_utilization: 10, gig_contribution: 20 };
const GRACE_MIN = 10;

function clampScore(n) { return Math.max(0, Math.min(100, Math.round(n))); }
function grade(total) { if (total >= 85) return 'A'; if (total >= 70) return 'B'; if (total >= 50) return 'C'; return 'D'; }

async function getWeights(companyId) { const w = (await getSnapshot(companyId, 'performance_weights', null)) || {}; return { ...DEFAULT_WEIGHTS, ...w }; }

function leaveUsage(leaveBalances, settings, empId) {
  const policies = (settings && settings.leavePolicies) || { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 };
  const b = (leaveBalances && leaveBalances[empId]) || {};
  let usedTotal = 0; let limitTotal = 0;
  for (const type of ['Casual', 'Sick']) {
    const key = Object.keys(b).find((k) => k.toLowerCase() === type.toLowerCase());
    const val = key ? b[key] : undefined;
    const limit = typeof val === 'object' && val.limit != null ? val.limit : policies[type] || 0;
    let used = 0;
    if (typeof val === 'object' && val.used != null) used = val.used;
    else if (typeof val === 'number') used = Math.max(0, limit - val);
    usedTotal += used; limitTotal += limit;
  }
  return { usedTotal, limitTotal };
}

async function computeEmployee(companyId, emp, ym, weights, logs, leaves, leaveBalances, settings, contributions) {
  const dates = datesInMonth(ym);
  const workdays = dates.filter((d) => { const dow = dowOfDate(d); return dow >= 1 && dow <= 5; });
  const empLeaves = leaves.filter((l) => l.employeeId === emp.id && l.status === 'Approved' && l.startDate);

  const coveredByLeave = (dateStr) => {
    const t = new Date(`${dateStr}T00:00:00Z`).getTime();
    return empLeaves.some((l) => {
      if (!l.startDate) return false;
      const s = new Date(`${l.startDate}T00:00:00Z`).getTime();
      const e = l.endDate ? new Date(`${l.endDate}T00:00:00Z`).getTime() : s;
      return t >= s && t <= e;
    });
  };

  let onTimeDays = 0; let lateCount = 0; let checkedInDays = 0;
  for (const d of workdays) {
    const log = logs[d] && logs[d][emp.id];
    if (!log) continue;
    const cin = parseTimeToMinutes(log.checkIn);
    if (cin == null) continue;
    checkedInDays += 1;
    if (cin <= EXPECTED_START_MIN + GRACE_MIN) onTimeDays += 1;
    else lateCount += 1;
  }
  const totalWorkingDays = workdays.length;
  const onTimePoints = totalWorkingDays > 0 ? Math.round((onTimeDays / totalWorkingDays) * weights.on_time) : 0;
  const latePenalty = Math.min(weights.late_penalty, lateCount * 2);

  let absences = 0;
  for (const d of dates) {
    const log = logs[d] && logs[d][emp.id];
    if (log && String(log.status || '').toLowerCase() === 'absent' && !coveredByLeave(d)) absences += 1;
  }
  const absencePenalty = Math.min(weights.absence_penalty, absences * 10);

  let overtimeHours = 0;
  for (const d of dates) {
    const log = logs[d] && logs[d][emp.id];
    if (log && Number(log.overtimeMinutes) > 0) overtimeHours += Number(log.overtimeMinutes) / 60;
  }
  let overtimeDeduct = 0;
  if (overtimeHours > 20) overtimeDeduct = Math.min(weights.overtime_discourage, (overtimeHours - 20) * 0.5);

  const { usedTotal, limitTotal } = leaveUsage(leaveBalances, settings, emp.id);
  let leaveUtilizationPoints = weights.leave_utilization;
  if (limitTotal > 0) {
    const utilization = Math.min(1, usedTotal / limitTotal);
    leaveUtilizationPoints = Math.round(Math.min(1, utilization / 0.75) * weights.leave_utilization);
  }

  const completedGigs = (contributions || []).filter((g) => g.employeeId === emp.id && (g.yearMonth || (g.completedAt && g.completedAt.seconds ? new Date(g.completedAt.seconds * 1000).toISOString().slice(0, 7) : null)) === ym).length;
  const gigPoints = Math.min(weights.gig_contribution, completedGigs * 10);

  const totalScore = clampScore(onTimePoints - latePenalty - absencePenalty - overtimeDeduct + leaveUtilizationPoints + gigPoints);
  return { onTimePoints, latePenalty, absencePenalty, overtimeDeduct: Math.round(overtimeDeduct * 10) / 10, leaveUtilizationPoints, gigPoints, totalScore, grade: grade(totalScore), totalWorkingDays, onTimeDays, lateCount, absences, overtimeHours: Math.round(overtimeHours * 10) / 10, completedGigs };
}

async function runPerformanceCalculation(companyId, ym) {
  const weights = await getWeights(companyId);
  const employees = (await getSnapshot(companyId, 'employees', [])) || [];
  const logs = (await getSnapshot(companyId, 'attendance_logs', {})) || {};
  const leaves = (await getSnapshot(companyId, 'leave_requests', [])) || [];
  const leaveBalances = (await getSnapshot(companyId, 'leave_balances', {})) || {};
  const settings = (await getSnapshot(companyId, 'settings', {})) || {};
  const contributions = (await getSnapshot(companyId, 'gig_contributions', [])) || [];

  let existing = (await getSnapshot(companyId, 'performance_scores', [])) || [];
  existing = existing.filter((s) => s.yearMonth !== ym);

  const rows = [];
  for (const emp of employees) {
    const s = String(emp.status || 'Active').toLowerCase();
    if (s === 'inactive' || s === 'terminated') continue;
    const r = await computeEmployee(companyId, emp, ym, weights, logs, leaves, leaveBalances, settings, contributions);
    rows.push({ id: `${emp.id}-${ym}`, employeeId: emp.id, yearMonth: ym, ...r, calculatedAt: timestamp() });
  }
  await setSnapshot(companyId, 'performance_scores', [...existing, ...rows]);
  await setSnapshot(companyId, 'performance_weights', weights);
  return rows;
}

export const performanceApiLocal = {
  calculate: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const ym = (request.data && request.data.month) || lastMonthKey();
    const rows = await runPerformanceCalculation(companyId, ym);
    return { month: ym, calculated: rows.length };
  }),
  getScores: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const ym = (request.data && request.data.month) || lastMonthKey();
    const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
    const employees = (await getSnapshot(companyId, 'employees', [])) || [];
    const empMap = new Map(employees.map((e) => [e.id, e]));
    const list = scores.filter((s) => s.yearMonth === ym).sort((a, b) => b.totalScore - a.totalScore).map((s) => ({
      id: s.id, employeeId: s.employeeId, employeeName: (empMap.get(s.employeeId) || {}).name || s.employeeId, department: (empMap.get(s.employeeId) || {}).department || '',
      onTimePoints: s.onTimePoints, latePenalty: s.latePenalty, absencePenalty: s.absencePenalty, overtimeDeduct: s.overtimeDeduct, leaveUtilizationPoints: s.leaveUtilizationPoints, gigPoints: s.gigPoints, totalScore: s.totalScore, grade: s.grade,
    }));
    return { month: ym, scores: list };
  }),
  getMyScore: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const me = await getUser(uid);
    const myEmployeeId = (me && me.employeeId) || uid;
    const ym = (request.data && request.data.month) || lastMonthKey();
    const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
    const mine = scores.filter((s) => s.yearMonth === ym && s.employeeId === myEmployeeId)[0] || null;
    return { month: ym, score: mine };
  }),
  getTopPerformers: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const ym = (request.data && request.data.month) || lastMonthKey();
    const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
    const employees = (await getSnapshot(companyId, 'employees', [])) || [];
    const empMap = new Map(employees.map((e) => [e.id, e]));
    
    const topList = scores.filter((s) => s.yearMonth === ym).sort((a, b) => b.totalScore - a.totalScore).slice(0, 3).map((s) => ({
      employeeId: s.employeeId, 
      employeeName: (empMap.get(s.employeeId) || {}).name || s.employeeId, 
      totalScore: s.totalScore, 
      grade: s.grade,
    }));
    return { month: ym, topPerformers: topList };
  }),
  getTrends: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const employeeId = request.data && request.data.employeeId;
    if (!employeeId) throw new Error('invalid-argument: Missing employeeId.');
    const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
    return { scores: scores.filter((s) => s.employeeId === employeeId).sort((a, b) => (a.yearMonth < b.yearMonth ? -1 : 1)).map((s) => ({ yearMonth: s.yearMonth, totalScore: s.totalScore, grade: s.grade })) };
  }),
  getWeights: onCall(async (request) => {
    const uid = assertAuth(request);
    const companyId = await getCompanyIdForUid(uid);
    if (!companyId) throw new Error('failed-precondition: Account is not linked to a company.');
    const w = await getWeights(companyId);
    return { weights: w };
  }),
  updateWeights: onCall(async (request) => {
    const { companyId } = await requireAdmin(request);
    const weights = (request.data && request.data.weights) || {};
    await setSnapshot(companyId, 'performance_weights', { ...DEFAULT_WEIGHTS, ...weights });
    return { success: true };
  })
};
