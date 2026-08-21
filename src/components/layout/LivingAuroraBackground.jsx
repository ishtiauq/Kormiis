import React from 'react'
import { motion } from 'framer-motion'

export default function LivingAuroraBackground({ isDarkMode = true, className = "" }) {
  // Balanced opacities for dark and light modes
  const orangeOpacity = isDarkMode ? [0.24, 0.36, 0.20, 0.32, 0.24] : [0.10, 0.18, 0.08, 0.16, 0.10]
  const blueOpacity = isDarkMode ? [0.20, 0.34, 0.16, 0.28, 0.20] : [0.08, 0.16, 0.06, 0.14, 0.08]
  const violetOpacity = isDarkMode ? [0.18, 0.30, 0.14, 0.26, 0.18] : [0.07, 0.14, 0.05, 0.12, 0.07]
  const emeraldOpacity = isDarkMode ? [0.16, 0.28, 0.12, 0.24, 0.16] : [0.06, 0.12, 0.05, 0.11, 0.06]
  const roseOpacity = isDarkMode ? [0.14, 0.26, 0.10, 0.22, 0.14] : [0.05, 0.11, 0.04, 0.10, 0.05]

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 isolate select-none ${className}`}>
      {/* Warm Neon Coral/Orange Orb (Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left -> Top-Left) */}
      <motion.div
        animate={{
          x: ["-10vw", "60vw", "60vw", "-10vw", "-10vw"],
          y: ["-10vh", "-10vh", "60vh", "60vh", "-10vh"],
          scale: [1, 1.25, 0.95, 1.18, 1],
          opacity: orangeOpacity,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-0 w-[560px] sm:w-[820px] h-[560px] sm:h-[820px] rounded-full bg-[#FE4D01] blur-[130px] sm:blur-[180px] will-change-transform"
      />

      {/* Electric Sky Blue Orb (Top-Right -> Bottom-Right -> Bottom-Left -> Top-Left -> Top-Right) */}
      <motion.div
        animate={{
          x: ["60vw", "60vw", "-10vw", "-10vw", "60vw"],
          y: ["-10vh", "60vh", "60vh", "-10vh", "-10vh"],
          scale: [1.18, 0.92, 1.25, 0.95, 1.18],
          opacity: blueOpacity,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-0 w-[520px] sm:w-[780px] h-[520px] sm:h-[780px] rounded-full bg-[#3b82f6] blur-[140px] sm:blur-[190px] will-change-transform"
      />

      {/* Deep Violet / Fuchsia Orb (Bottom-Right -> Bottom-Left -> Top-Left -> Top-Right -> Bottom-Right) */}
      <motion.div
        animate={{
          x: ["60vw", "-10vw", "-10vw", "60vw", "60vw"],
          y: ["60vh", "60vh", "-10vh", "-10vh", "60vh"],
          scale: [0.95, 1.28, 0.95, 1.2, 0.95],
          opacity: violetOpacity,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-0 w-[480px] sm:w-[750px] h-[480px] sm:h-[750px] rounded-full bg-[#9333ea] blur-[150px] sm:blur-[200px] will-change-transform"
      />

      {/* Emerald / Teal Orb (Bottom-Left -> Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left) */}
      <motion.div
        animate={{
          x: ["-10vw", "-10vw", "60vw", "60vw", "-10vw"],
          y: ["60vh", "-10vh", "-10vh", "60vh", "60vh"],
          scale: [1.05, 1.2, 0.9, 1.15, 1.05],
          opacity: emeraldOpacity,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-0 w-[450px] sm:w-[700px] h-[450px] sm:h-[700px] rounded-full bg-[#10b981] blur-[140px] sm:blur-[180px] will-change-transform"
      />

      {/* Sunset Rose / Amber Center Orb (Diagonal Crossing Dance) */}
      <motion.div
        animate={{
          x: ["25vw", "-10vw", "60vw", "60vw", "-10vw", "25vw"],
          y: ["25vh", "-10vh", "60vh", "-10vh", "60vh", "25vh"],
          scale: [0.95, 1.2, 0.92, 1.15, 0.95, 0.95],
          opacity: roseOpacity,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-0 w-[420px] sm:w-[650px] h-[420px] sm:h-[650px] rounded-full bg-[#f43f5e] blur-[130px] sm:blur-[170px] will-change-transform"
      />
    </div>
  )
}
