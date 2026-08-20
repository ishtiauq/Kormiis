import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { burnoutApi, gigApi, lastMonthKey } from '../../services/hr.js'

const stat = (icon, label, value, toneColor, view, setCurrentView) => (
  <button 
    key={label}
    onClick={() => setCurrentView && setCurrentView(view)}
    className="flex flex-col items-start gap-1 p-2.5 sm:p-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.08] transition-all active:scale-[0.98] cursor-pointer text-left w-full shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none"
  >
    <Icon name={icon} size={28} className={toneColor}/>
    <span className="text-fluid-xl font-black tabular-nums text-foreground leading-tight mt-0.5">{value}</span>
    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate w-full">{label}</span>
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
          <Icon name="monitoring" className="text-primary shrink-0" size={28}/>
          <CardTitle className="text-fluid-xl font-extrabold m-0">People Insights</CardTitle>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 h-6 flex items-center">
          Auto-checked
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col justify-between pt-1">
        <div className="grid grid-cols-2 gap-2.5 py-1">
          {stat('favorite', 'Well-being risks', counts.highRisk, 'text-red-500', 'wellbeing', setCurrentView)}
          {stat('workspaces', 'Open gigs', counts.gigs, 'text-emerald-500', 'gigs', setCurrentView)}
        </div>

        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-xs font-medium text-muted-foreground">
          <span>Pulse Condition</span>
          <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
            <span className="pulse-dot pulse-dot-green m-0"></span> Optimal
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
