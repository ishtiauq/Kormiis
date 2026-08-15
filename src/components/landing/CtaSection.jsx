import React from 'react'
import Icon from "@/components/ui/Icon.jsx"

export default function CtaSection({ onOpenAuth }) {
  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="w-full bg-primary text-primary-foreground rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-lg flex flex-col items-center gap-6">
          
          {/* Subtle background radial glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          <span className="px-3.5 py-1 rounded-full bg-white/20 text-white font-black text-xs uppercase tracking-wider backdrop-blur-sm">
            INSTANT LAUNCH · 100% FREE
          </span>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl leading-tight">
            Supercharge Your Team Operations Today.
          </h2>

          <p className="text-white/90 text-sm sm:text-lg max-w-2xl font-medium leading-relaxed">
            Join modern founders, HR leaders, and growing squads who manage attendance, payroll, assets, and tasks in one unified hub.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full sm:w-auto">
            <button
              onClick={() => onOpenAuth('up')}
              className="w-full sm:w-auto px-9 py-4 rounded-full bg-white text-black font-black text-sm sm:text-base shadow-md hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Create Free Workspace</span>
              <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onOpenAuth('in')}
              className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/15 border border-white/30 text-white font-bold text-sm sm:text-base hover:bg-white/25 active:scale-95 transition-all"
            >
              Sign In to Existing Space
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/80 font-medium pt-2">
            <span>✓ No credit card required</span>
            <span>✓ Instant 60-sec setup</span>
            <span>✓ Cancel or export anytime</span>
          </div>

        </div>
      </div>
    </section>
  )
}
