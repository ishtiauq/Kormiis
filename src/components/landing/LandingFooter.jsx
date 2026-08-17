import React from 'react'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

export default function LandingFooter({ onOpenLegal }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-black py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo only (White) */}
        <div className="flex items-center shrink-0">
          <img 
            src={kormiisWhiteLogo} 
            alt="Kormiis" 
            className="h-6 sm:h-7 w-auto object-contain" 
          />
        </div>

        {/* Essential Links & Copyright */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-6 text-xs text-[#bbbbbb]">
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('privacy')} 
            className="hover:text-white transition-colors"
          >
            Privacy Policy
          </button>
          <button 
            type="button" 
            onClick={() => onOpenLegal && onOpenLegal('terms')} 
            className="hover:text-white transition-colors"
          >
            Terms of Service
          </button>
          <span className="text-[#888888]">© {currentYear} Kormiis Ltd. All rights reserved.</span>
        </div>

      </div>
    </footer>
  )
}


