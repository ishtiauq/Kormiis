import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisLogoDark from '../../Assets/Kormiis Logo Dark.svg'

export default function LoadingScreen({ message = "Preparing workspace...", isDarkMode = false, duration = 1200 }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100))
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [duration])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground select-none overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-[500px] h-[500px] rounded-full bg-[#FE4D01]/25 blur-[110px]"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm px-6 text-center">
        {/* Pulsing Logo Container */}
        <motion.div
          animate={{
            scale: [0.96, 1.04, 0.96],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative flex items-center justify-center p-4"
        >
          <img
            src={isDarkMode ? kormiisLogoDark : kormiisLogo}
            alt="Kormiis Logo"
            className="h-12 sm:h-16 w-auto object-contain drop-shadow-lg"
          />
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-56 sm:w-64 flex flex-col items-center gap-2 mt-2">
          <div className="w-full h-2.5 bg-muted/80 rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
            <motion.div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-[#FE4D01] via-[#ff6b26] to-[#FE4D01] rounded-full shadow-[0_0_12px_rgba(254,77,1,0.8)] transition-all duration-75 ease-out"
            />
          </div>

          {/* Percentage Counter */}
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{message}</span>
            <span className="text-xs font-black tracking-tight tabular-nums text-[#FE4D01]">{progress}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
