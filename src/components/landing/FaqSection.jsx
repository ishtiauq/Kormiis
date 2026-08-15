import React, { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  const faqs = [
    {
      q: 'Is Kormiis really 100% free with no per-seat charges?',
      a: 'Yes. Creating a Business Space is completely free. There are no credit card requirements, no per-user license fees, and no artificial employee limits for growing teams.',
    },
    {
      q: 'How does 1-tap GPS attendance work?',
      a: 'Teammates simply open Kormiis on their phone or computer browser and tap "Clock In". If GeoCheckIn is enabled by the admin, the app verifies their GPS location against the designated workplace geofence (e.g. 50m radius) without installing tracking spyware.',
    },
    {
      q: 'How do teammates join our company workspace?',
      a: 'Admins invite employees via their work email from the Employee directory. Teammates then sign in with their Google or Email account and are automatically linked to your company workspace — no manual setup or passwords required.',
    },
    {
      q: 'Can we configure custom salary structures and local currencies?',
      a: 'Absolutely. You can define custom Basic Pay, House Rent (e.g. 40%), Medical allowances, Overtime rates, and Tax withholdings in Bangladeshi Taka (৳), USD ($), EUR (€), GBP (£), or INR (₹). Payslips generate and export to PDF in 1 click.',
    },
    {
      q: 'How does hardware asset management work?',
      a: 'Admins can log company laptops, monitors, phones, and equipment with serial tags, purchase dates, condition ratings, and assigned teammates. The platform automatically tracks warranty expiry countdowns and keeps an audit log of returns.',
    },
    {
      q: 'Does Kormiis work on mobile as an app (PWA)?',
      a: 'Yes! Kormiis is a Progressive Web App (PWA). You can install it straight to your iOS or Android home screen from your browser for an ultra-fast, native-app feel with instant clock-ins.',
    },
    {
      q: 'Where is our company data stored and who owns it?',
      a: 'All data is stored in isolated, secure Firebase cloud database partitions with strict security rules. Only authorized members of your company can access your records. You maintain 100% ownership and can export anytime.',
    },
  ]

  return (
    <section id="faq" className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-bold text-foreground mb-3 shadow-sm">
            <Icon name="help" size={14} className="text-foreground" />
            <span>GOT QUESTIONS?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-fluid text-muted-foreground mt-3 font-medium">
            Everything you need to know about setting up Kormiis for your team.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="w-full flex flex-col gap-3 sm:gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className={`w-full rounded-2xl border bg-card transition-all overflow-hidden ${
                  isOpen ? 'border-foreground/30 shadow-sm' : 'border-border'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-bold text-sm sm:text-base text-foreground leading-snug">
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-foreground text-background' : 'text-foreground'}`}>
                    <Icon name="expand_more" size={20} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 mt-1 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
