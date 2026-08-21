import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { burnoutApi, gigApi, lastMonthKey } from '../../services/hr.js'

const stat = (icon, label, value, toneColor, iconBg, view, setCurrentView) => (
  <button 
    key={label}
    onClick={() => setCurrentView && setCurrentView(view)}
    className="flex flex-col items-start gap-1 p-3 sm:p-3.5 rounded-2xl liquid-widget-item cursor-pointer text-left w-full active:scale-[0.98]"
  >
    <div className={`size-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10`}>
      <Icon name={icon} size={20} className={toneColor}/>
    </div>
    <span className="text-fluid-xl font-black tabular-nums text-foreground leading-tight mt-1.5">{value}</span>
    <span className="text-[11px] font-semibold text-muted-foreground truncate w-full">{label}</span>
  </button>
)

export default function HrOverview({ adminUid, currentUser, setCurrentView, addToast }) {
  const [counts, setCounts] = useState({ highRisk: '-', gigs: '-' })

  const load = useCallback(async () => {
    if (!adminUid) return
    const results = await Promise.allSettled([
      burnoutApi.getBurnoutRisks({ month: lastMonthKey() }),
      gigApi.getOpenGigs({ view: 'browse' }),
    ])
    const [wb, gg] = results.map((r) => (r.status === 'fulfilled' ? r.value : null))
    setCounts({
      highRisk: wb?.highRiskCount ?? 0,
      gigs: gg?.gigs?.length ?? 0,
    })
  }, [adminUid])

  useEffect(() => { load() }, [load])

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HR'
  if (!isAdmin) return null

  return (
    <Card className="flex flex-col p-0 h-full">
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-2xl bg-white/60 dark:bg-white/[0.08] border border-white/50 dark:border-white/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center shrink-0">
            <Icon name="monitoring" className="text-primary shrink-0" size={22}/>
          </div>
          <CardTitle className="text-fluid-lg font-bold text-foreground m-0">People Insights</CardTitle>
        </div>
        <button 
          onClick={() => setCurrentView && setCurrentView('wellbeing')} 
          className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer"
        >
          HR Hub
        </button>
      </CardHeader>

      <CardContent className="flex-1 p-4 sm:p-5 flex flex-col justify-between pt-1">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 py-1">
          {stat('favorite', 'Well-being risks', counts.highRisk, 'text-rose-500', 'bg-rose-500/15', 'wellbeing', setCurrentView)}
          {stat('workspaces', 'Open gigs', counts.gigs, 'text-emerald-500', 'bg-emerald-500/15', 'gigs', setCurrentView)}
        </div>

        <div className="mt-3.5 pt-3 border-t border-border/80 dark:border-white/10 flex justify-between items-center text-xs font-semibold text-muted-foreground">
          <span>Pulse Condition</span>
          <span className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <span className="pulse-dot pulse-dot-green m-0"></span> Optimal
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
