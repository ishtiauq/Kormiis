import React from 'react'
import Icon from "@/components/ui/Icon.jsx"
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

export default function LandingHeader({ onOpenAuth, deferredPrompt, onInstallClick }) {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        
        {/* Brand Logo (White) */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <img 
            src={kormiisWhiteLogo} 
            alt="Kormiis Logo" 
            className="h-6 sm:h-7 md:h-8 w-auto object-contain" 
          />
        </a>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* PWA Install Button */}
          {deferredPrompt && (
            <button
              onClick={onInstallClick}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-[#141416] hover:bg-[#1f1f23] text-[#bbbbbb] hover:text-white border border-white/10 transition-colors"
              title="Install App as PWA"
            >
              <Icon name="download" size={15} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Sign In Button */}
          <button
            onClick={() => onOpenAuth('in')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-[#bbbbbb] hover:text-white hover:bg-[#141416] transition-colors"
          >
            Sign in
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => onOpenAuth('up')}
            className="bg-primary text-primary-foreground px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5"
          >
            <span>Get Started</span>
            <Icon name="arrow_forward" size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}

