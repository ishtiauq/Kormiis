import React from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { SecuritySketch } from './SketchIllustrations.jsx'

export default function SecurityCloudSection() {
  const securityPillars = [
    {
      icon: 'lock',
      title: 'Tenant-Isolated Spaces',
      desc: 'Each company operates within its own private cloud boundary with role-based access rules.',
    },
    {
      icon: 'security',
      title: 'AES-256 Cloud Encryption',
      desc: 'All attendance logs, payroll calculations, and documents are encrypted at rest and in transit.',
    },
    {
      icon: 'cloud_sync',
      title: 'Real-Time Sync & Backup',
      desc: 'Instant synchronization across devices backed by Google Firebase high-availability infrastructure.',
    },
    {
      icon: 'file_download',
      title: 'Zero Vendor Lock-In',
      desc: 'Export your employee roster, attendance records, and payroll data in standard CSV/PDF formats anytime.',
    },
  ]

  return (
    <section id="security" className="relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-bold text-foreground mb-3 shadow-sm">
            <Icon name="verified_user" size={14} className="text-foreground" />
            <span>DATA INTEGRITY & PRIVACY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Your Company Data. <span className="text-primary">Your Rules</span>.
          </h2>
          <p className="text-fluid text-muted-foreground mt-3 font-medium">
            We believe your operational data belongs to you. Built from the ground up with private cloud isolation and zero third-party monetization.
          </p>
        </div>

        {/* Security Blueprint Sketch Illustration */}
        <div className="w-full p-4 sm:p-8 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-center mb-12">
          <SecuritySketch className="w-full h-auto max-h-[340px] drop-shadow-sm" />
        </div>

        {/* 4-Grid Security Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
          {securityPillars.map((item, i) => (
            <div key={i} className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-2.5">
              <Icon name={item.icon} size={36} className="text-foreground shrink-0" />
              <h3 className="font-bold text-sm text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
