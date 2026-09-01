import React from 'react'
import Icon from "@/components/ui/Icon.jsx"
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

export default function LandingHeader({ onOpenAuth, deferredPrompt, onInstallClick }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full pt-3 sm:pt-4 px-3 sm:px-6 pointer-events-none transition-all duration-300">
      <header className="pointer-events-auto max-w-6xl mx-auto h-13 sm:h-15 md:h-16 px-3.5 sm:px-5 flex items-center justify-between rounded-full glass-kormiis text-white transition-all duration-300 shadow-2xl">
        {/* Brand Logo (White) */}
        <a href="#" className="flex items-center gap-2 shrink-0 outline-none select-none">
          <img 
            src={kormiisWhiteLogo} 
            alt="Kormiis Logo" 
            className="h-6 sm:h-7 md:h-8 w-auto object-contain select-none" 
            style={{ filter: 'none', boxShadow: 'none' }}
          />
        </a>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* PWA Install Button */}
          {deferredPrompt && (
            <button
              onClick={onInstallClick}
              className="apple-glass-btn flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer shadow-none active:scale-95 shrink-0 whitespace-nowrap"
              title="Install App as PWA"
            >
              <Icon name="download" size={15} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Sign In Button */}
          <button
            onClick={() => onOpenAuth('in')}
            className="apple-glass-btn flex items-center justify-center h-9 sm:h-10 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer shadow-none active:scale-95 shrink-0 whitespace-nowrap"
          >
            Sign in
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => onOpenAuth('up')}
            className="liquid-glass-btn bg-primary text-primary-foreground flex items-center justify-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold shadow-none hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>Start for free</span>
            <Icon name="arrow_forward" size={15} />
          </button>
        </div>
      </header>
    </div>
  )
}

