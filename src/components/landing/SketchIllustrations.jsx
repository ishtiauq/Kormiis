import React from 'react'
import { motion } from 'framer-motion'

/**
 * Animated High-End Monochrome Vector Sketch Illustrations
 * Strict Monochrome Rule: Only ink strokes, cross-hatching, stippling, and blueprint lines.
 * Palette: #18181b (dark ink), #27272a (charcoal), #52525b (mid ink), #71717a (slate), #a1a1aa, #e4e4e7, #ffffff.
 * Zero colorful accents. Zero bounding box in Hero - completely transparent background.
 */

// 1. Animated Joyful Corporate Office Space with Happy Employees (Transparent Background)
export function HeroOfficeSketch({ className = "w-full h-auto max-h-[460px]" }) {
  return (
    <svg
      viewBox="0 0 920 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <pattern id="office-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#18181b" strokeWidth="0.75" opacity="0.3" />
        </pattern>
        <pattern id="office-dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.75" fill="#71717a" opacity="0.4" />
        </pattern>
      </defs>

      {/* Ground Floor Sketch Line */}
      <line x1="40" y1="410" x2="880" y2="410" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="70" y1="418" x2="850" y2="418" stroke="#71717a" strokeWidth="1" strokeDasharray="6 4" />
      <line x1="120" y1="424" x2="800" y2="424" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 6" />

      {/* ================= BACKGROUND OFFICE ELEMENTS ================= */}

      {/* 1. Modern Office Window Outline (Background Center-Left) */}
      <g transform="translate(180, 70)" opacity="0.4">
        <rect x="0" y="0" width="160" height="200" rx="6" stroke="#71717a" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="80" y1="0" x2="80" y2="200" stroke="#71717a" strokeWidth="1" />
        <line x1="0" y1="100" x2="160" y2="100" stroke="#71717a" strokeWidth="1" />
        {/* Distant skyline lines */}
        <polyline points="20,160 40,120 70,140 100,100 130,130 150,110" stroke="#a1a1aa" strokeWidth="1" fill="none" />
      </g>

      {/* 2. Whiteboard with Sticky Notes (Background Center) */}
      <g transform="translate(380, 60)">
        <rect x="0" y="0" width="170" height="130" rx="8" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <line x1="0" y1="28" x2="170" y2="28" stroke="#18181b" strokeWidth="1" />
        <text x="14" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#18181b">TEAM SPRINT // GOALS</text>
        
        {/* Sticky Notes */}
        <rect x="14" y="38" width="40" height="35" rx="3" fill="#f4f4f5" stroke="#18181b" strokeWidth="1" />
        <line x1="18" y1="48" x2="48" y2="48" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="56" x2="42" y2="56" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
        
        <rect x="62" y="38" width="42" height="35" rx="3" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
        <line x1="66" y1="48" x2="98" y2="48" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        <text x="66" y="62" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#18181b">DONE ✓</text>

        <rect x="112" y="38" width="42" height="35" rx="3" fill="#e4e4e7" stroke="#18181b" strokeWidth="1" />
        <text x="116" y="52" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#18181b">LAUNCH 🚀</text>

        {/* Drawn graph on board */}
        <polyline points="15,108 45,95 80,105 120,80 155,70" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Whiteboard Stand Legs */}
        <line x1="30" y1="130" x2="15" y2="240" stroke="#18181b" strokeWidth="2" />
        <line x1="140" y1="130" x2="155" y2="240" stroke="#18181b" strokeWidth="2" />
      </g>

      {/* 3. Wall Clock with Ticking Hands (Background Right) */}
      <g transform="translate(680, 90)">
        <circle cx="0" cy="0" r="24" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <circle cx="0" cy="0" r="2" fill="#18181b" />
        <motion.line
          x1="0"
          y1="0"
          x2="0"
          y2="-16"
          stroke="#18181b"
          strokeWidth="1.8"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        />
        <motion.line
          x1="0"
          y1="0"
          x2="10"
          y2="0"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 48, ease: "linear" }}
        />
      </g>

      {/* 4. Hanging Modern Ceiling Lamp */}
      <g transform="translate(140, 20)">
        <line x1="0" y1="0" x2="0" y2="70" stroke="#18181b" strokeWidth="1.5" />
        <path d="M-25,95 L25,95 L15,70 L-15,70 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <motion.circle
          cx="0"
          cy="105"
          r="6"
          fill="#18181b"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </g>
      <g transform="translate(790, 20)">
        <line x1="0" y1="0" x2="0" y2="60" stroke="#18181b" strokeWidth="1.5" />
        <path d="M-20,82 L20,82 L12,60 L-12,60 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      </g>

      {/* 5. Office Monstera Potted Plant (Far Left) */}
      <g transform="translate(60, 280)">
        {/* Pot */}
        <polygon points="10,80 40,80 35,130 15,130" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />
        <line x1="8" y1="80" x2="42" y2="80" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Stems and Leaves */}
        <path d="M25,80 Q10,30 -15,40" stroke="#18181b" strokeWidth="2.5" fill="none" />
        <ellipse cx="-15" cy="38" rx="18" ry="12" transform="rotate(-30 -15 38)" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <line x1="-25" y1="38" x2="-5" y2="38" stroke="#18181b" strokeWidth="1.5" />

        <path d="M25,80 Q35,20 60,15" stroke="#18181b" strokeWidth="2.5" fill="none" />
        <ellipse cx="60" cy="15" rx="20" ry="14" transform="rotate(25 60 15)" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <line x1="48" y1="15" x2="72" y2="15" stroke="#18181b" strokeWidth="1.5" />

        <path d="M25,80 Q25,10 25,-10" stroke="#18181b" strokeWidth="2.5" fill="none" />
        <ellipse cx="25" cy="-10" rx="16" ry="22" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      </g>


      {/* ================= HAPPY WORKING EMPLOYEES & WORKSTATIONS ================= */}

      {/* --- EMPLOYEE 1 (Left): Happy Developer/Designer at Desk with Coffee & Laptop --- */}
      <g transform="translate(130, 210)">
        {/* Desk Surface */}
        <rect x="0" y="110" width="160" height="14" rx="4" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        {/* Desk Legs */}
        <line x1="15" y1="124" x2="15" y2="200" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="145" y1="124" x2="145" y2="200" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />

        {/* Chair Base & Backrest */}
        <path d="M35,130 L35,60 C35,45 65,45 65,60 L65,130" stroke="#18181b" strokeWidth="2" fill="#f4f4f5" />
        <line x1="50" y1="130" x2="50" y2="190" stroke="#18181b" strokeWidth="3" />
        <line x1="30" y1="190" x2="70" y2="190" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />

        {/* Employee 1 Body (Sitting, smiling, typing) */}
        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        >
          {/* Torso with striped pattern */}
          <path d="M40,110 L40,65 Q55,55 70,65 L70,110 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          <line x1="40" y1="80" x2="70" y2="80" stroke="#71717a" strokeWidth="1.5" />
          <line x1="40" y1="95" x2="70" y2="95" stroke="#71717a" strokeWidth="1.5" />

          {/* Arms reaching forward to keyboard */}
          <path d="M45,75 Q60,95 85,98" stroke="#18181b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M65,75 Q75,95 95,98" stroke="#18181b" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Head & Joyful Smile */}
          <circle cx="55" cy="40" r="18" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          {/* Hair */}
          <path d="M38,35 C40,18 70,18 72,35 C65,26 48,26 38,35 Z" fill="#18181b" />
          {/* Glasses */}
          <rect x="44" y="36" width="10" height="7" rx="2" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
          <rect x="58" y="36" width="10" height="7" rx="2" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
          <line x1="54" y1="39" x2="58" y2="39" stroke="#18181b" strokeWidth="1.5" />
          {/* Smiling Mouth */}
          <path d="M50,49 Q56,54 62,49" stroke="#18181b" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* Animated Lightbulb Idea Spark (Above Head) */}
          <motion.g
            transform="translate(55, 5)"
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
            <line x1="0" y1="7" x2="0" y2="10" stroke="#18181b" strokeWidth="1.5" />
            {/* Spark lines */}
            <line x1="-10" y1="-5" x2="-14" y2="-8" stroke="#18181b" strokeWidth="1.5" />
            <line x1="0" y1="-10" x2="0" y2="-15" stroke="#18181b" strokeWidth="1.5" />
            <line x1="10" y1="-5" x2="14" y2="-8" stroke="#18181b" strokeWidth="1.5" />
          </motion.g>
        </motion.g>

        {/* Laptop on desk */}
        <polygon points="80,110 120,110 115,85 85,85" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <line x1="75" y1="110" x2="125" y2="110" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
        <path d="M96,96 L100,100 L106,94" stroke="#18181b" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Coffee Mug with Animated Steam */}
        <rect x="135" y="95" width="14" height="15" rx="2" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
        <path d="M149,99 Q154,102 149,106" stroke="#18181b" strokeWidth="1.5" fill="none" />
        <motion.path
          d="M138,90 Q142,82 139,74"
          stroke="#71717a"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          animate={{ y: [0, -6, 0], opacity: [0.3, 0.9, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </g>


      {/* --- EMPLOYEES 2 & 3 (Center): Two Collaborating & Celebrating Teammates (High-Five / Cheer) --- */}
      <g transform="translate(380, 180)">
        
        {/* Teammate A (Standing, pointing to board with excitement) */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
        >
          {/* Head & Smile */}
          <circle cx="50" cy="55" r="18" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          {/* Hair Bun */}
          <circle cx="50" cy="32" r="8" fill="#18181b" />
          <path d="M34,48 C36,36 64,36 66,48 Z" fill="#18181b" />
          {/* Eyes & Big Joyful Smile */}
          <circle cx="45" cy="53" r="2" fill="#18181b" />
          <circle cx="57" cy="53" r="2" fill="#18181b" />
          <path d="M46,61 Q51,67 56,61" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Torso */}
          <path d="M35,75 L65,75 L68,150 L32,150 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          <line x1="50" y1="75" x2="50" y2="150" stroke="#71717a" strokeWidth="1" strokeDasharray="3 3" />

          {/* Raised Arm for High Five */}
          <motion.path
            d="M65,85 Q80,65 95,45"
            stroke="#18181b"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />

          {/* Legs */}
          <line x1="42" y1="150" x2="42" y2="230" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          <line x1="58" y1="150" x2="62" y2="230" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          {/* Shoes */}
          <rect x="35" y="226" width="16" height="6" rx="3" fill="#18181b" />
          <rect x="58" y="226" width="16" height="6" rx="3" fill="#18181b" />
        </motion.g>

        {/* High-Five Celebration Animated Spark (Center Intersection) */}
        <motion.g
          transform="translate(100, 45)"
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#18181b" strokeWidth="2" />
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#18181b" strokeWidth="2" />
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="#18181b" strokeWidth="1.5" />
          <line x1="-8" y1="8" x2="8" y2="-8" stroke="#18181b" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#18181b" />
        </motion.g>

        {/* Teammate B (High-fiving, holding clipboard/tablet) */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut", delay: 0.3 }}
        >
          {/* Head & Smile */}
          <circle cx="145" cy="55" r="18" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          {/* Short neat hair */}
          <path d="M129,48 C132,34 158,34 161,48 Z" fill="#18181b" />
          {/* Eyes & Smile */}
          <circle cx="139" cy="53" r="2" fill="#18181b" />
          <circle cx="151" cy="53" r="2" fill="#18181b" />
          <path d="M140,61 Q145,67 150,61" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Torso */}
          <path d="M130,75 L160,75 L164,150 L126,150 Z" fill="#f4f4f5" stroke="#18181b" strokeWidth="2" />

          {/* Raised Arm for High Five */}
          <path d="M130,85 Q115,65 105,45" stroke="#18181b" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* Other arm holding tablet */}
          <path d="M158,85 Q170,110 155,120" stroke="#18181b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="145" y="112" width="22" height="16" rx="2" transform="rotate(-15 145 112)" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />

          {/* Legs */}
          <line x1="136" y1="150" x2="134" y2="230" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          <line x1="154" y1="150" x2="156" y2="230" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          {/* Shoes */}
          <rect x="126" y="226" width="16" height="6" rx="3" fill="#18181b" />
          <rect x="150" y="226" width="16" height="6" rx="3" fill="#18181b" />
        </motion.g>

        {/* Floating Celebration Dialogue Bubble */}
        <motion.g
          transform="translate(70, -10)"
          animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <rect x="0" y="0" width="120" height="26" rx="13" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
          <text x="60" y="17" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b" textAnchor="middle">✨ SPRINT COMPLETE!</text>
        </motion.g>
      </g>


      {/* --- EMPLOYEE 4 (Right): Relaxed Leader / Specialist at Standing Desk --- */}
      <g transform="translate(680, 210)">
        {/* Modern Standing Desk */}
        <rect x="20" y="110" width="150" height="12" rx="4" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <line x1="40" y1="122" x2="40" y2="200" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
        <line x1="150" y1="122" x2="150" y2="200" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="200" x2="160" y2="200" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />

        {/* Large External Monitor on Stand */}
        <rect x="80" y="40" width="65" height="45" rx="4" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <polyline points="88,68 98,55 110,65 125,50 138,58" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="112" y1="85" x2="112" y2="110" stroke="#18181b" strokeWidth="3" />
        <line x1="102" y1="110" x2="122" y2="110" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />

        {/* Employee 4 (Standing relaxed, waving, happy) */}
        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
        >
          {/* Head & Big Smile */}
          <circle cx="35" cy="40" r="18" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          {/* Hair style */}
          <path d="M19,35 C20,20 50,20 53,35 C45,28 30,28 19,35 Z" fill="#18181b" />
          {/* Eyes & Smile */}
          <circle cx="29" cy="38" r="2" fill="#18181b" />
          <circle cx="41" cy="38" r="2" fill="#18181b" />
          <path d="M30,47 Q35,53 40,47" stroke="#18181b" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Torso (Jacket style) */}
          <path d="M18,60 L52,60 L56,135 L14,135 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          <polygon points="28,60 35,85 42,60" fill="#18181b" />

          {/* Right Arm resting on standing desk */}
          <path d="M48,70 Q65,90 82,108" stroke="#18181b" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Left Arm Waving Cheerfully */}
          <motion.path
            d="M18,70 Q0,45 8,25"
            stroke="#18181b"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          />
          {/* Waving Hand */}
          <circle cx="8" cy="22" r="5" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />

          {/* Legs */}
          <line x1="26" y1="135" x2="26" y2="200" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          <line x1="44" y1="135" x2="44" y2="200" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          {/* Shoes */}
          <rect x="18" y="196" width="16" height="6" rx="3" fill="#18181b" />
          <rect x="40" y="196" width="16" height="6" rx="3" fill="#18181b" />
        </motion.g>

        {/* Small potted succulent on standing desk */}
        <rect x="150" y="100" width="10" height="10" rx="2" fill="#ffffff" stroke="#18181b" strokeWidth="1.2" />
        <ellipse cx="155" cy="96" rx="4" ry="6" fill="#ffffff" stroke="#18181b" strokeWidth="1.2" />
      </g>


      {/* ================= FLOATING AMBIENT SPARKS & CONNECTIVITY ================= */}

      {/* Floating Sparkles & Confetti Stars in Pure Monochrome */}
      <motion.g
        animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      >
        <polygon points="320,130 323,137 330,140 323,143 320,150 317,143 310,140 317,137" fill="#18181b" />
        <polygon points="630,70 632,75 637,77 632,79 630,84 628,79 623,77 628,75" fill="#71717a" />
        <circle cx="280" cy="90" r="3" fill="#18181b" />
        <circle cx="600" cy="120" r="2.5" fill="#71717a" />
      </motion.g>

      <motion.g
        animate={{ y: [0, 8, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
      >
        <polygon points="460,40 462,45 467,47 462,49 460,54 458,49 453,47 458,45" fill="#18181b" />
        <circle cx="780" cy="140" r="3" fill="#18181b" />
        <circle cx="110" cy="120" r="2" fill="#71717a" />
      </motion.g>

    </svg>
  )
}

// 2. Animated Attendance & Live Clock Sketch
export function AttendanceSketch({ className = "w-full h-auto max-h-[280px]" }) {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="att-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#18181b" strokeWidth="0.8" opacity="0.25" />
        </pattern>
      </defs>
      {/* Background Frame */}
      <rect x="15" y="15" width="370" height="250" rx="14" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      <line x1="15" y1="60" x2="385" y2="60" stroke="#18181b" strokeWidth="1.5" />
      
      {/* Header */}
      <circle cx="45" cy="38" r="10" fill="#18181b" />
      <line x1="65" y1="35" x2="180" y2="35" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="44" x2="130" y2="44" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
      
      {/* Live Punch Clock Widget Sketch (Left) */}
      <rect x="35" y="75" width="150" height="170" rx="10" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.5" />
      
      {/* Clock Face with Rotating Hands */}
      <g transform="translate(110, 135)">
        <circle cx="0" cy="0" r="38" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        <circle cx="0" cy="0" r="3" fill="#18181b" />
        {/* Minute Hand (Smooth continuous rotation) */}
        <motion.line
          x1="0"
          y1="0"
          x2="0"
          y2="-26"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        />
        {/* Hour Hand (Slow rotation) */}
        <motion.line
          x1="0"
          y1="0"
          x2="16"
          y2="0"
          stroke="#18181b"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 36, ease: "linear" }}
        />
      </g>

      {/* Animated Punch Button with Ripple */}
      <g transform="translate(50, 195)">
        <motion.rect
          x="0"
          y="0"
          width="120"
          height="32"
          rx="16"
          fill="#18181b"
          whileHover={{ scale: 1.05 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <text x="60" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#ffffff" textAnchor="middle">1-TAP PUNCH</text>
      </g>

      {/* GPS Geo-Radius Sonar Radar (Right) */}
      <rect x="205" y="75" width="160" height="170" rx="10" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
      
      <g transform="translate(285, 140)">
        {/* Pulsing Concentric Radar Rings */}
        <motion.circle
          cx="0"
          cy="0"
          r="48"
          fill="none"
          stroke="#18181b"
          strokeWidth="1"
          strokeDasharray="3 3"
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />
        <motion.circle
          cx="0"
          cy="0"
          r="30"
          fill="none"
          stroke="#71717a"
          strokeWidth="1.5"
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Rotating Sonar Radar Sweep Line */}
        <motion.line
          x1="0"
          y1="0"
          x2="0"
          y2="-48"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        />

        {/* Central Geolocation Pin with Bounce */}
        <motion.g
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <path d="M0,-15 C-6,-15 -10,-10 -10,-4 C-10,4 0,15 0,15 C0,15 10,4 10,-4 C10,-10 6,-15 0,-15 Z" fill="#18181b" />
          <circle cx="0" cy="-6" r="3" fill="#ffffff" />
        </motion.g>

        <text x="0" y="70" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b" textAnchor="middle">
          GEO-FENCE: 50m VERIFIED
        </text>
      </g>
    </svg>
  )
}

// 3. Animated Automated Payroll & Compensation Sketch
export function PayrollSketch({ className = "w-full h-auto max-h-[280px]" }) {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="pay-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#18181b" strokeWidth="0.8" opacity="0.3" />
        </pattern>
      </defs>
      {/* Background Frame */}
      <rect x="15" y="15" width="370" height="250" rx="14" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      
      {/* Salary Slip Invoice Sketch (Left) */}
      <rect x="35" y="30" width="180" height="220" rx="8" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
      <line x1="50" y1="50" x2="110" y2="50" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="62" x2="160" y2="62" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="35" y1="74" x2="215" y2="74" stroke="#e4e4e7" strokeWidth="1" />

      {/* Animated Flowing Line Entries */}
      <g transform="translate(50, 95)">
        <text x="0" y="0" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">Basic Salary</text>
        <text x="130" y="0" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#18181b" textAnchor="end">৳ 60,000</text>

        <text x="0" y="20" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">House Rent (40%)</text>
        <text x="130" y="20" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#18181b" textAnchor="end">৳ 24,000</text>

        <text x="0" y="40" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">Medical Allowance</text>
        <text x="130" y="40" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#18181b" textAnchor="end">৳ 10,000</text>

        <text x="0" y="60" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">Overtime (14h)</text>
        <text x="130" y="60" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#18181b" textAnchor="end">+ ৳ 7,500</text>

        <line x1="0" y1="72" x2="150" y2="72" stroke="#18181b" strokeWidth="1" strokeDasharray="3 3" />
        
        <text x="0" y="94" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#18181b">NET TOTAL</text>
        <text x="130" y="94" fontFamily="monospace" fontSize="12" fontWeight="900" fill="#18181b" textAnchor="end">৳ 101,500</text>
      </g>

      {/* Animated Calculation Gears (Right) */}
      <g transform="translate(295, 95)">
        {/* Main Gear 1 */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        >
          <circle cx="0" cy="0" r="32" fill="none" stroke="#18181b" strokeWidth="3" strokeDasharray="6 3" />
          <circle cx="0" cy="0" r="14" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
        </motion.g>

        {/* Counter Gear 2 */}
        <motion.g
          transform="translate(38, 30)"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        >
          <circle cx="0" cy="0" r="20" fill="none" stroke="#71717a" strokeWidth="2.5" strokeDasharray="5 3" />
          <circle cx="0" cy="0" r="8" fill="#18181b" />
        </motion.g>

        <text x="0" y="4" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#18181b" textAnchor="middle">100%</text>
        <text x="0" y="16" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#71717a" textAnchor="middle">AUTO MATH</text>
      </g>

      {/* Currency Pill with Pulse */}
      <motion.g
        transform="translate(235, 185)"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <rect x="0" y="0" width="130" height="45" rx="8" fill="#f4f4f5" stroke="#18181b" strokeWidth="1" />
        <circle cx="22" cy="22" r="12" fill="#18181b" />
        <text x="22" y="27" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle">৳</text>
        <text x="44" y="20" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">Multi-Currency</text>
        <text x="44" y="34" fontFamily="sans-serif" fontSize="8" fill="#71717a">BDT, USD, EUR, INR</text>
      </motion.g>
    </svg>
  )
}

// 4. Animated Leave Quotas & Approvals Sketch
export function LeavesSketch({ className = "w-full h-auto max-h-[280px]" }) {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="leave-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#18181b" strokeWidth="0.8" opacity="0.3" />
        </pattern>
      </defs>
      {/* Background Frame */}
      <rect x="15" y="15" width="370" height="250" rx="14" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      
      {/* Leave Quota Meters (Left) */}
      <g transform="translate(35, 40)">
        <text x="0" y="15" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#18181b">Leave Quotas</text>

        {/* Sick Leave */}
        <text x="0" y="42" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">Sick Leave (3 / 10 used)</text>
        <rect x="0" y="50" width="180" height="10" rx="5" fill="#f4f4f5" stroke="#18181b" strokeWidth="1" />
        <motion.rect
          x="0"
          y="50"
          height="10"
          rx="5"
          fill="#18181b"
          animate={{ width: [40, 54, 40] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />

        {/* Casual Leave */}
        <text x="0" y="82" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">Casual Leave (5 / 14 used)</text>
        <rect x="0" y="90" width="180" height="10" rx="5" fill="#f4f4f5" stroke="#18181b" strokeWidth="1" />
        <motion.rect
          x="0"
          y="90"
          height="10"
          rx="5"
          fill="#52525b"
          animate={{ width: [55, 75, 55] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Annual Leave */}
        <text x="0" y="122" fontFamily="sans-serif" fontSize="9" fontWeight="600" fill="#71717a">Annual Vacation (8 / 18 used)</text>
        <rect x="0" y="130" width="180" height="10" rx="5" fill="#f4f4f5" stroke="#18181b" strokeWidth="1" />
        <rect x="0" y="130" width="80" height="10" rx="5" fill="url(#leave-hatch)" stroke="#18181b" strokeWidth="1" />
      </g>

      {/* Animated Stamping Action (Right) */}
      <motion.g
        transform="translate(295, 120)"
        animate={{
          scale: [1, 1.12, 1],
          rotate: [-2, 2, -2]
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <circle cx="0" cy="0" r="48" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" strokeDasharray="6 3" />
        <circle cx="0" cy="0" r="38" fill="none" stroke="#18181b" strokeWidth="1.5" />
        <text x="0" y="-12" fontFamily="sans-serif" fontSize="9" fontWeight="900" fill="#18181b" textAnchor="middle" letterSpacing="1">1-TAP</text>
        <rect x="-32" y="-4" width="64" height="18" rx="4" fill="#18181b" />
        <text x="0" y="9" fontFamily="sans-serif" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="1">APPROVED</text>
        <text x="0" y="26" fontFamily="sans-serif" fontSize="8" fontWeight="600" fill="#71717a" textAnchor="middle">SYNCED LIVE</text>
      </motion.g>

      {/* Bottom status note */}
      <line x1="35" y1="215" x2="365" y2="215" stroke="#e4e4e7" strokeWidth="1" />
      <text x="35" y="238" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">✓ Automatic calendar replacement & real-time team visibility</text>
    </svg>
  )
}

// 5. Animated Hardware Assets & Inventory Tracking Sketch
export function AssetsSketch({ className = "w-full h-auto max-h-[280px]" }) {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="asset-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#71717a" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      </defs>
      {/* Background Frame */}
      <rect x="15" y="15" width="370" height="250" rx="14" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      <rect x="16" y="16" width="368" height="248" rx="13" fill="url(#asset-grid)" />

      {/* Isometric Hardware Unit 1: Laptop */}
      <g transform="translate(110, 100)">
        <polygon points="-50,-30 0,-55 50,-30 0,-5" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
        <polygon points="-50,-30 0,-5 0,15 -50,-10" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.5" />
        <polygon points="50,-30 0,-5 0,15 50,-10" fill="#e4e4e7" stroke="#18181b" strokeWidth="1.5" />
        {/* Screen upright */}
        <polygon points="-45,-28 0,-50 0,-10 -45,12" fill="#18181b" stroke="#18181b" strokeWidth="1.5" />
        <polygon points="0,-50 45,-28 45,12 0,-10" fill="#27272a" stroke="#18181b" strokeWidth="1.5" />

        {/* Tag line with Pulse */}
        <line x1="0" y1="20" x2="0" y2="45" stroke="#18181b" strokeWidth="1.5" strokeDasharray="2 2" />
        <rect x="-40" y="45" width="80" height="22" rx="4" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
        <text x="0" y="59" fontFamily="monospace" fontSize="8" fontWeight="bold" fill="#18181b" textAnchor="middle">AST-MAC-892</text>
      </g>

      {/* Barcode & Laser Scanner Card (Right) */}
      <g transform="translate(230, 55)">
        <rect x="0" y="0" width="135" height="170" rx="8" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
        <text x="12" y="24" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#18181b">Asset Registry</text>
        <line x1="12" y1="34" x2="123" y2="34" stroke="#e4e4e7" strokeWidth="1" />

        {/* Barcode lines with Moving Laser Line */}
        <g transform="translate(15, 45)">
          <line x1="0" y1="0" x2="0" y2="28" stroke="#18181b" strokeWidth="2" />
          <line x1="6" y1="0" x2="6" y2="28" stroke="#18181b" strokeWidth="4" />
          <line x1="14" y1="0" x2="14" y2="28" stroke="#18181b" strokeWidth="1" />
          <line x1="20" y1="0" x2="20" y2="28" stroke="#18181b" strokeWidth="3" />
          <line x1="28" y1="0" x2="28" y2="28" stroke="#18181b" strokeWidth="5" />
          <line x1="38" y1="0" x2="38" y2="28" stroke="#18181b" strokeWidth="2" />
          <line x1="45" y1="0" x2="45" y2="28" stroke="#18181b" strokeWidth="3" />
          <line x1="54" y1="0" x2="54" y2="28" stroke="#18181b" strokeWidth="1" />
          <line x1="62" y1="0" x2="62" y2="28" stroke="#18181b" strokeWidth="4" />
          <line x1="72" y1="0" x2="72" y2="28" stroke="#18181b" strokeWidth="2" />
          <line x1="80" y1="0" x2="80" y2="28" stroke="#18181b" strokeWidth="3" />
          <line x1="90" y1="0" x2="90" y2="28" stroke="#18181b" strokeWidth="5" />
          <line x1="102" y1="0" x2="102" y2="28" stroke="#18181b" strokeWidth="3" />

          {/* Animated Laser Scanner Line */}
          <motion.line
            x1="-5"
            y1="0"
            x2="110"
            y2="0"
            stroke="#18181b"
            strokeWidth="2"
            strokeDasharray="4 2"
            animate={{ y: [2, 26, 2] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
        </g>

        <text x="12" y="98" fontFamily="sans-serif" fontSize="8" fontWeight="600" fill="#71717a">Assigned Teammate:</text>
        <text x="12" y="112" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">Rahim Ahmed (Lead)</text>

        <text x="12" y="132" fontFamily="sans-serif" fontSize="8" fontWeight="600" fill="#71717a">Warranty Status:</text>
        <text x="12" y="146" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">280 Days Active ✓</text>
      </g>
    </svg>
  )
}

// 6. Animated Collaboration, Tasks & Documents Sketch
export function CollaborationSketch({ className = "w-full h-auto max-h-[280px]" }) {
  return (
    <svg viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="collab-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#18181b" strokeWidth="0.8" opacity="0.3" />
        </pattern>
      </defs>
      {/* Background Frame */}
      <rect x="15" y="15" width="370" height="250" rx="14" fill="#ffffff" stroke="#18181b" strokeWidth="2" />

      {/* Kanban Column 1: In Progress */}
      <rect x="35" y="35" width="95" height="205" rx="8" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.5" />
      <text x="45" y="54" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">IN PROGRESS</text>
      <line x1="35" y1="62" x2="130" y2="62" stroke="#e4e4e7" strokeWidth="1" />
      
      {/* Animated Hovering Card */}
      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <rect x="42" y="70" width="81" height="50" rx="6" fill="#ffffff" stroke="#18181b" strokeWidth="1.2" />
        <line x1="48" y1="82" x2="90" y2="82" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="92" x2="105" y2="92" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="48" y="102" width="28" height="10" rx="3" fill="#18181b" />
        <circle cx="108" cy="107" r="5" fill="#71717a" />
      </motion.g>

      <rect x="42" y="130" width="81" height="42" rx="6" fill="#ffffff" stroke="#18181b" strokeWidth="1.2" />
      <line x1="48" y1="142" x2="80" y2="142" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="152" x2="100" y2="152" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />

      {/* Kanban Column 2: Done */}
      <rect x="145" y="35" width="95" height="205" rx="8" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.5" />
      <text x="155" y="54" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">DONE ✓</text>
      <line x1="145" y1="62" x2="240" y2="62" stroke="#e4e4e7" strokeWidth="1" />
      
      <rect x="152" y="70" width="81" height="45" rx="6" fill="#ffffff" stroke="#18181b" strokeWidth="1.2" />
      <line x1="158" y1="82" x2="200" y2="82" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="162" cy="98" r="5" fill="#18181b" />
      <path d="M160,98 L162,100 L165,96" stroke="#ffffff" strokeWidth="1.2" fill="none" />

      {/* Broadcast Announcement Pin (Right) */}
      <rect x="255" y="35" width="110" height="205" rx="8" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
      <text x="265" y="54" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">ANNOUNCEMENT</text>
      <line x1="255" y1="62" x2="365" y2="62" stroke="#e4e4e7" strokeWidth="1" />

      {/* Folders */}
      <rect x="265" y="72" width="90" height="32" rx="4" fill="#f4f4f5" stroke="#18181b" strokeWidth="1" />
      <text x="272" y="87" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#18181b">📁 HR Policies</text>
      <text x="272" y="97" fontFamily="sans-serif" fontSize="7" fill="#71717a">v2.4 Updated</text>

      {/* Animated Megaphone Broadcast Pin */}
      <motion.g
        transform="translate(265, 120)"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <rect x="0" y="0" width="90" height="75" rx="4" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
        <circle cx="15" cy="18" r="6" fill="#18181b" />
        <text x="28" y="21" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="#18181b">📢 Townhall</text>
        <line x1="8" y1="30" x2="82" y2="30" stroke="#e4e4e7" strokeWidth="1" />
        <text x="8" y="44" fontFamily="sans-serif" fontSize="7" fill="#71717a">Thursday 4:00 PM</text>
        <text x="8" y="56" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#18181b">All Hands Remote</text>
      </motion.g>
    </svg>
  )
}

// 7. Animated Cloud Security & Isolated Tenant Vault Sketch
export function SecuritySketch({ className = "w-full h-auto max-h-[340px]" }) {
  return (
    <svg viewBox="0 0 600 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="sec-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#71717a" opacity="0.3" />
        </pattern>
      </defs>

      <rect x="15" y="15" width="570" height="290" rx="16" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      <rect x="20" y="20" width="560" height="280" fill="url(#sec-grid)" />

      {/* Central Security Shield Vault with Animated Dual Cipher Rings */}
      <g transform="translate(300, 155)">
        {/* Outer Orbit Ring (Clockwise) */}
        <motion.circle
          cx="0"
          cy="0"
          r="110"
          fill="none"
          stroke="#71717a"
          strokeWidth="1"
          strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        />
        {/* Inner Cipher Ring (Counter-Clockwise) */}
        <motion.circle
          cx="0"
          cy="0"
          r="75"
          fill="none"
          stroke="#18181b"
          strokeWidth="1.5"
          strokeDasharray="8 4"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        />
        
        {/* Shield with Gentle Floating Scale */}
        <motion.g
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <path
            d="M0,-45 L38,-28 C38,15 0,48 0,48 C0,48 -38,15 -38,-28 Z"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="2"
          />
          {/* Keyhole / Lock Core */}
          <circle cx="0" cy="-6" r="8" fill="#ffffff" />
          <polygon points="-4,-6 4,-6 6,12 -6,12" fill="#ffffff" />
        </motion.g>

        <text x="0" y="70" fontFamily="monospace" fontSize="10" fontWeight="bold" fill="#18181b" textAnchor="middle">
          ENCRYPTED CLOUD ISOLATION (AES-256)
        </text>
      </g>

      {/* Left Node: Company Space A */}
      <motion.g
        transform="translate(100, 110)"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      >
        <rect x="-60" y="-35" width="120" height="70" rx="8" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
        <circle cx="-40" cy="-15" r="8" fill="#18181b" />
        <text x="-25" y="-12" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">Workspace A</text>
        <line x1="-50" y1="5" x2="50" y2="5" stroke="#e4e4e7" strokeWidth="1" />
        <text x="-50" y="20" fontFamily="monospace" fontSize="8" fill="#71717a">ISOLATED DB</text>
      </motion.g>

      {/* Animated Connecting Data Stream Left */}
      <motion.line
        x1="160"
        y1="110"
        x2="225"
        y2="145"
        stroke="#18181b"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, -16] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      />

      {/* Right Node: Company Space B */}
      <motion.g
        transform="translate(500, 110)"
        animate={{ y: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <rect x="-60" y="-35" width="120" height="70" rx="8" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
        <circle cx="-40" cy="-15" r="8" fill="#52525b" />
        <text x="-25" y="-12" fontFamily="sans-serif" fontSize="9" fontWeight="bold" fill="#18181b">Workspace B</text>
        <line x1="-50" y1="5" x2="50" y2="5" stroke="#e4e4e7" strokeWidth="1" />
        <text x="-50" y="20" fontFamily="monospace" fontSize="8" fill="#71717a">ISOLATED DB</text>
      </motion.g>

      {/* Animated Connecting Data Stream Right */}
      <motion.line
        x1="440"
        y1="110"
        x2="375"
        y2="145"
        stroke="#18181b"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, 16] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      />

      {/* Bottom Technical Spec Footer */}
      <text x="300" y="280" fontFamily="monospace" fontSize="9" fontWeight="600" fill="#71717a" textAnchor="middle">
        AES-256 ENCRYPTION · ZERO CROSS-TENANT ACCESS · PRIVATE BUSINESS SPACES
      </text>
    </svg>
  )
}
