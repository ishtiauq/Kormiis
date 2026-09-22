import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizeRole, hasPermission, can, isTeamScoped, setGlobalPermissionTemplates } from './permissions.js';

const user = (over = {}) => ({ role: 'Teammate', permissions: [], ...over });

beforeEach(() => setGlobalPermissionTemplates(null));
afterEach(() => setGlobalPermissionTemplates(null));

describe('normalizeRole', () => {
  it('maps canonical and legacy role strings', () => {
    expect(normalizeRole('Admin')).toBe('Admin');
    expect(normalizeRole('hr')).toBe('HR');
    expect(normalizeRole('HR Manager')).toBe('HR');
    expect(normalizeRole('Manager')).toBe('Manager');
    expect(normalizeRole('')).toBe('Teammate');
    expect(normalizeRole(undefined)).toBe('Teammate');
  });
});

describe('hasPermission', () => {
  it('grants Admin every module', () => {
    expect(hasPermission(user({ role: 'Admin' }), 'settings')).toBe(true);
    expect(hasPermission(user({ role: 'Admin' }), 'payroll')).toBe(true);
    expect(hasPermission(user({ role: 'Admin' }), 'employees')).toBe(true);
  });

  it('gives HR everything except settings by default', () => {
    const hr = user({ role: 'HR' });
    expect(hasPermission(hr, 'payroll')).toBe(true);
    expect(hasPermission(hr, 'employees')).toBe(true);
    expect(hasPermission(hr, 'attendance')).toBe(true);
    expect(hasPermission(hr, 'settings')).toBe(false);
  });

  it('scopes Manager away from payroll and employees', () => {
    const manager = user({ role: 'Manager' });
    expect(hasPermission(manager, 'attendance')).toBe(true);
    expect(hasPermission(manager, 'tasks')).toBe(true);
    expect(hasPermission(manager, 'payroll')).toBe(false);
    expect(hasPermission(manager, 'employees')).toBe(false);
    expect(hasPermission(manager, 'settings')).toBe(false);
  });

  it('gives teammates only the self-service base', () => {
    const teammate = user({ permissions: ['employees'] });
    expect(hasPermission(teammate, 'dashboard')).toBe(true);
    expect(hasPermission(teammate, 'settings')).toBe(true);
    expect(hasPermission(teammate, 'payroll')).toBe(false);
    // Per-member grants are no longer honoured.
    expect(hasPermission(teammate, 'employees')).toBe(false);
  });

  it('resolves view aliases', () => {
    expect(hasPermission(user({ role: 'Manager' }), 'my-attendance')).toBe(true);
    expect(hasPermission(user({ role: 'Manager' }), 'wellbeing')).toBe(true);
  });

  it('honours global template overrides', () => {
    setGlobalPermissionTemplates({
      Admin: { modules: ['dashboard'], capabilities: [] },
      HR: { modules: ['dashboard', 'settings'], capabilities: [] },
      Manager: { modules: ['dashboard', 'payroll'], capabilities: [] },
      Teammate: { modules: ['dashboard', 'employees'], capabilities: [] },
    });
    const hr = user({ role: 'HR' });
    expect(hasPermission(hr, 'settings')).toBe(true);
    expect(hasPermission(hr, 'payroll')).toBe(false);
    const manager = user({ role: 'Manager' });
    expect(hasPermission(manager, 'payroll')).toBe(true);
    // Admin always full regardless of template.
    expect(hasPermission(user({ role: 'Admin' }), 'payroll')).toBe(true);
  });
});

describe('can', () => {
  it('grants approver capabilities to Admin/HR/Manager by default', () => {
    expect(can(user({ role: 'Admin' }), 'approve_leaves')).toBe(true);
    expect(can(user({ role: 'HR' }), 'approve_expenses')).toBe(true);
    expect(can(user({ role: 'Manager' }), 'approve_leaves')).toBe(true);
  });

  it('denies Manager expense approval and plain teammates', () => {
    expect(can(user({ role: 'Manager' }), 'approve_expenses')).toBe(false);
    expect(can(user(), 'approve_leaves')).toBe(false);
  });

  it('no longer honours explicit per-member grants', () => {
    expect(can(user({ permissions: ['approve_leaves'] }), 'approve_leaves')).toBe(false);
  });

  it('honours capability changes in global templates', () => {
    setGlobalPermissionTemplates({
      Admin: { modules: ['dashboard'], capabilities: [] },
      HR: { modules: ['dashboard'], capabilities: ['approve_expenses'] },
      Manager: { modules: ['dashboard'], capabilities: [] },
      Teammate: { modules: ['dashboard'], capabilities: [] },
    });
    expect(can(user({ role: 'HR' }), 'approve_expenses')).toBe(true);
    expect(can(user({ role: 'HR' }), 'approve_leaves')).toBe(false);
  });
});

describe('isTeamScoped', () => {
  it('is true only for Managers', () => {
    expect(isTeamScoped(user({ role: 'Manager' }))).toBe(true);
    expect(isTeamScoped(user({ permissions: ['approve_leaves'] }))).toBe(false);
  });

  it('is false for Admin, HR and plain teammates', () => {
    expect(isTeamScoped(user({ role: 'Admin' }))).toBe(false);
    expect(isTeamScoped(user({ role: 'HR' }))).toBe(false);
    expect(isTeamScoped(user())).toBe(false);
  });
});