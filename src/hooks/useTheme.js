import { useState, useEffect, useLayoutEffect } from 'react'

export function useTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('kormiis_theme')
    if (saved === 'system') return 'light'
    return saved || 'light'
  })

  const isDarkMode = themeMode === 'dark'

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light')
  }

  // useLayoutEffect so the class flip happens BEFORE paint: the new theme is
  // applied in a single frame with transitions disabled (instant, no choppy
  // per-element animation). The class is removed on the next frame.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-changing')
    if (isDarkMode) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => root.classList.remove('theme-changing'))
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('kormiis_theme', themeMode)
  }, [themeMode])

  return { themeMode, isDarkMode, toggleTheme, setThemeMode }
}
