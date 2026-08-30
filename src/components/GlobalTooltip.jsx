import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const DELAY = 110
const OFFSET_X = 10
const OFFSET_Y = 16

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const timerRef = useRef(null)
  const currentTargetRef = useRef(null)

  useEffect(() => {
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

      currentTargetRef.current = target

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (!currentTargetRef.current) return
        const x = e.clientX
        const y = e.clientY
        const tooltipW = 200
        let left = x + OFFSET_X
        let top = y + OFFSET_Y

        if (left + tooltipW > window.innerWidth - 16) {
          left = Math.max(16, x - tooltipW - 8)
        }
        if (top + 45 > window.innerHeight - 16) {
          top = Math.max(12, y - 46)
        }

        setTooltip({
          text,
          left,
          top
        })
      }, DELAY)
    }

    const handleMouseMove = (e) => {
      if (!currentTargetRef.current) return
      const x = e.clientX
      const y = e.clientY
      const tooltipW = 200
      let left = x + OFFSET_X
      let top = y + OFFSET_Y

      if (left + tooltipW > window.innerWidth - 16) {
        left = Math.max(16, x - tooltipW - 8)
      }
      if (top + 45 > window.innerHeight - 16) {
        top = Math.max(12, y - 46)
      }

      setTooltip(prev => (prev ? { ...prev, left, top } : null))
    }

    const handleMouseOut = (e) => {
      const target = e.target.closest?.('[data-tooltip]')
      if (target && target === currentTargetRef.current) {
        clearTimeout(timerRef.current)
        currentTargetRef.current = null
        setTooltip(null)
      }
    }

    const handleHide = () => {
      clearTimeout(timerRef.current)
      currentTargetRef.current = null
      setTooltip(null)
    }

    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseout', handleMouseOut, true)
    document.addEventListener('mousedown', handleHide, true)
    document.addEventListener('scroll', handleHide, true)
    window.addEventListener('blur', handleHide)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseout', handleMouseOut, true)
      document.removeEventListener('mousedown', handleHide, true)
      document.removeEventListener('scroll', handleHide, true)
      window.removeEventListener('blur', handleHide)
    }
  }, [])

  if (!tooltip || !tooltip.text) return null

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[99999] pointer-events-none select-none"
      style={{
        left: `${tooltip.left}px`,
        top: `${tooltip.top}px`,
        animation: 'tooltip-bloom 0.16s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
      }}
    >
      <div className="glass-kormiis glass-tooltip px-4 py-2 whitespace-nowrap text-fluid-sm font-semibold tracking-tight text-foreground select-none pointer-events-none">
        {tooltip.text}
      </div>
    </div>,
    document.body
  )
}
