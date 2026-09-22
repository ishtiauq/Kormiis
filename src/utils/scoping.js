// Department-scoped visibility for team-scoped roles (Manager, or a teammate
// granted an approver/manager capability). Admins and HR are never scoped.
import { isTeamScoped } from './permissions.js'

export function managedDepartment(user) {
  return isTeamScoped(user) ? (user?.department || null) : null
}

export function selfEmployeeId(user) {
  return user?.employeeId || user?.id || null
}

// Manager identifier variants used to match an employee's reporting line.
function selfIdentity(user) {
  return new Set([user?.employeeId, user?.id, user?.uid].filter(Boolean))
}

function reportingLineOf(employee) {
  return employee?.reportsTo || employee?.managerId || employee?.reports_to || null
}

/**
 * Employees whose explicit reporting line points at the acting user.
 */
export function directReports(employees, user) {
  const ids = selfIdentity(user)
  return (employees || []).filter(e => {
    const mgr = reportingLineOf(e)
    return mgr && ids.has(mgr)
  })
}

/**
 * Filters a list of employees (or records carrying an employee identity) to the
 * acting user's team. Admins/HR see everything. For team-scoped roles:
 *   1. Prefer the explicit reporting line (`reportsTo`) — direct reports + self.
 *   2. Fall back to same-department scoping when no reporting lines are set.
 * Records belonging to the acting user are always kept.
 */
export function scopeEmployees(employees, user, getId = (e) => e?.employeeId || e?.id) {
  if (!isTeamScoped(user)) return employees || []
  const ids = selfIdentity(user)

  const reports = directReports(employees, user)
  if (reports.length > 0) {
    const reportIds = new Set(reports.map(getId))
    return (employees || []).filter(e => reportIds.has(getId(e)) || ids.has(getId(e)))
  }

  const dept = managedDepartment(user)
  if (!dept) return (employees || []).filter(e => ids.has(getId(e)))
  return (employees || []).filter(e => e?.department === dept || ids.has(getId(e)))
}

/**
 * Filters records by the department of the employee they reference. Records
 * whose employee cannot be resolved are dropped for scoped users, kept for
 * unscoped users.
 */
export function scopeByEmployeeDepartment(records, employees, user, getEmployeeId) {
  const dept = managedDepartment(user)
  if (!dept) return records || []
  const selfId = selfEmployeeId(user)
  const deptByEmployee = new Map((employees || []).map(e => [e.id || e.employeeId, e.department]))
  return (records || []).filter(r => {
    const id = getEmployeeId(r)
    if (selfId && id === selfId) return true
    return deptByEmployee.get(id) === dept
  })
}
