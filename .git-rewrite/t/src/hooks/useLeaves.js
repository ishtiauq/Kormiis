import { useState } from 'react'

export function useLeaves(attendance, setAttendance, addToast) {
  const leaves = attendance.leaves || []
  const balances = attendance.balances || {}
  const pendingLeaves = leaves.filter(l => l.status === 'Pending')
  const historyLeaves = leaves.filter(l => l.status !== 'Pending')

  const approveLeave = (id) => {
    setAttendance(prev => ({ ...prev, leaves: (prev.leaves || []).map(l => l.id === id ? { ...l, status: 'Approved' } : l) }))
    addToast('Leave request approved.', 'success')
  }

  const rejectLeave = (id) => {
    setAttendance(prev => ({ ...prev, leaves: (prev.leaves || []).map(l => l.id === id ? { ...l, status: 'Rejected' } : l) }))
    addToast('Leave request rejected.', 'info')
  }

  return { leaves, pendingLeaves, historyLeaves, balances, approveLeave, rejectLeave, pendingCount: pendingLeaves.length }
}
