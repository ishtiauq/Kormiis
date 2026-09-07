import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { burnoutApiLocal, performanceApiLocal, lastMonthKey as getLMK } from './backendLogic.js'

export const burnoutApi = burnoutApiLocal;
export const performanceApi = performanceApiLocal;

export const currentMonthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const lastMonthKey = getLMK;

/**
 * Records a login event per Firebase uid into the company's login_activity
 * snapshot. Used by the burnout detector to measure login-frequency drops.
 */
export async function recordLoginActivity(companyId, uid) {
  if (!db || !companyId || !uid) return
  const ref = doc(db, 'companies', companyId, 'snapshots', 'login_activity')
  const monthKey = currentMonthKey()
  try {
    const snap = await getDoc(ref)
    const data = snap.exists() && snap.data().data ? snap.data().data : {}
    const month = data[monthKey] || {}
    await setDoc(
      ref,
      { data: { ...data, [monthKey]: { ...month, [uid]: (month[uid] || 0) + 1 } }, lastUpdated: new Date() },
      { merge: true }
    )
  } catch (e) {
    console.error('recordLoginActivity failed:', e)
  }
}
