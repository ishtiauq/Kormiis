// Central role & permission model.
//
// Roles: Admin, HR, Manager, Teammate.
//   - Admin    : unrestricted (workspace owner or promoted admin).
//   - HR       : near-admin — everything except workspace Settings.
//   - Manager  : team-scoped — sees/approves only their own department.
//   - Teammate : self-service + any explicitly granted module permissions.
//
// A roster employee can carry a `permissions` array of extra module keys
// (payroll, employees, assets, ...) and capability keys (approve_leaves,
// approve_expenses, manage_attendance).

export const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  TEAMMATE: 'Teammate',
}

const ALL_MODULES = [
  'dashboard', 'tasks', 'announcements', 'documents', 'employees', 'payroll',
  'attendance', 'assets', 'performance', 'settings', 'profile', 'calendar',
  'leaves', 'expenses', 'notes',
]

// Admin gets every module (handled by the short-circuit in hasPermission).
const HR_MODULES = ALL_MODULES.filter(m => m !== 'settings')

// Manager gets team-level visibility but not employee management, payroll or
// workspace settings.
const MANAGER_MODULES = [
  'dashboard', 'attendance', 'leaves', 'expenses', 'calendar', 'tasks',
  'profile', 'notes', 'performance', 'announcements', 'documents', 'assets',
]

// Unchanged self-service base for teammates.
export const TEAMMATE_BASE_PERMISSIONS = [
  'dashboard', 'attendance', 'leaves', 'expenses', 'calendar', 'tasks',
  'profile', 'settings', 'notes', 'performance',
]

const ROLE_MODULES = {
  [ROLES.ADMIN]: ALL_MODULES,
  [ROLES.HR]: HR_MODULES,
  [ROLES.MANAGER]: MANAGER_MODULES,
  [ROLES.TEAMMATE]: TEAMMATE_BASE_PERMISSIONS,
}

// Capability grants used by feature-level gates (approve/reimburse/manage).
// Manager's grants are department-scoped at the call site via scoping.js.
const ROLE_CAPABILITIES = {
  [ROLES.ADMIN]: ['approve_leaves', 'approve_expenses', 'manage_attendance'],
  [ROLES.HR]: ['approve_leaves', 'approve_expenses', 'manage_attendance'],
  [ROLES.MANAGER]: ['approve_leaves', 'manage_attendance'],
  [ROLES.TEAMMATE]: [],
}

// Normalises legacy/ghost role strings to the canonical four.
export function normalizeRole(role) {
  if (!role) return ROLES.TEAMMATE
  const r = String(role).trim().toLowerCase()
  if (r === 'admin' || r === 'owner' || r === 'workspace owner') return ROLES.ADMIN
  if (r === 'hr' || r === 'hr manager' || r === 'hr officer') return ROLES.HR
  if (r === 'manager') return ROLES.MANAGER
  return ROLES.TEAMMATE
}

export function getRoleModules(role) {
  return ROLE_MODULES[normalizeRole(role)] || []
}

export function getRoleCapabilities(role) {
  return ROLE_CAPABILITIES[normalizeRole(role)] || []
}

function customList(user) {
  return Array.isArray(user?.permissions) ? user.permissions : []
}

// View ids that are not nav modules but map to one for gating purposes.
const VIEW_ALIASES = {
  'my-attendance': 'attendance',
  wellbeing: 'performance',
}

/**
 * Module-level access for the navigation / view router.
 */
export function hasPermission(roleOrUser, resource) {
  const role = typeof roleOrUser === 'object' && roleOrUser !== null ? roleOrUser.role : roleOrUser
  const user = typeof roleOrUser === 'object' && roleOrUser !== null ? roleOrUser : null
  const normalized = normalizeRole(role)
  const module = VIEW_ALIASES[resource] || resource
  if (normalized === ROLES.ADMIN) return true
  if (getRoleModules(normalized).includes(module)) return true
  return user ? customList(user).includes(module) : false
}

/**
 * Capability access for feature gates (approve leaves, reimburse, etc.).
 * Admin short-circuits, then role capabilities, then explicit grants.
 */
export function can(user, capability) {
  const normalized = normalizeRole(user?.role)
  if (normalized === ROLES.ADMIN) return true
  if (getRoleCapabilities(normalized).includes(capability)) return true
  return customList(user).includes(capability)
}

/** Managers and teammates-with-grant are confined to their department. */
export function isTeamScoped(user) {
  const role = normalizeRole(user?.role)
  if (role === ROLES.MANAGER) return true
  return role === ROLES.TEAMMATE && (
    can(user, 'approve_leaves') || can(user, 'manage_attendance') || can(user, 'approve_expenses')
  )
}
