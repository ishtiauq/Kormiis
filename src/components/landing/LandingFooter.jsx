import React from 'react'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

export default function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-black border-t border-white/10 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
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
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-6 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          <span>© {currentYear} Kormiis Ltd. All rights reserved.</span>
        </div>

      </div>
    </footer>
  )
}


