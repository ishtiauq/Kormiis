import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import { HeroOfficeSketch } from './SketchIllustrations.jsx'

export default function LandingHero({ onOpenAuth, headingOpacity, headingY, scrollIndicatorOpacity }) {
  // Rotating typing word
  const ROTATING_WORDS = ['Employees', 'Teammates', 'Teams', 'Squads', 'People']
  const [typed, setTyped] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    const word = ROTATING_WORDS[wordIndex]
    let timeout

    if (isWaiting) {
      timeout = setTimeout(() => {
        setIsWaiting(false)
        setIsDeleting(true)
      }, 1600)
    } else if (!isDeleting) {
      timeout = setTimeout(() => {
        const next = word.slice(0, typed.length + 1)
        setTyped(next)
        if (next === word) setIsWaiting(true)
      }, 110)
    } else {
      timeout = setTimeout(() => {
        if (typed.length <= 1) {
          setIsDeleting(false)
          setTyped('')
          setWordIndex((i) => (i + 1) % ROTATING_WORDS.length)
        } else {
          setTyped(word.slice(0, typed.length - 1))
        }
      }, 45)
    }

    return () => clearTimeout(timeout)
  }, [typed, isDeleting, isWaiting, wordIndex])

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Background Architectural Blueprint Grid */}
      <div className="absolute inset-0 pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto w-full flex flex-col items-center text-center gap-8 relative z-10">
        
        {/* Anti-Enterprise Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-xs font-semibold text-foreground shadow-sm hover:border-primary/40 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-bold">Kormiis 2.0</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground font-medium">The Anti-Enterprise HR Platform</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">100% FREE</span>
        </motion.div>

        {/* Main Headline with Dynamic Typing */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[clamp(2.5rem,5.5vw+1rem,5.5rem)] leading-[1.08] font-black tracking-tight text-foreground max-w-5xl"
        >
          When{' '}
          <span className="text-primary relative inline-block">
            {typed}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
              className="inline-block w-[3px] sm:w-[4px] h-[0.82em] bg-primary align-baseline ml-1"
            />
          </span>{' '}
          Win,<br className="hidden sm:inline" />
          Business Follows.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-fluid-lg sm:text-fluid-xl text-muted-foreground font-medium max-w-3xl leading-relaxed text-balance"
        >
          One-tap GPS attendance, automated payroll slips (৳ & $), 1-click leave approvals, hardware inventory, and team tasks. Built for fast-moving teams without per-seat licenses.
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto"
        >
          <button
            onClick={() => onOpenAuth('up')}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-base shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Create Free Workspace</span>
            <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => scrollToSection('showcase')}
            className="w-full sm:w-auto px-7 py-4 rounded-full bg-card border border-border text-foreground font-bold text-base shadow-sm hover:bg-muted/80 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="play_circle" size={20} className="text-muted-foreground" />
            <span>Explore Live Interactive Demo</span>
          </button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-semibold text-muted-foreground pt-2"
        >
          <span className="flex items-center gap-1.5">
            <Icon name="check" size={16} className="text-foreground" /> No credit card needed
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="check" size={16} className="text-foreground" /> 100% Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="check" size={16} className="text-foreground" /> Google SSO & Firebase Cloud
          </span>
        </motion.div>

        {/* Joyful Corporate Office Space Sketch (Transparent Background, No Box) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full relative mt-6 sm:mt-10 flex items-center justify-center pointer-events-none"
        >
          <HeroOfficeSketch className="w-full h-auto max-h-[460px] drop-shadow-sm select-none" />

          {/* Floating Subtle Parallax Badges */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute top-6 left-2 sm:left-6 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/90 border border-border shadow-sm text-xs font-bold text-foreground backdrop-blur-md pointer-events-auto"
          >
            <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center">
              <Icon name="location_on" size={13} className="text-foreground" />
            </div>
            <span>GPS Geofence: 50m Verified</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-6 right-2 sm:right-6 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/90 border border-border shadow-sm text-xs font-bold text-foreground backdrop-blur-md pointer-events-auto"
          >
            <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center">
              <Icon name="payments" size={13} className="text-foreground" />
            </div>
            <span>Auto Payroll: ৳ Disbursed</span>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}
