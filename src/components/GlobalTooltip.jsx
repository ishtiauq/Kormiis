import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const DELAY = 110
const HIDE_MS = 140
const OFFSET_X = 12
const OFFSET_Y = 18

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const rafRef = useRef(null)
  const currentTargetRef = useRef(null)

  useEffect(() => {
    const place = (x, y) => {
      const tooltipW = 200
      let left = x + OFFSET_X
      let top = y + OFFSET_Y
      if (left + tooltipW > window.innerWidth - 16) {
        left = Math.max(16, x - tooltipW - 8)
      }
      if (top + 48 > window.innerHeight - 16) {
        top = Math.max(12, y - 48)
      }
      return { left, top }
    }

    const handleMouseOver = (e) => {
      const target = e.target.closest?.('[title], [data-tooltip]')
      if (!target) return

      // Extract text
      let text = target.getAttribute('data-tooltip')
      if (!text && target.hasAttribute('title')) {
        text = target.getAttribute('title')
        if (text) {
          // Transfer title to data-tooltip so native browser OS tooltip is completely suppressed
          target.setAttribute('data-tooltip', text)
          target.removeAttribute('title')
        }
      }

      if (!text || !text.trim()) return

      // Suppress redundant/obvious tooltips (e.g., Close, Dismiss, Cancel buttons)
      const normalized = text.trim().toLowerCase()
      if (/^(close|close\b.*|dismiss|cancel)$/i.test(normalized)) {
        return
      }

      currentTargetRef.current = target
      clearTimeout(timerRef.current)
      clearTimeout(hideTimerRef.current)

      const { left, top } = place(e.clientX, e.clientY)
      timerRef.current = setTimeout(() => {
        if (!currentTargetRef.current) return
        setTooltip({ text, left, top })
        requestAnimationFrame(() => setVisible(true))
      }, DELAY)
    }

    const handleMouseMove = (e) => {
      if (!currentTargetRef.current || rafRef.current) return
      const { clientX, clientY } = e
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const { left, top } = place(clientX, clientY)
        setTooltip(prev => (prev ? { ...prev, left, top } : null))
      })
    }

    const hide = () => {
      clearTimeout(timerRef.current)
      currentTargetRef.current = null
      setVisible(false)
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setTooltip(null), HIDE_MS)
    }

    const handleMouseOut = (e) => {
      const target = e.target.closest?.('[data-tooltip]')
      if (target && target === currentTargetRef.current) hide()
    }

    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseout', handleMouseOut, true)
    document.addEventListener('mousedown', hide, true)
    document.addEventListener('scroll', hide, true)
    window.addEventListener('blur', hide)

    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(hideTimerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseout', handleMouseOut, true)
      document.removeEventListener('mousedown', hide, true)
      document.removeEventListener('scroll', hide, true)
      window.removeEventListener('blur', hide)
    }
  }, [])

  if (!tooltip || !tooltip.text) return null

  return createPortal(
    <div
      className={`global-tooltip fixed top-0 left-0 z-[99999] pointer-events-none select-none ${visible ? 'is-visible' : ''}`}
      style={{ transform: `translate3d(${tooltip.left}px, ${tooltip.top}px, 0)` }}
    >
      <div
        role="tooltip"
        className="glass-tooltip rounded-[10px] px-3 py-1.5 whitespace-nowrap text-xs font-medium tracking-tight select-none pointer-events-none"
      >
        {tooltip.text}
      </div>
    </div>,
    document.body
  )
}
