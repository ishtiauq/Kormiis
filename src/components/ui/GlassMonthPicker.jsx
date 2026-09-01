import React, { useState, useRef, useEffect } from 'react'
import Icon from './Icon.jsx'

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
]

export default function GlassMonthPicker({
  value,
  onChange,
  className = '',
  align = 'right',
  showQuickNav = true,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Current real-world date
  const now = new Date()
  const currentRealYear = now.getFullYear()
  const currentRealMonth = now.getMonth() // 0-11
  const realCurrentKey = `${currentRealYear}-${String(currentRealMonth + 1).padStart(2, '0')}`

  const [selectedYear, selectedMonthIndex] = (() => {
    if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number)
      return [y, m - 1]
    }
    return [currentRealYear, currentRealMonth]
  })()

  const [viewYear, setViewYear] = useState(selectedYear)

  useEffect(() => {
    setViewYear(selectedYear)
  }, [selectedYear])

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelectMonth = (monthIdx) => {
    const formatted = `${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`
    if (onChange) {
      onChange({ target: { value: formatted } })
    }
    setIsOpen(false)
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation()
    let y = selectedYear
    let m = selectedMonthIndex - 1
    if (m < 0) {
      m = 11
      y -= 1
    }
    const formatted = `${y}-${String(m + 1).padStart(2, '0')}`
    if (onChange) onChange({ target: { value: formatted } })
  }

  const handleNextMonth = (e) => {
    e.stopPropagation()
    let y = selectedYear
    let m = selectedMonthIndex + 1
    if (m > 11) {
      m = 0
      y += 1
    }
    const formatted = `${y}-${String(m + 1).padStart(2, '0')}`
    if (onChange) onChange({ target: { value: formatted } })
  }

  const handleSetThisMonth = () => {
    if (onChange) {
      onChange({ target: { value: realCurrentKey } })
    }
    setViewYear(currentRealYear)
    setIsOpen(false)
  }

  const activeMonthLabel = SHORT_MONTHS[selectedMonthIndex] || SHORT_MONTHS[0]

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Quick Prev Month Button */}
      {showQuickNav && (
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={disabled}
          title="Previous Month"
          className="size-9 rounded-2xl glass-kormiis liquid-glass-btn flex items-center justify-center text-foreground/80 hover:text-foreground transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="chevron_left" size={17} />
        </button>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className={`group h-9 px-3.5 rounded-2xl glass-kormiis liquid-glass-btn transition-all duration-200 flex items-center gap-2 select-none cursor-pointer active:scale-[0.98] shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'ring-2 ring-primary/40 border-primary/50' : ''
        }`}
      >
        <Icon name="calendar_month" size={18} className="text-foreground shrink-0 transition-transform group-hover:scale-105" />

        <span className="text-fluid-xs font-bold tracking-tight text-foreground whitespace-nowrap">
          {activeMonthLabel} <span className="tabular-nums font-semibold text-muted-foreground ml-0.5">{selectedYear}</span>
        </span>

        <Icon
          name="keyboard_arrow_down"
          size={15}
          className={`text-muted-foreground group-hover:text-foreground transition-transform duration-300 ml-0.5 shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Quick Next Month Button */}
      {showQuickNav && (
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={disabled}
          title="Next Month"
          className="size-9 rounded-2xl glass-kormiis liquid-glass-btn flex items-center justify-center text-foreground/80 hover:text-foreground transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="chevron_right" size={17} />
        </button>
      )}

      {/* Apple Liquid Glass Dropdown Popover */}
      {isOpen && (
        <div
          className={`glass-kormiis absolute top-full mt-2 z-50 w-[270px] sm:w-[285px] p-4 text-foreground shadow-none animate-in fade-in-0 zoom-in-95 duration-200 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Header with Year Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-border/80 dark:border-white/12">
            <button
              type="button"
              onClick={() => setViewYear(v => v - 1)}
              className="size-7.5 rounded-xl liquid-glass-btn flex items-center justify-center text-foreground hover:text-primary transition-colors cursor-pointer active:scale-90"
              title="Previous Year"
            >
              <Icon name="chevron_left" size={15} />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-fluid-sm font-black text-foreground tabular-nums tracking-tight">
                {viewYear}
              </span>
              {viewYear === currentRealYear && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Current
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewYear(v => v + 1)}
              className="size-7.5 rounded-xl liquid-glass-btn flex items-center justify-center text-foreground hover:text-primary transition-colors cursor-pointer active:scale-90"
              title="Next Year"
            >
              <Icon name="chevron_right" size={15} />
            </button>
          </div>

          {/* 12 Months Compact Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-3">
            {SHORT_MONTHS.map((shortMonth, idx) => {
              const isSelected = selectedYear === viewYear && selectedMonthIndex === idx
              const isRealThisMonth = currentRealYear === viewYear && currentRealMonth === idx

              return (
                <button
                  key={shortMonth}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`group relative h-9.5 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border select-none ${
                    isSelected
                      ? 'bg-primary text-white font-black border-primary scale-[1.03]'
                      : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-foreground hover:text-primary border-black/[0.06] dark:border-white/10 hover:border-primary/30 font-bold text-fluid-xs'
                  }`}
                >
                  <span className={`text-fluid-xs tracking-tight ${isSelected ? 'font-black text-white' : 'font-bold text-foreground group-hover:text-primary'}`}>
                    {shortMonth}
                  </span>

                  {isRealThisMonth && !isSelected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer Actions (Liquid Glass Buttons) */}
          <div className="flex items-center justify-between pt-3 border-t border-border/80 dark:border-white/12">
            <button
              type="button"
              onClick={handleSetThisMonth}
              className="liquid-glass-btn h-8 px-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1.5 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Icon name="today" size={13} />
              <span>Current Month</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="liquid-glass-btn h-8 px-3.5 rounded-full text-foreground border border-border/80 dark:border-white/12 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
