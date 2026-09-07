'use strict';

/**
 * Feature 5 — Employee Performance Tracker.
 *
 * Monthly score from punctuality, leave habits and overtime behaviour.
 * Weights are configurable in companies/{id}/snapshots/performance_weights.
 */

const {
  onCall,
  HttpsError,
  timestamp,
  lastMonthKey,
  datesInMonth,
  dowOfDate,
  parseTimeToMinutes,
  getSnapshot,
  setSnapshot,
  updateSnapshot,
  getCompanyIdForUid,
  getUser,
  requireAdmin,
} = require('./common');

const DEFAULT_WEIGHTS = {
  on_time: 30,
  late_penalty: 10,
  absence_penalty: 20,
  overtime_discourage: 10,
  leave_utilization: 10,
};

const EXPECTED_START_MIN = 9 * 60;
const GRACE_MIN = 10;

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function grade(total) {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 50) return 'C';
  return 'D';
}

async function getWeights(companyId) {
  const w = (await getSnapshot(companyId, 'performance_weights', null)) || {};
  return { ...DEFAULT_WEIGHTS, ...w };
}

function coveredByLeave(empLeaves, dateStr) {
  const t = new Date(`${dateStr}T00:00:00Z`).getTime();
  return empLeaves.some((l) => {
    if (!l.startDate) return false;
    const s = new Date(`${l.startDate}T00:00:00Z`).getTime();
    const e = l.endDate ? new Date(`${l.endDate}T00:00:00Z`).getTime() : s;
    return t >= s && t <= e;
  });
}

function leaveUsage(leaveBalances, settings, empId) {
  const policies = (settings && settings.leavePolicies) || { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 };
  const b = (leaveBalances && leaveBalances[empId]) || {};
  let usedTotal = 0;
  let limitTotal = 0;
  for (const type of ['Casual', 'Sick']) {
    const key = Object.keys(b).find((k) => k.toLowerCase() === type.toLowerCase());
    const val = key ? b[key] : undefined;
    const limit = typeof val === 'object' && val.limit != null ? val.limit : policies[type] || 0;
    let used = 0;
    if (typeof val === 'object' && val.used != null) used = val.used;
    else if (typeof val === 'number') used = Math.max(0, limit - val);
    usedTotal += used;
    limitTotal += limit;
  }
  return { usedTotal, limitTotal };
}

async function computeEmployee(companyId, emp, ym, weights, logs, leaves, leaveBalances, settings) {
  const dates = datesInMonth(ym);
  const workdays = dates.filter((d) => {
    const dow = dowOfDate(d);
    return dow >= 1 && dow <= 5;
  });

  const empLeaves = leaves.filter((l) => l.employeeId === emp.id && l.status === 'Approved' && l.startDate);

  let onTimeDays = 0;
  let lateCount = 0;
  let checkedInDays = 0;
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
  const onTimePoints =
    totalWorkingDays > 0 ? Math.round((onTimeDays / totalWorkingDays) * weights.on_time) : 0;

  const latePenalty = Math.min(weights.late_penalty, lateCount * 2);

  // Unauthorized absences (explicit 'Absent' not covered by approved leave).
  let absences = 0;
  for (const d of dates) {
    const log = logs[d] && logs[d][emp.id];
    if (log && String(log.status || '').toLowerCase() === 'absent' && !coveredByLeave(empLeaves, d)) {
      absences += 1;
    }
  }
  const absencePenalty = Math.min(weights.absence_penalty, absences * 10);

  // Overtime hours: attendance log overtime + approved overtime claims.
  let overtimeHours = 0;
  for (const d of dates) {
    const log = logs[d] && logs[d][emp.id];
    if (log && Number(log.overtimeMinutes) > 0) overtimeHours += Number(log.overtimeMinutes) / 60;
  }
  const claims = (await getSnapshot(companyId, 'overtime_claims', [])) || [];
  for (const c of claims) {
    if (c.employeeId === emp.id && c.status === 'Approved' && (c.yearMonth || (c.date || '').slice(0, 7)) === ym) {
      overtimeHours += Number(c.hours) || 0;
    }
  }
  let overtimeDeduct = 0;
  if (overtimeHours > 20) {
    overtimeDeduct = Math.min(weights.overtime_discourage, (overtimeHours - 20) * 0.5);
  }

  // Leave utilization: award full weight if >=75% of casual+sick used.
  const { usedTotal, limitTotal } = leaveUsage(leaveBalances, settings, emp.id);
  let leaveUtilizationPoints = weights.leave_utilization;
  if (limitTotal > 0) {
    const utilization = Math.min(1, usedTotal / limitTotal);
    leaveUtilizationPoints = Math.round(Math.min(1, utilization / 0.75) * weights.leave_utilization);
  }

  const totalScore = clampScore(
    onTimePoints - latePenalty - absencePenalty - overtimeDeduct + leaveUtilizationPoints
  );

  return {
    onTimePoints,
    latePenalty,
    absencePenalty,
    overtimeDeduct: Math.round(overtimeDeduct * 10) / 10,
    leaveUtilizationPoints,
    totalScore,
    grade: grade(totalScore),
    totalWorkingDays,
    onTimeDays,
    lateCount,
    absences,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
  };
}

async function runPerformanceCalculation(companyId, ym) {
  const weights = await getWeights(companyId);
  const employees = (await getSnapshot(companyId, 'employees', [])) || [];
  const logs = (await getSnapshot(companyId, 'attendance_logs', {})) || {};
  const leaves = (await getSnapshot(companyId, 'leave_requests', [])) || [];
  const leaveBalances = (await getSnapshot(companyId, 'leave_balances', {})) || {};
  const settings = (await getSnapshot(companyId, 'settings', {})) || {};

  let existing = (await getSnapshot(companyId, 'performance_scores', [])) || [];
  existing = existing.filter((s) => s.yearMonth !== ym);

  const rows = [];
  for (const emp of employees) {
    const s = String(emp.status || 'Active').toLowerCase();
    if (s === 'inactive' || s === 'terminated') continue;
    const r = await computeEmployee(companyId, emp, ym, weights, logs, leaves, leaveBalances, settings);
    rows.push({
      id: `${emp.id}-${ym}`,
      employeeId: emp.id,
      yearMonth: ym,
      ...r,
      calculatedAt: timestamp(),
    });
  }

  await setSnapshot(companyId, 'performance_scores', [...existing, ...rows]);
  await setSnapshot(companyId, 'performance_weights', weights);
  return rows;
}

// --- Performance logic ------------------------------------------------------

exports.calculateMonthlyPerformance = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const ym = (request.data && request.data.month) || lastMonthKey();
  const rows = await runPerformanceCalculation(companyId, ym);
  return { month: ym, calculated: rows.length };
});

exports.getPerformanceScores = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const ym = (request.data && request.data.month) || lastMonthKey();
  const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
  const employees = (await getSnapshot(companyId, 'employees', [])) || [];
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const list = scores
    .filter((s) => s.yearMonth === ym)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      employeeName: (empMap.get(s.employeeId) || {}).name || s.employeeId,
      department: (empMap.get(s.employeeId) || {}).department || '',
      onTimePoints: s.onTimePoints,
      latePenalty: s.latePenalty,
      absencePenalty: s.absencePenalty,
      overtimeDeduct: s.overtimeDeduct,
      leaveUtilizationPoints: s.leaveUtilizationPoints,
      totalScore: s.totalScore,
      grade: s.grade,
    }));
  return { month: ym, scores: list };
});

exports.getMyScore = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const companyId = await getCompanyIdForUid(uid);
  if (!companyId) throw new HttpsError('failed-precondition', 'Account is not linked to a company.');
  const me = await getUser(uid);
  const myEmployeeId = (me && me.employeeId) || uid;
  const ym = (request.data && request.data.month) || lastMonthKey();
  const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
  const mine = scores.filter((s) => s.yearMonth === ym && s.employeeId === myEmployeeId)[0] || null;
  return { month: ym, score: mine };
});

exports.getPerformanceTrends = onCall(async (request) => {
  const { companyId } = await requireAdmin(request);
  const employeeId = request.data && request.data.employeeId;
  if (!employeeId) throw new HttpsError('invalid-argument', 'Missing employeeId.');
  const scores = (await getSnapshot(companyId, 'performance_scores', [])) || [];
  return {
    scores: scores
      .filter((s) => s.employeeId === employeeId)
      .sort((a, b) => (a.yearMonth < b.yearMonth ? -1 : 1))
      .map((s) => ({ yearMonth: s.yearMonth, totalScore: s.totalScore, grade: s.grade })),
  };
});
