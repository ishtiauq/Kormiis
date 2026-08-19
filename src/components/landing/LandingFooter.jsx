import React from 'react'

export default function LandingFooter({ onOpenLegal }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full z-20 px-4 sm:px-6 lg:px-8 py-1 pb-16 sm:pb-18 lg:pb-2 shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs text-[#888888]">
        
        {/* Copyright */}
        <span className="whitespace-nowrap text-xs text-[#888888]">
          © {currentYear} Kormiis Ltd.
        </span>

        {/* Essential Legal Links Box */}
        <div className="inline-flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full bg-[#18181b] border border-white/10 shadow-sm text-xs">
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('privacy')} 
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap text-xs text-[#888888]"
          >
            Privacy
          </button>
          <span className="text-white/20 text-xs select-none">|</span>
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('terms')} 
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap text-xs text-[#888888]"
          >
            Terms
          </button>
        </div>

      </div>
    </footer>
  )
}


