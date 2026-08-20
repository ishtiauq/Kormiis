import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Icon from "@/components/ui/Icon.jsx"

const Wheel = ({ items, value, onChange, label }) => {
  const containerRef = useRef(null)
  const isUserInteracting = useRef(false)
  const scrollTimeout = useRef(null)
  const itemHeight = 44 // px

  // Sync scroll position when value changes from external state (e.g. manual input or open)
  useEffect(() => {
    if (!isUserInteracting.current && containerRef.current) {
      const index = items.indexOf(value)
      if (index >= 0) {
        containerRef.current.scrollTo({
          top: index * itemHeight,
          behavior: 'smooth'
        })
      }
    }
  }, [value, items])

  const handleScroll = () => {
    isUserInteracting.current = true
    clearTimeout(scrollTimeout.current)

    // Debounce state update to settle smoothly on snap target without re-rendering on every pixel
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return
      const scrollTop = containerRef.current.scrollTop
      const index = Math.max(0, Math.min(items.length - 1, Math.round(scrollTop / itemHeight)))
      if (items[index] && items[index] !== value) {
        onChange(items[index])
      }
      isUserInteracting.current = false
    }, 90)
  }

  const handleItemClick = (item, index) => {
    isUserInteracting.current = true
    onChange(item)
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      })
    }
    setTimeout(() => {
      isUserInteracting.current = false
    }, 250)
  }

  return (
    <div className="flex flex-col items-center flex-1 relative min-w-0">
      <span className="text-[11px] text-muted-foreground dark:text-white/60 uppercase tracking-wider font-bold mb-2 select-none">
        {label}
      </span>
      
      <div className="relative w-full h-[132px] overflow-hidden rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40 dark:border-white/10">
        {/* Apple Barrel Glass Vignette Gradients */}
        <div className="absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-card dark:from-[#13141f] via-card/70 dark:via-[#13141f]/70 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-card dark:from-[#13141f] via-card/70 dark:via-[#13141f]/70 to-transparent pointer-events-none z-10" />

        {/* Selection Center Highlight Bar */}
        <div className="absolute top-[44px] left-1 right-1 h-[44px] bg-primary/10 dark:bg-primary/20 border-y border-primary/25 dark:border-primary/40 pointer-events-none rounded-xl z-0 shadow-xs" />

        {/* Scrollable Container */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          onTouchStart={() => { isUserInteracting.current = true }}
          onMouseDown={() => { isUserInteracting.current = true }}
          className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative overscroll-contain"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ height: `${itemHeight}px` }} /> {/* Top Spacer */}
          {items.map((item, index) => {
            const isSelected = value === item
            return (
              <div 
                key={item} 
                onClick={() => handleItemClick(item, index)}
                className={`h-[44px] flex items-center justify-center snap-center text-lg font-bold font-sans tabular-nums transition-all duration-150 cursor-pointer select-none ${
                  isSelected 
                    ? 'text-primary dark:text-primary scale-110 font-extrabold drop-shadow-[0_0_10px_rgba(255,87,34,0.35)]' 
                    : 'text-muted-foreground/40 dark:text-white/30 hover:text-muted-foreground/80 dark:hover:text-white/70 scale-95'
                }`}
              >
                {item}
              </div>
            )
          })}
          <div style={{ height: `${itemHeight}px` }} /> {/* Bottom Spacer */}
        </div>
      </div>
    </div>
  )
}

function parseTimeString(raw) {
  if (!raw) return null
  const str = raw.trim().toUpperCase()
  
  // 12h format e.g. "09:30 AM", "9:30 PM", "9:30AM", "9:30"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = parseInt(match12[2], 10)
    let period = match12[3]

    if (minutes < 0 || minutes > 59) return null

    if (!period) {
      if (hours >= 13 && hours <= 23) {
        hours -= 12
        period = 'PM'
      } else if (hours === 12) {
        period = 'PM'
      } else if (hours === 0) {
        hours = 12
        period = 'AM'
      } else if (hours >= 1 && hours <= 11) {
        period = 'AM'
      } else {
        return null
      }
    } else {
      if (hours < 1 || hours > 12) return null
    }

    return {
      h: hours.toString().padStart(2, '0'),
      m: minutes.toString().padStart(2, '0'),
      ampm: period || 'AM'
    }
  }

  // 24h format e.g. "14:30" or "09:15"
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    const hours = parseInt(match24[1], 10)
    const minutes = parseInt(match24[2], 10)
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
    const h12 = hours % 12 || 12
    const p = hours >= 12 ? 'PM' : 'AM'
    return {
      h: h12.toString().padStart(2, '0'),
      m: minutes.toString().padStart(2, '0'),
      ampm: p
    }
  }

  return null
}

export function GlassTimePicker({ time, onTimeChange, isOpen, setIsOpen, label }) {
  const [h, setH] = useState('09')
  const [m, setM] = useState('00')
  const [ampm, setAmpm] = useState('AM')
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (time && time !== '--') {
        const [t, p] = time.split(' ')
        const [hh, mm] = (t || '').split(':')
        const finalH = hh ? hh.padStart(2, '0') : '09'
        const finalM = mm ? mm.padStart(2, '0') : '00'
        const finalP = p || 'AM'
        setH(finalH)
        setM(finalM)
        setAmpm(finalP)
        setManualInput(`${finalH}:${finalM} ${finalP}`)
      } else {
        const now = new Date()
        let hr = now.getHours()
        const min = now.getMinutes().toString().padStart(2, '0')
        const period = hr >= 12 ? 'PM' : 'AM'
        hr = hr % 12 || 12
        const hrStr = hr.toString().padStart(2, '0')
        setH(hrStr)
        setM(min)
        setAmpm(period)
        setManualInput(`${hrStr}:${min} ${period}`)
      }
    }
  }, [time, isOpen])

  const handleWheelChange = (type, val) => {
    let newH = h
    let newM = m
    let newAmpm = ampm

    if (type === 'h') newH = val
    if (type === 'm') newM = val
    if (type === 'ampm') newAmpm = val

    if (type === 'h') setH(val)
    if (type === 'm') setM(val)
    if (type === 'ampm') setAmpm(val)

    setManualInput(`${newH}:${newM} ${newAmpm}`)
  }

  const handleManualChange = (e) => {
    const val = e.target.value
    setManualInput(val)

    const parsed = parseTimeString(val)
    if (parsed) {
      setH(parsed.h)
      setM(parsed.m)
      setAmpm(parsed.ampm)
    }
  }

  const handleSetCurrentTime = () => {
    const now = new Date()
    let hr = now.getHours()
    const min = now.getMinutes().toString().padStart(2, '0')
    const period = hr >= 12 ? 'PM' : 'AM'
    hr = hr % 12 || 12
    const hrStr = hr.toString().padStart(2, '0')
    setH(hrStr)
    setM(min)
    setAmpm(period)
    setManualInput(`${hrStr}:${min} ${period}`)
  }

  const handleSave = () => {
    const parsed = parseTimeString(manualInput)
    if (parsed) {
      onTimeChange(`${parsed.h}:${parsed.m} ${parsed.ampm}`)
    } else {
      onTimeChange(`${h}:${m} ${ampm}`)
    }
    setIsOpen(false)
  }

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  const ampmList = ['AM', 'PM']

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[360px] bg-card dark:bg-[#12131c]/90 text-card-foreground border border-border/80 dark:border-white/12 shadow-2xl rounded-3xl p-6 outline-none animate-in fade-in zoom-in-95 duration-200 backdrop-blur-3xl">
        <DialogTitle className="text-center text-lg font-bold flex items-center justify-center gap-2 mb-4 headline-gradient">
          <Icon name="schedule" className="text-primary" size={20}/> {label || 'Select Time'}
        </DialogTitle>

        {/* Wheel Columns */}
        <div className="bg-muted/20 dark:bg-white/[0.02] border border-border/80 dark:border-white/10 rounded-2xl p-3.5 mb-4 flex items-center gap-2 shadow-inner">
          <Wheel items={hoursList} value={h} onChange={(val) => handleWheelChange('h', val)} label="Hour" />
          <div className="text-2xl font-black text-muted-foreground/40 dark:text-white/30 flex items-center justify-center mt-5 mb-0 select-none">:</div>
          <Wheel items={minutesList} value={m} onChange={(val) => handleWheelChange('m', val)} label="Minute" />
          <div className="w-px h-24 bg-border/60 dark:bg-white/10 mt-5 mx-1" />
          <Wheel items={ampmList} value={ampm} onChange={(val) => handleWheelChange('ampm', val)} label="Period" />
        </div>
        
        {/* Direct Interactive Time Input Box */}
        <div className="flex justify-between items-center gap-2 mb-6 p-2.5 px-3.5 rounded-2xl bg-primary/5 dark:bg-white/[0.04] border border-primary/20 dark:border-white/12 transition-all shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon name="edit" size={16} className="text-primary/70 dark:text-primary shrink-0" />
            <input
              type="text"
              value={manualInput}
              onChange={handleManualChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
              placeholder="09:00 AM"
              title="Click to type time directly (e.g. 09:30 AM or 17:00)"
              aria-label="Direct time input"
              className="w-full !bg-transparent text-2xl font-black font-sans tracking-tight text-foreground dark:!text-white tabular-nums !border-none !outline-none !shadow-none p-0 m-0 bg-transparent"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={handleSetCurrentTime}
              className="h-8 px-2.5 rounded-xl text-xs font-bold text-muted-foreground dark:text-white/70 hover:text-primary dark:hover:text-primary hover:bg-primary/10 gap-1"
              title="Set to Current Time"
            >
              <Icon name="history" size={14} /> Now
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl h-11 dark:border-white/12 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/80" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-2xl h-11 shadow-sm font-bold active:scale-95 transition-transform" onClick={handleSave}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
