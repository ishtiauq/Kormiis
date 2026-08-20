import { db, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp } from './firebase.js';
import { revokeInvite } from './auth.js';

/**
 * Completely purges all records, snapshots, and permissions for deleted employees
 * across all collections, snapshots, and modules.
 *
 * @param {string} adminUid - Company Admin UID / Workspace ID
 * @param {string[]} employeeIds - Array of employee IDs being removed (e.g. ['emp-920', 'emp-627'])
 * @param {string[]} employeeEmails - Array of employee emails (if available)
 */
export async function cascadeDeleteEmployees(adminUid, employeeIds = [], employeeEmails = []) {
  if (!db || !adminUid || !employeeIds.length) return;

  const idSet = new Set(employeeIds.filter(Boolean));
  const emailSet = new Set(employeeEmails.filter(Boolean).map(e => e.toLowerCase()));

  try {
    // 1. Revoke invites and remove user docs
    for (const email of emailSet) {
      try {
        await revokeInvite(email);
      } catch (e) {
        console.warn(`Failed to revoke invite for ${email}:`, e);
      }
    }

    // Try finding and deleting user documents by email or employeeId
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('companyUid', '==', adminUid));
      const snap = await getDocs(q);
      snap.forEach(async (userDoc) => {
        const uData = userDoc.data();
        const matchesId = uData.employeeId && idSet.has(uData.employeeId);
        const matchesEmail = uData.email && emailSet.has(uData.email.toLowerCase());
        if (matchesId || matchesEmail) {
          try {
            await deleteDoc(doc(db, 'users', userDoc.id));
            await deleteDoc(doc(db, 'companies', adminUid, 'members', userDoc.id));
          } catch (err) {
            console.warn(`Failed to remove user doc ${userDoc.id}:`, err);
          }
        }
      });
    } catch (e) {
      console.warn('User doc cleanup error:', e);
    }

    // 2. Helper to clean a snapshot table
    const cleanSnapshot = async (tableName, cleaner) => {
      try {
        const snapRef = doc(db, 'companies', adminUid, 'snapshots', tableName);
        const snap = await getDoc(snapRef);
        if (snap.exists() && snap.data().data !== undefined) {
          const currentData = snap.data().data;
          const cleaned = cleaner(currentData);
          await setDoc(snapRef, { data: cleaned, lastUpdated: serverTimestamp() }, { merge: true });
          return cleaned;
        }
      } catch (err) {
        console.error(`Error cleaning snapshot ${tableName}:`, err);
      }
      return null;
    };

    // 3. Purge Performance Scores
    await cleanSnapshot('performance_scores', (scores) => {
      if (!Array.isArray(scores)) return [];
      return scores.filter(s => !idSet.has(s.employeeId));
    });

    // 4. Purge Burnout / Wellbeing Risks
    await cleanSnapshot('burnout_risks', (risks) => {
      if (!Array.isArray(risks)) return [];
      return risks.filter(r => !idSet.has(r.employeeId));
    });

    // 5. Purge Leave Requests
    await cleanSnapshot('leave_requests', (leaves) => {
      if (!Array.isArray(leaves)) return [];
      return leaves.filter(l => !idSet.has(l.employeeId) && (!l.employeeEmail || !emailSet.has(l.employeeEmail.toLowerCase())));
    });

    // 6. Purge Leave Balances
    await cleanSnapshot('leave_balances', (balances) => {
      if (!balances || typeof balances !== 'object') return {};
      const next = { ...balances };
      idSet.forEach(id => { delete next[id]; });
      return next;
    });

    // 7. Purge Attendance Logs
    await cleanSnapshot('attendance_logs', (logs) => {
      if (!logs || typeof logs !== 'object') return {};
      const next = { ...logs };
      Object.keys(next).forEach(date => {
        if (next[date] && typeof next[date] === 'object') {
          idSet.forEach(id => { delete next[date][id]; });
        }
      });
      return next;
    });

    // 8. Purge Payroll Records
    await cleanSnapshot('payroll', (payroll) => {
      if (!payroll || typeof payroll !== 'object') return {};
      const next = { ...payroll };
      Object.keys(next).forEach(month => {
        if (Array.isArray(next[month])) {
          next[month] = next[month].filter(p => !idSet.has(p.employeeId));
        }
      });
      return next;
    });

    // 9. Purge Tasks (Unassign or remove tasks assigned to deleted employees)
    await cleanSnapshot('tasks', (tasks) => {
      if (!Array.isArray(tasks)) return [];
      return tasks.map(t => {
        const isAssigned = idSet.has(t.assigneeId) || (t.assigneeEmail && emailSet.has(t.assigneeEmail.toLowerCase()));
        if (isAssigned) {
          return { ...t, assignee: 'Unassigned', assigneeId: null, assigneeEmail: null };
        }
        return t;
      });
    });

    // 10. Purge Assets (Return/Unassign assets)
    await cleanSnapshot('assets', (assets) => {
      if (!Array.isArray(assets)) return [];
      return assets.map(a => {
        const isAssigned = idSet.has(a.assignedTo) || (a.assignedToEmail && emailSet.has(a.assignedToEmail.toLowerCase()));
        if (isAssigned) {
          return { ...a, assignedTo: null, assignedToEmail: null, status: 'Available' };
        }
        return a;
      });
    });

    // 11. Purge Expenses
    await cleanSnapshot('expenses', (expenses) => {
      if (!Array.isArray(expenses)) return [];
      return expenses.filter(e => !idSet.has(e.employeeId) && (!e.employeeEmail || !emailSet.has(e.employeeEmail.toLowerCase())));
    });

    // 12. Purge Employee Skills & Gig Contributions
    await cleanSnapshot('employee_skills', (skills) => {
      if (!skills || typeof skills !== 'object') return {};
      const next = { ...skills };
      idSet.forEach(id => { delete next[id]; });
      return next;
    });

    await cleanSnapshot('gig_contributions', (contribs) => {
      if (!Array.isArray(contribs)) return [];
      return contribs.filter(c => !idSet.has(c.employeeId));
    });

    await cleanSnapshot('login_activity', (activity) => {
      if (!activity || typeof activity !== 'object') return {};
      const next = { ...activity };
      Object.keys(next).forEach(m => {
        if (next[m] && typeof next[m] === 'object') {
          idSet.forEach(id => { delete next[m][id]; });
        }
      });
      return next;
    });

    // 13. Purge Notifications
    await cleanSnapshot('notifications', (notifs) => {
      if (!Array.isArray(notifs)) return [];
      return notifs.filter(n => {
        const matchesId = idSet.has(n.employeeId) || idSet.has(n.actorId) || idSet.has(n.targetEmployeeId);
        const matchesEmail = (n.actorEmail && emailSet.has(n.actorEmail.toLowerCase())) || (n.targetEmail && emailSet.has(n.targetEmail.toLowerCase()));
        return !matchesId && !matchesEmail;
      });
    });

  } catch (err) {
    console.error('cascadeDeleteEmployees failed:', err);
  }
}
