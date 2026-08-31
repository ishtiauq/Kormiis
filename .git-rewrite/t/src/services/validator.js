/**
 * Data Integrity Validator
 * Runs on app load to ensure database relations and business logic are sound.
 */

export function validateDatabase(employees = [], attendanceLogs = {}, leaveRequests = [], payroll = {}, expenses = []) {
  const issues = [];
  const empIds = new Set();
  const empEmails = new Set();

  // 1. Employees Validation
  employees.forEach(emp => {
    if (empIds.has(emp.id)) {
      issues.push(`Duplicate employee ID detected: ${emp.id}`);
    }
    empIds.add(emp.id);

    if (emp.email) {
      if (empEmails.has(emp.email)) {
        issues.push(`Duplicate email detected: ${emp.email}`);
      }
      empEmails.add(emp.email);
    }
  });

  // 2. Leave Validation
  if (Array.isArray(leaveRequests)) {
    const approvedLeavesByEmp = {};
    leaveRequests.forEach(leave => {
      if (!empIds.has(leave.employeeId)) {
        issues.push(`Orphaned leave request (${leave.id}) for non-existent employee: ${leave.employeeId}`);
      }

      if (leave.status === 'Approved') {
        if (!approvedLeavesByEmp[leave.employeeId]) {
          approvedLeavesByEmp[leave.employeeId] = [];
        }
        
        const start = new Date(leave.startDate).getTime();
        const end = new Date(leave.endDate).getTime();
        
        // Check overlap
        approvedLeavesByEmp[leave.employeeId].forEach(existingLeave => {
          if (start <= existingLeave.end && end >= existingLeave.start) {
            issues.push(`Overlapping approved leaves for employee ${leave.employeeId} between ${leave.startDate} and ${leave.endDate}`);
          }
        });
        
        approvedLeavesByEmp[leave.employeeId].push({ start, end });
      }
    });
  }

  // 3. Attendance Logs Validation
  if (attendanceLogs && typeof attendanceLogs === 'object') {
    Object.keys(attendanceLogs).forEach(date => {
      const logs = attendanceLogs[date];
      if (logs && typeof logs === 'object') {
        Object.keys(logs).forEach(empId => {
          if (!empIds.has(empId)) {
            issues.push(`Orphaned attendance record on ${date} for non-existent employee: ${empId}`);
          }
        });
      }
    });
  }

  // 4. Payroll Validation
  if (payroll && typeof payroll === 'object') {
    Object.keys(payroll).forEach(month => {
      const records = payroll[month];
      if (Array.isArray(records)) {
        records.forEach(record => {
          if (!empIds.has(record.employeeId)) {
            issues.push(`Orphaned payroll record in ${month} for non-existent employee: ${record.employeeId}`);
          }
          if (record.grossSalary < 0) {
            issues.push(`Invalid negative salary in ${month} for employee: ${record.employeeId}`);
          }
        });
      }
    });
  }

  // 5. Expenses Validation
  if (Array.isArray(expenses)) {
    expenses.forEach(exp => {
      if (!empIds.has(exp.employeeId)) {
        issues.push(`Orphaned expense (${exp.id}) for non-existent employee: ${exp.employeeId}`);
      }
      if (exp.amount < 0) {
        issues.push(`Invalid negative expense amount for expense: ${exp.id}`);
      }
    });
  }

  return issues;
}
