import { useState, useEffect, useRef } from 'react'

export function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key)
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { console.error(`Failed to parse ${key}:`, e) }
    }
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue
  })

  const didInit = useRef(false)
  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return }
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}
