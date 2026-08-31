import { useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hr_pulse_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    localStorage.setItem('hr_pulse_user', JSON.stringify(userInfo))
    if (!userInfo.isEmployee && userInfo.token) {
      sessionStorage.setItem('hr_pulse_hr_token', userInfo.token)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('hr_pulse_user')
    sessionStorage.removeItem('hr_pulse_hr_token')
  }

  return { user, setUser, handleLogin, handleLogout }
}
