import React from 'react'

export default function LandingFooter({ onOpenLegal }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-black z-20 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-28 lg:pb-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888888]">
        
        {/* Copyright */}
        <span className="whitespace-nowrap text-xs text-[#888888] order-2 sm:order-1">
          © {currentYear} Kormiis Ltd. All rights reserved.
        </span>

        {/* Essential Legal Links Box */}
        <div className="inline-flex items-center gap-3 sm:gap-3.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#18181b] border border-white/10 shadow-sm text-xs order-1 sm:order-2">
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('privacy')} 
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap text-xs text-[#888888]"
          >
            Privacy Policy
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


