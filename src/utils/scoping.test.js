import { describe, it, expect } from 'vitest';
import { scopeEmployees, scopeByEmployeeDepartment, managedDepartment, directReports } from './scoping.js';

const employees = [
  { id: 'E1', name: 'A', department: 'Engineering' },
  { id: 'E2', name: 'B', department: 'Engineering' },
  { id: 'E3', name: 'C', department: 'Sales' },
];

describe('scopeEmployees', () => {
  it('returns everyone for Admin and HR', () => {
    expect(scopeEmployees(employees, { role: 'Admin' })).toHaveLength(3);
    expect(scopeEmployees(employees, { role: 'HR' })).toHaveLength(3);
  });

  it('filters Manager to their own department, keeping self', () => {
    const manager = { role: 'Manager', department: 'Engineering', employeeId: 'E9' }
    const result = scopeEmployees(employees, manager)
    expect(result.map(e => e.id)).toEqual(['E1', 'E2'])
  });

  it('keeps the acting user even outside their department', () => {
    const manager = { role: 'Manager', department: 'Sales', employeeId: 'E1' }
    const result = scopeEmployees(employees, manager)
    expect(result.map(e => e.id)).toEqual(['E1', 'E3'])
  });

  it('prefers the explicit reporting line over department', () => {
    const roster = [
      { id: 'M1', name: 'Manager', department: 'Engineering' },
      { id: 'E1', name: 'A', department: 'Engineering', reportsTo: 'M1' },
      { id: 'E2', name: 'B', department: 'Engineering' },
      { id: 'E3', name: 'C', department: 'Sales', reportsTo: 'M1' },
    ]
    const manager = { role: 'Manager', department: 'Engineering', employeeId: 'M1' }
    const result = scopeEmployees(roster, manager)
    expect(result.map(e => e.id)).toEqual(['M1', 'E1', 'E3'])
  });
});

describe('directReports', () => {
  it('matches reportsTo against employeeId, id or uid', () => {
    const roster = [
      { id: 'E1', reportsTo: 'M1' },
      { id: 'E2', reportsTo: 'M2' },
      { id: 'E3', managerId: 'M1' },
    ]
    expect(directReports(roster, { employeeId: 'M1' }).map(e => e.id)).toEqual(['E1', 'E3'])
    expect(directReports(roster, { uid: 'M2' }).map(e => e.id)).toEqual(['E2'])
  });
});

describe('scopeByEmployeeDepartment', () => {
  it('passes records through unchanged for unscoped users', () => {
    const records = [{ employeeId: 'E1' }, { employeeId: 'E3' }]
    expect(scopeByEmployeeDepartment(records, employees, { role: 'Admin' }, r => r.employeeId)).toHaveLength(2)
  })

  it('drops other-department records for managers', () => {
    const records = [{ employeeId: 'E1' }, { employeeId: 'E3' }]
    const manager = { role: 'Manager', department: 'Engineering' }
    expect(scopeByEmployeeDepartment(records, employees, manager, r => r.employeeId)).toHaveLength(1)
  })
})

describe('managedDepartment', () => {
  it('is null for unscoped roles and the department otherwise', () => {
    expect(managedDepartment({ role: 'Admin', department: 'Engineering' })).toBe(null)
    expect(managedDepartment({ role: 'Manager', department: 'Engineering' })).toBe('Engineering')
  })
})
