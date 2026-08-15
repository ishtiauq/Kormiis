import React from 'react'
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisLogoDark from '../../Assets/Kormiis Logo Dark.svg'
import Icon from "@/components/ui/Icon.jsx"

export default function LandingFooter({ onOpenAuth }) {
  const currentYear = new Date().getFullYear()

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="w-full bg-card border-t border-border pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand Info (Col 5) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img 
                src={kormiisLogo} 
                alt="Kormiis" 
                className="h-8 w-auto block dark:hidden object-contain" 
              />
              <img 
                src={kormiisLogoDark} 
                alt="Kormiis" 
                className="h-8 w-auto hidden dark:block object-contain" 
              />
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              The anti-enterprise HR & team operations workspace. Engineered for modern, fast-growing teams with zero per-user subscription fees.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-foreground pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All Systems Operational (Cloud AES-256)</span>
            </div>
          </div>

          {/* Links 1: Platform Modules (Col 4) */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">Platform Modules</span>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }} className="hover:text-foreground transition-colors">
                  Smart Attendance & GeoCheckIn
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }} className="hover:text-foreground transition-colors">
                  Automated Payroll & ৳ Payslips
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }} className="hover:text-foreground transition-colors">
                  Leave Quotas & 1-Tap Approvals
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }} className="hover:text-foreground transition-colors">
                  Hardware Assets & Warranty Registry
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }} className="hover:text-foreground transition-colors">
                  Kanban Tasks & Company Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Links 2: Solutions & Access (Col 3) */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">Quick Access</span>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <button onClick={() => onOpenAuth('up')} className="hover:text-foreground transition-colors text-left">
                  Create Business Space
                </button>
              </li>
              <li>
                <button onClick={() => onOpenAuth('in')} className="hover:text-foreground transition-colors text-left">
                  Teammate Sign In
                </button>
              </li>
              <li>
                <a href="#showcase" onClick={(e) => { e.preventDefault(); scrollTo('showcase') }} className="hover:text-foreground transition-colors">
                  Interactive Live Demo
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => { e.preventDefault(); scrollTo('security') }} className="hover:text-foreground transition-colors">
                  Security Architecture
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('faq') }} className="hover:text-foreground transition-colors">
                  Support & FAQ
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} Kormiis Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Security Overview</a>
          </div>
        </div>

      </div>
    </footer>
  )
}
