import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { burnoutApi, gigApi, lastMonthKey } from '../../services/hr.js'

const stat = (icon, label, value, tone, view, setCurrentView) => (
  <button 
    key={label}
    onClick={() => setCurrentView && setCurrentView(view)}
    className="flex flex-col items-start gap-1 p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-black/55 transition-all active:scale-[0.98] cursor-pointer text-left w-full"
  >
    <div className={`size-7 rounded-xl flex items-center justify-center ${tone}`}>
      <Icon name={icon} size={15}/>
    </div>
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
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <Icon name="monitoring" size={18}/>
          </div>
          <CardTitle className="text-fluid-xl font-extrabold m-0">People Insights</CardTitle>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 h-6 flex items-center">
          Auto-checked
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col justify-between pt-1">
        <div className="grid grid-cols-2 gap-2.5 py-1">
          {stat('favorite', 'Well-being risks', counts.highRisk, 'bg-red-500/10 text-red-600 dark:text-red-400', 'wellbeing', setCurrentView)}
          {stat('workspaces', 'Open gigs', counts.gigs, 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', 'gigs', setCurrentView)}
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
