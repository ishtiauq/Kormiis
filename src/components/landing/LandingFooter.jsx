import React from 'react'
import { motion } from 'framer-motion'

export default function LandingFooter({ onOpenLegal }) {
  const currentYear = new Date().getFullYear()

  return (
    <motion.footer 
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-transparent border-none z-20 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-28 lg:pb-8 text-white"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Copyright */}
        <span className="whitespace-nowrap text-xs text-white/50 font-medium order-2 sm:order-1">
          © {currentYear} Kormiis Ltd. All rights reserved.
        </span>

        {/* Essential Legal Links */}
        <div className="inline-flex items-center gap-3 sm:gap-4 text-xs order-1 sm:order-2">
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('privacy')} 
            className="text-white/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap active:scale-95"
          >
            Privacy Policy
          </button>
          <span className="text-white/20 text-xs select-none">|</span>
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('terms')} 
            className="text-white/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap active:scale-95"
          >
            Terms
          </button>
        </div>

      </div>
    </motion.footer>
  )
}


