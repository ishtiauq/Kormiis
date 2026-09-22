import { describe, it, expect } from 'vitest';
import { normalizeRole, hasPermission, can, isTeamScoped } from './permissions.js';

const user = (over = {}) => ({ role: 'Teammate', permissions: [], ...over });

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

  it('gives HR everything except settings', () => {
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

  it('keeps teammate base modules and honours custom grants', () => {
    const teammate = user({ permissions: ['employees'] });
    expect(hasPermission(teammate, 'dashboard')).toBe(true);
    expect(hasPermission(teammate, 'settings')).toBe(true);
    expect(hasPermission(teammate, 'payroll')).toBe(false);
    expect(hasPermission(teammate, 'employees')).toBe(true);
  });

  it('resolves view aliases', () => {
    expect(hasPermission(user({ role: 'Manager' }), 'my-attendance')).toBe(true);
    expect(hasPermission(user({ role: 'Manager' }), 'wellbeing')).toBe(true);
  });
});

describe('can', () => {
  it('grants approver capabilities to Admin/HR/Manager', () => {
    expect(can(user({ role: 'Admin' }), 'approve_leaves')).toBe(true);
    expect(can(user({ role: 'HR' }), 'approve_expenses')).toBe(true);
    expect(can(user({ role: 'Manager' }), 'approve_leaves')).toBe(true);
  });

  it('denies Manager expense approval and plain teammates', () => {
    expect(can(user({ role: 'Manager' }), 'approve_expenses')).toBe(false);
    expect(can(user(), 'approve_leaves')).toBe(false);
  });

  it('honours explicit capability grants', () => {
    expect(can(user({ permissions: ['approve_leaves'] }), 'approve_leaves')).toBe(true);
  });
});

describe('isTeamScoped', () => {
  it('is true for Manager and granted approvers', () => {
    expect(isTeamScoped(user({ role: 'Manager' }))).toBe(true);
    expect(isTeamScoped(user({ permissions: ['approve_leaves'] }))).toBe(true);
  });

  it('is false for Admin, HR and plain teammates', () => {
    expect(isTeamScoped(user({ role: 'Admin' }))).toBe(false);
    expect(isTeamScoped(user({ role: 'HR' }))).toBe(false);
    expect(isTeamScoped(user())).toBe(false);
  });
});
