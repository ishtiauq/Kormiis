import React from 'react'
import Icon from "@/components/ui/Icon.jsx"

export default function ComparisonSection({ onOpenAuth }) {
  const comparisonRows = [
    {
      feature: 'Pricing Model',
      oldWay: '$10 - $25 per user/month + hidden fees',
      kormiisWay: '100% Free forever · Zero per-seat fees',
    },
    {
      feature: 'Setup & Onboarding',
      oldWay: '3 to 6 months of mandatory enterprise onboarding',
      kormiisWay: '60 seconds to create workspace & invite team',
    },
    {
      feature: 'Attendance Tracking',
      oldWay: 'Clunky hardware finger scanners or WhatsApp texts',
      kormiisWay: '1-tap verified GPS check-in on any phone/PC',
    },
    {
      feature: 'Payroll Processing',
      oldWay: 'Manual formula errors & re-typing spreadsheets',
      kormiisWay: 'Automated math synced from attendance logs',
    },
    {
      feature: 'Company Asset Tracking',
      oldWay: 'Lost in random Google Sheets or sticky notes',
      kormiisWay: 'Full inventory with warranty alerts & return audits',
    },
    {
      feature: 'Team Collaboration',
      oldWay: 'Separate apps for tasks, notices, and docs ($$$)',
      kormiisWay: 'All-in-one Kanban boards, notices & document hub',
    },
    {
      feature: 'Cloud Data Ownership',
      oldWay: 'Locked inside closed vendor databases',
      kormiisWay: 'Isolated secure cloud storage with strict access',
    },
  ]

  return (
    <section id="comparison" className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-bold text-foreground mb-3 shadow-sm">
            <Icon name="compare_arrows" size={14} className="text-foreground" />
            <span>THE HONEST COMPARISON</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Why Teams Are Leaving <span className="text-destructive">Legacy HR</span>
          </h2>
          <p className="text-fluid text-muted-foreground mt-3 font-medium">
            See how Kormiis replaces expensive bloatware with a frictionless, all-in-one experience.
          </p>
        </div>

        {/* Comparison Matrix Table */}
        <div className="w-full bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          
          {/* Header */}
          <div className="grid grid-cols-12 border-b border-border text-center">
            <div className="col-span-4 sm:col-span-4 p-4 sm:p-6 bg-muted/40 font-bold text-xs sm:text-sm text-foreground flex items-center justify-center">
              Capability / Feature
            </div>
            <div className="col-span-4 sm:col-span-4 p-4 sm:p-6 bg-destructive/5 font-bold text-xs sm:text-sm text-destructive flex items-center justify-center gap-1.5 border-x border-border">
              <Icon name="close" size={18} />
              <span className="hidden sm:inline">Legacy HR Software</span>
              <span className="sm:hidden">Legacy HR</span>
            </div>
            <div className="col-span-4 sm:col-span-4 p-4 sm:p-6 bg-primary text-primary-foreground font-black text-xs sm:text-base flex items-center justify-center gap-1.5 shadow-inner">
              <Icon name="check_circle" size={18} />
              <span>Kormiis</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border text-xs sm:text-sm">
            {comparisonRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 hover:bg-muted/20 transition-colors">
                {/* Feature Name */}
                <div className="col-span-4 sm:col-span-4 p-4 sm:p-5 font-bold text-foreground flex items-center">
                  {row.feature}
                </div>

                {/* Legacy Way */}
                <div className="col-span-4 sm:col-span-4 p-4 sm:p-5 text-muted-foreground bg-destructive/[0.02] border-x border-border flex items-center gap-2">
                  <Icon name="close" size={16} className="text-destructive shrink-0" />
                  <span className="leading-snug">{row.oldWay}</span>
                </div>

                {/* Kormiis Way */}
                <div className="col-span-4 sm:col-span-4 p-4 sm:p-5 font-semibold text-foreground bg-primary/[0.04] flex items-center gap-2">
                  <Icon name="check" size={16} className="text-foreground shrink-0" />
                  <span className="leading-snug">{row.kormiisWay}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="p-6 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="font-bold text-sm text-foreground">Ready to streamline your team's operations?</div>
              <div className="text-xs text-muted-foreground">Join hundreds of growing companies using Kormiis today.</div>
            </div>
            <button
              onClick={() => onOpenAuth('up')}
              className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Get Started in 60 Seconds
            </button>
          </div>

        </div>

      </div>
    </section>
  )
}
