import { useState, useEffect } from 'react'

export function useTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('hr_pulse_theme') || 'system'
  })

  const isDarkMode = themeMode === 'system'
    ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    : themeMode === 'dark'

  const toggleTheme = () => {
    setThemeMode(prev => {
      if (prev === 'system') return 'light'
      if (prev === 'light') return 'dark'
      return 'system'
    })
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('hr_pulse_theme', themeMode)
  }, [themeMode])

  return { themeMode, isDarkMode, toggleTheme }
}
