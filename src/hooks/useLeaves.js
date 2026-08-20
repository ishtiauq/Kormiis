export function useLeaves(attendance, setAttendance, addToast, addNotification) {
  const leaves = attendance.leaves || []
  const balances = attendance.balances || {}
  const pendingLeaves = leaves.filter(l => l.status === 'Pending')
  const historyLeaves = leaves.filter(l => l.status !== 'Pending')

  const approveLeave = (id) => {
    const targetLeave = (attendance.leaves || []).find(l => l.id === id)
    setAttendance(prev => ({ ...prev, leaves: (prev.leaves || []).map(l => l.id === id ? { ...l, status: 'Approved' } : l) }))
    addToast('Leave request approved.', 'success')
    if (addNotification && targetLeave) {
      addNotification(`Your leave request (${targetLeave.leaveType || 'Leave'}) was approved`, 'leaves', { 
        title: 'Leave Approved', 
        category: 'leave', 
        targetEmployeeIds: [targetLeave.employeeId] 
      })
    }
  }

  const rejectLeave = (id) => {
    const targetLeave = (attendance.leaves || []).find(l => l.id === id)
    setAttendance(prev => ({ ...prev, leaves: (prev.leaves || []).map(l => l.id === id ? { ...l, status: 'Rejected' } : l) }))
    addToast('Leave request rejected.', 'info')
    if (addNotification && targetLeave) {
      addNotification(`Your leave request (${targetLeave.leaveType || 'Leave'}) was rejected`, 'leaves', { 
        title: 'Leave Rejected', 
        category: 'leave', 
        targetEmployeeIds: [targetLeave.employeeId] 
      })
    }
  }

  return { leaves, pendingLeaves, historyLeaves, balances, approveLeave, rejectLeave, pendingCount: pendingLeaves.length }
}
