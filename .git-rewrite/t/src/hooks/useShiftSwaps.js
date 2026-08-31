import { useState } from 'react'

export function useShiftSwaps(shiftSwaps, setShiftSwaps, roster, setRoster, addToast) {
  const pendingSwaps = (shiftSwaps || []).filter(s => s.status === 'Pending')

  const approveSwap = (id) => {
    const swap = (shiftSwaps || []).find(s => s.id === id)
    if (!swap) return
    setRoster(prev => {
      const nr = [...prev]
      const ri = nr.findIndex(r => r.employeeId === swap.requesterId && r.date === swap.date)
      const ti = nr.findIndex(r => r.employeeId === swap.targetId && r.date === swap.date)
      const rs = ri >= 0 ? nr[ri].templateId : 'Off'
      const ts = ti >= 0 ? nr[ti].templateId : 'Off'
      if (ri >= 0) nr[ri].templateId = ts; else nr.push({ employeeId: swap.requesterId, date: swap.date, templateId: ts })
      if (ti >= 0) nr[ti].templateId = rs; else nr.push({ employeeId: swap.targetId, date: swap.date, templateId: rs })
      return nr
    })
    setShiftSwaps(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved' } : s))
    addToast('Shift swap approved and applied.', 'success')
  }

  const rejectSwap = (id) => {
    setShiftSwaps(prev => prev.map(s => s.id === id ? { ...s, status: 'Rejected' } : s))
    addToast('Shift swap rejected.', 'info')
  }

  return { pendingSwaps, approveSwap, rejectSwap }
}
