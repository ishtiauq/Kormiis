import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', action = null) => {
    const id = Date.now() + Math.random()
    setToasts(prev => {
      if (prev.some(t => t.message === message && t.type === type)) return prev
      return [...prev.slice(-5), { id, message, type, action }]
    })
    // Persistent toast standard: Toasts stay active until the user explicitly dismisses them via the cross button
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
