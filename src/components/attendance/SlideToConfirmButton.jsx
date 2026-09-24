import { useRef, useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"

const THUMB = 56
const PAD = 6

/**
 * Slide-to-confirm action control. The user drags the thumb to the right end of
 * the rail to fire `onConfirm`; releasing early springs it back. The rail always
 * shows both Check In / Check Out labels with their recorded times. Works for
 * both actions (the `action` prop flips the label + accent); keyboard users can
 * press Enter/Space to confirm.
 */
export default function SlideToConfirmButton({
  action = 'in',
  onConfirm,
  busy = false,
  disabled = false,
  checkIn = '—',
  checkOut = '—',
}) {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const fillRef = useRef(null)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  const isIn = action === 'in'
  const accent = isIn ? '#10b981' : '#f43f5e'
  const accentSoft = isIn ? 'rgba(16, 185, 129, 0.20)' : 'rgba(244, 63, 94, 0.20)'
  const label = isIn ? 'Check In' : 'Check Out'

  const paint = (p) => {
    const track = trackRef.current
    if (!track) return
    const max = track.clientWidth - THUMB - PAD * 2
    const x = Math.max(0, Math.min(1, p)) * max
    if (thumbRef.current) thumbRef.current.style.transform = `translateX(${x}px)`
    if (fillRef.current) fillRef.current.style.width = `${PAD + x + THUMB}px`
  }

  const reset = useCallback(() => {
    draggingRef.current = false
    setDragging(false)
    setProgress(0)
    if (thumbRef.current) thumbRef.current.style.transition = 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)'
    if (fillRef.current) fillRef.current.style.transition = 'width 260ms ease'
    paint(0)
    const t = setTimeout(() => {
      if (thumbRef.current) thumbRef.current.style.transition = ''
      if (fillRef.current) fillRef.current.style.transition = ''
    }, 280)
    return () => clearTimeout(t)
  }, [])

  // Reset whenever the action flips or a busy cycle finishes.
  useEffect(() => { reset() }, [action, reset])
  useEffect(() => { if (!busy) reset() }, [busy, reset])

  const onDown = (e) => {
    if (disabled || busy) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    draggingRef.current = true
    setDragging(true)
    startXRef.current = e.clientX
    if (thumbRef.current) thumbRef.current.style.transition = 'none'
    if (fillRef.current) fillRef.current.style.transition = 'none'
  }

  const onMove = (e) => {
    if (!draggingRef.current) return
    const track = trackRef.current
    if (!track) return
    const max = track.clientWidth - THUMB - PAD * 2
    const p = max > 0 ? Math.max(0, Math.min(1, (e.clientX - startXRef.current) / max)) : 0
    setProgress(p)
    paint(p)
    if (p >= 0.98) {
      draggingRef.current = false
      setDragging(false)
      try { navigator.vibrate?.(30) } catch { /* ignore */ }
      onConfirm?.()
    }
  }

  const onUp = () => {
    if (!draggingRef.current) return
    if (progress >= 0.85) {
      draggingRef.current = false
      setDragging(false)
      try { navigator.vibrate?.(30) } catch { /* ignore */ }
      onConfirm?.()
    } else {
      reset()
    }
  }

  const confirmNow = () => {
    if (disabled || busy) return
    try { navigator.vibrate?.(30) } catch { /* ignore */ }
    onConfirm?.()
  }

  const isDisabled = disabled || busy

  return (
    <button
      ref={trackRef}
      type="button"
      aria-label={`Slide to ${label}`}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
          e.preventDefault()
          confirmNow()
        }
      }}
      className={`relative w-full h-16 rounded-2xl border border-black/10 dark:border-white/12 bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden select-none touch-none ${
        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Progress fill */}
      <span
        ref={fillRef}
        aria-hidden="true"
        className="absolute left-0 top-0 h-full rounded-2xl"
        style={{ width: `${PAD}px`, background: accentSoft }}
      />

      {/* Dual labels + recorded times + slide instruction */}
      <span className="absolute inset-0 flex items-center justify-between gap-3 pl-16 pr-4 pointer-events-none">
        <span className="flex flex-col items-start min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Check In</span>
          <span className="text-sm font-mono font-semibold text-foreground truncate">{checkIn || '—'}</span>
        </span>

        <span
          className="flex-1 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground truncate"
          style={{ opacity: 1 - progress }}
        >
          Slide to {label}
        </span>

        <span className="flex flex-col items-end text-right min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Check Out</span>
          <span className="text-sm font-mono font-semibold text-foreground truncate">{checkOut || '—'}</span>
        </span>
      </span>

      {/* Draggable thumb */}
      <span
        ref={thumbRef}
        className="absolute z-10 will-change-transform"
        style={{ top: '50%', marginTop: -(THUMB / 2), left: PAD, width: THUMB, height: THUMB }}
      >
        <span
          className="flex items-center justify-center rounded-xl text-white shadow-none"
          style={{
            width: THUMB,
            height: THUMB,
            background: accent,
            transform: dragging ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {busy
            ? <Icon name="progress_activity" size={22} className="animate-spin" />
            : <Icon name={isIn ? 'login' : 'logout'} size={22} />}
        </span>
      </span>
    </button>
  )
}
