import React from 'react'
import { motion } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import { 
  AttendanceSketch, 
  PayrollSketch, 
  LeavesSketch, 
  AssetsSketch, 
  CollaborationSketch 
} from './SketchIllustrations.jsx'

export default function FeaturePillars() {
  return (
    <section id="features" className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto flex flex-col gap-20 sm:gap-28">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-bold text-foreground mb-3 shadow-sm">
            <Icon name="hub" size={14} className="text-foreground" />
            <span>ENTERPRISE-GRADE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Engineered for <span className="text-primary">High-Velocity</span> Teams
          </h2>
          <p className="text-fluid text-muted-foreground mt-4 font-medium">
            Everything your operations team needs — unified in a single, lightning-fast workspace with zero subscriptions.
          </p>
        </div>

        {/* PILLAR 1: Time & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="lg:col-span-6 flex flex-col gap-6 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
              <span className="w-6 h-px bg-foreground" />
              <span>Pillar 01 // Time & Location</span>
            </div>
            
            <h3 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
              Attendance that flows straight into payroll without spreadsheets.
            </h3>

            <p className="text-fluid text-muted-foreground leading-relaxed">
              Eliminate buddy punching and manual timesheet entry. Teammates clock in with verified GPS location in milliseconds, and the system automatically calculates daily hours, late arrivals, and overtime.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Icon name="location_on" size={18} className="text-foreground" />
                  <span>GeoCheckIn Radius</span>
                </div>
                <p className="text-xs text-muted-foreground">Configurable 50m to 500m geofences for office or remote staff.</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Icon name="calendar_month" size={18} className="text-foreground" />
                  <span>Roster & Shift Swaps</span>
                </div>
                <p className="text-xs text-muted-foreground">Weekly shift planning with 1-tap swap requests and manager approval.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 flex items-center justify-center p-4 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
            <AttendanceSketch className="w-full h-auto max-h-[320px] drop-shadow-sm" />
          </div>
        </div>

        {/* PILLAR 2: Automated Payroll & Multi-Currency */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="lg:col-span-6 flex items-center justify-center p-4 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
            <PayrollSketch className="w-full h-auto max-h-[320px] drop-shadow-sm" />
          </div>

          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
              <span className="w-6 h-px bg-foreground" />
              <span>Pillar 02 // Automated Finance</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
              One-click payroll calculations with multi-currency support.
            </h3>

            <p className="text-fluid text-muted-foreground leading-relaxed">
              No more weekend payroll math. Kormiis connects timesheet logs, approved overtime claims, and leave deductions into compliant salary slips ready for PDF export or direct bank disbursement.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Icon name="currency_exchange" size={18} className="text-foreground" />
                  <span>Global Currencies</span>
                </div>
                <p className="text-xs text-muted-foreground">Native support for Bangladeshi Taka (৳), USD ($), EUR (€), and GBP (£).</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Icon name="receipt_long" size={18} className="text-foreground" />
                  <span>Automated PDF Payslips</span>
                </div>
                <p className="text-xs text-muted-foreground">Generate and download branded payslips for the whole company in 1 click.</p>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 3: Assets & Leave Quotas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="lg:col-span-6 flex flex-col gap-6 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
              <span className="w-6 h-px bg-foreground" />
              <span>Pillar 03 // Operations & Assets</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
              Keep company equipment, leave quotas & docs under control.
            </h3>

            <p className="text-fluid text-muted-foreground leading-relaxed">
              Track company laptops, monitors, smartphones, and keys with serial tracking and warranty expiry alerts. Manage Sick, Casual, and Annual leave quotas with 1-click approvals.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Icon name="devices" size={18} className="text-foreground" />
                  <span>Hardware Lifecycle</span>
                </div>
                <p className="text-xs text-muted-foreground">Assign devices to employees with condition logs and return audits.</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <Icon name="event_available" size={18} className="text-foreground" />
                  <span>Leave Quota Tracking</span>
                </div>
                <p className="text-xs text-muted-foreground">Automated balances for Sick, Casual, and Annual vacation days.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center justify-center">
              <AssetsSketch className="w-full h-auto max-h-[220px]" />
              <span className="text-[11px] font-bold text-foreground mt-2">Hardware Asset Registry</span>
            </div>
            <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center justify-center">
              <LeavesSketch className="w-full h-auto max-h-[220px]" />
              <span className="text-[11px] font-bold text-foreground mt-2">Leave Balances & Approvals</span>
            </div>
          </div>
        </div>

        {/* PILLAR 4: Team Collaboration & Documents */}
        <div className="p-6 sm:p-10 rounded-3xl bg-card border border-border shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
              <Icon name="badge" size={14} className="text-foreground" />
              <span>Teammate Experience</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-foreground tracking-tight">
              One central portal for your entire squad.
            </h3>
            <p className="text-fluid text-muted-foreground leading-relaxed">
              Teammates get their own mobile-friendly self-service portal: punch clock, view upcoming roster shifts, claim expenses with photo receipts, download payslips, access company documents, and view townhall announcements.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['Kanban Tasks', 'Document Categories', 'Pinned Notices', 'Expense Claims', 'Mobile PWA'].map((pill) => (
                <span key={pill} className="px-3 py-1 rounded-full bg-muted text-foreground text-xs font-bold border border-border">
                  ✓ {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center justify-center">
            <CollaborationSketch className="w-full h-auto max-h-[240px]" />
          </div>
        </div>

      </div>
    </section>
  )
}
