// Central role & permission model.
//
// Roles: Admin, HR, Manager, Teammate.
//   - Admin    : unrestricted (workspace owner or promoted admin).
//   - HR       : near-admin — everything except workspace Settings.
//   - Manager  : team-scoped — sees/approves only their own department.
//   - Teammate : self-service.
//
// Each role maps to a permission TEMPLATE (a set of modules + capabilities).
// Workspaces can override these globally via Settings → Roles & Access, stored
// in `settings.rolePermissions`. Per-member overrides are not supported — a
// role is the source of truth for access.

export const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  TEAMMATE: 'Teammate',
}

export const ALL_MODULES = [
  'dashboard', 'tasks', 'announcements', 'documents', 'employees', 'payroll',
  'attendance', 'assets', 'performance', 'settings', 'profile', 'calendar',
  'leaves', 'expenses', 'notes',
]

export const ALL_CAPABILITIES = ['approve_leaves', 'approve_expenses', 'manage_attendance']

// Admin gets every module (handled by the short-circuit in hasPermission).
const HR_MODULES = ALL_MODULES.filter(m => m !== 'settings')

// Manager gets team-level visibility but not employee management, payroll or
// workspace settings.
const MANAGER_MODULES = [
  'dashboard', 'attendance', 'leaves', 'expenses', 'calendar', 'tasks',
  'profile', 'notes', 'performance', 'announcements', 'documents', 'assets',
]

// Self-service base for teammates.
export const TEAMMATE_BASE_PERMISSIONS = [
  'dashboard', 'attendance', 'leaves', 'expenses', 'calendar', 'tasks',
  'profile', 'settings', 'notes', 'performance',
]

const DEFAULT_TEMPLATES = {
  [ROLES.ADMIN]: { modules: ALL_MODULES, capabilities: ALL_CAPABILITIES },
  [ROLES.HR]: { modules: HR_MODULES, capabilities: ALL_CAPABILITIES },
  [ROLES.MANAGER]: { modules: MANAGER_MODULES, capabilities: ['approve_leaves', 'manage_attendance'] },
  [ROLES.TEAMMATE]: { modules: TEAMMATE_BASE_PERMISSIONS, capabilities: [] },
}

// Active workspace-wide template overrides (set from settings.rolePermissions).
let ACTIVE_TEMPLATES = null

/** Registers the workspace's global role-permission templates. */
export function setGlobalPermissionTemplates(map) {
  ACTIVE_TEMPLATES = map || null
}

export function getGlobalPermissionTemplates() {
  return ACTIVE_TEMPLATES
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

function templateFor(role) {
  const norm = normalizeRole(role)
  if (ACTIVE_TEMPLATES && ACTIVE_TEMPLATES[norm]) {
    const t = ACTIVE_TEMPLATES[norm]
    return { modules: t?.modules || [], capabilities: t?.capabilities || [] }
  }
  return DEFAULT_TEMPLATES[norm]
}

/** Fresh copy of the built-in role-permission templates. */
export function getDefaultTemplates() {
  return {
    [ROLES.ADMIN]: { modules: [...ALL_MODULES], capabilities: [...ALL_CAPABILITIES] },
    [ROLES.HR]: { modules: [...HR_MODULES], capabilities: [...ALL_CAPABILITIES] },
    [ROLES.MANAGER]: { modules: [...MANAGER_MODULES], capabilities: ['approve_leaves', 'manage_attendance'] },
    [ROLES.TEAMMATE]: { modules: [...TEAMMATE_BASE_PERMISSIONS], capabilities: [] },
  }
}

export function getRoleModules(role) {
  return templateFor(role).modules || []
}

export function getRoleCapabilities(role) {
  return templateFor(role).capabilities || []
}

// View ids that are not nav modules but map to one for gating purposes.
const VIEW_ALIASES = {
  'my-attendance': 'attendance',
  wellbeing: 'performance',
}

/**
 * Module-level access for the navigation / view router. The role template is
 * the only source of truth — per-member grants are no longer honoured.
 */
export function hasPermission(roleOrUser, resource) {
  const role = typeof roleOrUser === 'object' && roleOrUser !== null ? roleOrUser.role : roleOrUser
  const normalized = normalizeRole(role)
  if (normalized === ROLES.ADMIN) return true
  const module = VIEW_ALIASES[resource] || resource
  return getRoleModules(normalized).includes(module)
}

/**
 * Capability access for feature gates (approve leaves, reimburse, etc.).
 * Admin short-circuits, then the role's template capabilities.
 */
export function can(user, capability) {
  const normalized = normalizeRole(user?.role)
  if (normalized === ROLES.ADMIN) return true
  return getRoleCapabilities(normalized).includes(capability)
}

/** Only Managers are confined to their team (department / reporting line). */
export function isTeamScoped(user) {
  return normalizeRole(user?.role) === ROLES.MANAGER
}