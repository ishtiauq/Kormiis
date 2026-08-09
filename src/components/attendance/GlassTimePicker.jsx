import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Icon from "@/components/ui/Icon.jsx"

const Wheel = ({ items, value, onChange, label }) => {
  const containerRef = useRef(null)
  const isScrolling = useRef(false)
  const scrollTimeout = useRef(null)
  const itemHeight = 44 // px

  useEffect(() => {
    if (!isScrolling.current && containerRef.current) {
      const index = items.indexOf(value)
      if (index >= 0) {
        containerRef.current.scrollTop = index * itemHeight
      }
    }
  }, [value, items])

  const handleScroll = (e) => {
    isScrolling.current = true
    clearTimeout(scrollTimeout.current)
    
    const scrollTop = e.target.scrollTop
    const index = Math.round(scrollTop / itemHeight)
    if (items[index] && items[index] !== value) {
      onChange(items[index])
    }

    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false
      // Ensure perfect snap visually in state
      const exactIndex = Math.round(e.target.scrollTop / itemHeight)
      if (items[exactIndex] && items[exactIndex] !== value) {
        onChange(items[exactIndex])
      }
    }, 150)
  }

  return (
    <div className="flex flex-col items-center flex-1 relative">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">{label}</span>
      
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[132px] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative"
        style={{ scrollBehavior: isScrolling.current ? 'auto' : 'smooth' }}
      >
        {/* Selection Highlight (Center) */}
        <div className="absolute top-[44px] left-0 right-0 h-[44px] bg-primary/10 border-y border-primary/20 pointer-events-none rounded-md" />

        <div style={{ height: `${itemHeight}px` }} /> {/* Top padding */}
        {items.map((item) => (
          <div 
            key={item} 
            className={`h-[44px] flex items-center justify-center snap-center text-xl font-black font-sans tabular-nums transition-all ${value === item ? 'text-primary scale-110' : 'text-muted-foreground/40 scale-90'}`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: `${itemHeight}px` }} /> {/* Bottom padding */}
      </div>
    </div>
  )
}

export function GlassTimePicker({ time, onTimeChange, isOpen, setIsOpen, label }) {
  const [h, setH] = useState('09')
  const [m, setM] = useState('00')
  const [ampm, setAmpm] = useState('AM')

  useEffect(() => {
    if (time && time !== '--') {
      const [t, p] = time.split(' ')
      const [hh, mm] = t.split(':')
      setH(hh)
      setM(mm)
      setAmpm(p)
    }
  }, [time, isOpen])

  const handleSave = () => {
    onTimeChange(`${h}:${m} ${ampm}`)
    setIsOpen(false)
  }

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  const ampmList = ['AM', 'PM']

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[360px] bg-card text-card-foreground border border-border/80 shadow-xl rounded-2xl p-6 outline-none">
        <DialogTitle className="text-center text-lg font-bold flex items-center justify-center gap-2 mb-4 headline-gradient">
          <Icon name="schedule" className="text-primary" size={20}/> {label || 'Select Time'}
        </DialogTitle>

        <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 mb-4 flex gap-2 shadow-inner">
          <Wheel items={hoursList} value={h} onChange={setH} label="Hour" />
          <div className="text-2xl font-black text-muted-foreground/40 flex items-center justify-center mt-6 mb-0">:</div>
          <Wheel items={minutesList} value={m} onChange={setM} label="Minute" />
          <div className="w-px bg-border/50 mt-6 mx-2" />
          <Wheel items={ampmList} value={ampm} onChange={setAmpm} label="Period" />
        </div>
        
        {/* Result display */}
        <div className="flex justify-center items-center gap-2.5 mb-5 p-2 rounded-xl bg-muted/20 border border-border/40" style={{ fontFamily: "var(--font-sans)" }}>
          <span className="text-fluid-display font-black font-sans tracking-tight text-foreground">{h}:{m}</span>
          <span className="text-xl font-bold text-primary">{ampm}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button className="flex-1 rounded-full shadow-sm font-bold" onClick={handleSave}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
