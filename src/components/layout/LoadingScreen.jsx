import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

export default function LoadingScreen({ 
  duration = 900 
}) {
  const [progress, setProgress] = useState(0)

  // Progress simulation with organic easing
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rawPct = Math.min(100, Math.floor((elapsed / duration) * 100))
      
      // Add slight organic acceleration curve
      const easedPct = Math.min(100, Math.round(Math.pow(rawPct / 100, 0.9) * 100))
      setProgress(easedPct)

      if (rawPct >= 100) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [duration])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.03, 
        filter: "blur(12px)",
        transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] } 
      }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center dark force-dark-mode bg-[#090a0f] text-white select-none overflow-hidden isolate"
    >
      {/* 2. Unboxed Clean Center Stage */}
      <div className="relative z-10 flex flex-col items-center gap-7 max-w-sm w-full px-6 text-center">
        
        {/* Clean Kormiis White Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative flex items-center justify-center"
        >
          <img
            src={kormiisWhiteLogo}
            alt="Kormiis Logo"
            className="h-11 sm:h-13 w-auto object-contain select-none"
            style={{ filter: 'none', boxShadow: 'none' }}
          />
        </motion.div>

        {/* Shimmering Liquid Glass Progress Capsule */}
        <div className="w-64 sm:w-72 flex flex-col items-center gap-2.5">
          {/* Progress Capsule Track */}
          <div className="w-full h-2.5 sm:h-3 bg-white/[0.10] rounded-full overflow-hidden p-0.5 border border-white/15 shadow-inner relative">
            <motion.div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-[#FE3501] via-[#ff5522] to-[#FE3501] rounded-full relative overflow-hidden transition-all duration-150 ease-linear shadow-xs"
            >
              {/* Dynamic Shimmer Light Sweep */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full"
              />
            </motion.div>
          </div>

          {/* Progress Percentage & Live Activity Indicator */}
          <div className="flex items-center justify-between w-full px-1 text-xs">
            <div className="flex items-center">
              <span className="text-[11px] font-semibold text-white/60">Loading</span>
            </div>

            <span className="font-black tracking-tight tabular-nums text-[#FE3501] text-xs sm:text-sm">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
