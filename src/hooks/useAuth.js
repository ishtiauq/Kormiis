import { useState } from 'react'
import { logoutUser } from '../services/auth.js'

// Workspace owner admins are also employees of their own company. Normalising
// their session id to their uid keeps clock-in, leave, payroll and roster
// keyed correctly even for sessions saved before this fix.
function normalizeUser(user) {
  if (!user) return null
  if (user.role === 'Admin' && user.uid && user.companyUid === user.uid) {
    if (!user.id && !user.employeeId) {
      return { ...user, id: user.uid, employeeId: user.uid }
    }
  }
  return user
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kormiis_user')
    return saved ? normalizeUser(JSON.parse(saved)) : null
  })

  const handleLogin = (userInfo) => {
    const normalized = normalizeUser(userInfo)
    setUser(normalized)
    localStorage.setItem('kormiis_user', JSON.stringify(normalized))
    if (normalized?.email) {
      localStorage.setItem('kormiis_last_identifier', normalized.email)
    }
  }

  const handleLogout = async () => {
    setUser(null)
    localStorage.removeItem('kormiis_user')
    try {
      await logoutUser()
    } catch {
      // Ignore background logout errors
    }
  }

  return { user, setUser, handleLogin, handleLogout }
}

