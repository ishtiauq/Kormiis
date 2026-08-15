import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisLogoDark from '../../Assets/Kormiis Logo Dark.svg'

export default function LandingHeader({ onOpenAuth, deferredPrompt, onInstallClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Live Demo', href: '#showcase' },
    { label: 'Why Kormiis', href: '#comparison' },
    { label: 'Security', href: '#security' },
    { label: 'FAQ', href: '#faq' },
  ]

  const handleNavClick = (e, href) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 pointer-events-none transition-all duration-300">
      <div className="bg-card/90 backdrop-blur-md border border-border/80 rounded-full px-4 sm:px-6 h-16 flex items-center justify-between pointer-events-auto shadow-sm">
        
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <img 
            src={kormiisLogo} 
            alt="Kormiis Logo" 
            className="block h-7 sm:h-8 w-auto object-contain dark:hidden" 
          />
          <img 
            src={kormiisLogoDark} 
            alt="Kormiis Logo" 
            className="hidden h-7 sm:h-8 w-auto object-contain dark:block" 
          />
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-3.5 py-1.5 rounded-full text-xs lg:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          {deferredPrompt && (
            <button
              onClick={onInstallClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors"
              title="Install App as PWA"
            >
              <Icon name="download" size={16} />
              <span>Install App</span>
            </button>
          )}

          {/* Sign In Button */}
          <button
            onClick={() => onOpenAuth('in')}
            className="hidden sm:inline-block px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors"
          >
            Sign in
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => onOpenAuth('up')}
            className="bg-primary text-primary-foreground px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>Start for free</span>
            <Icon name="arrow_forward" size={16} />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Toggle Navigation"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden mt-2 p-4 bg-card border border-border rounded-2xl shadow-lg pointer-events-auto flex flex-col gap-2"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>{link.label}</span>
              <Icon name="chevron_right" size={16} className="text-muted-foreground" />
            </a>
          ))}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenAuth('in') }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-border text-foreground hover:bg-muted transition-colors"
            >
              Sign in
            </button>
            {deferredPrompt && (
              <button
                onClick={() => { setMobileMenuOpen(false); onInstallClick() }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-muted text-foreground"
              >
                <Icon name="download" size={16} />
                <span>Install Application</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </header>
  )
}
