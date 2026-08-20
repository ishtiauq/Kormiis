import { useState } from 'react'
import { logoutUser } from '../services/auth.js'

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kormiis_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    localStorage.setItem('kormiis_user', JSON.stringify(userInfo))
    if (userInfo?.email) {
      localStorage.setItem('kormiis_last_identifier', userInfo.email)
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

