export function useOvertime(overtimeClaims, setOvertimeClaims, addToast) {
  const pendingOvertime = (overtimeClaims || []).filter(c => c.status === 'Pending')
  const historyOvertime = (overtimeClaims || []).filter(c => c.status !== 'Pending')

  const approveOvertime = (id) => {
    setOvertimeClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'Approved' } : c))
    addToast('Overtime claim approved.', 'success')
  }

  const rejectOvertime = (id) => {
    setOvertimeClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'Rejected' } : c))
    addToast('Overtime claim rejected.', 'info')
  }

  return { pendingOvertime, historyOvertime, approveOvertime, rejectOvertime }
}
