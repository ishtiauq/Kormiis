import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { burnoutApi, gigApi, lastMonthKey } from '../../services/hr.js'

const stat = (icon, label, value, tone, view, setCurrentView) => (
  <button key={label}
    onClick={() => setCurrentView && setCurrentView(view)}
    className="flex flex-col items-start gap-1 p-3 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 hover:border-border transition-colors cursor-pointer text-left w-full"
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}>
      <Icon name={icon} size={16}/>
    </div>
    <span className="text-fluid-xl font-black tabular-nums text-foreground">{value}</span>
    <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
  </button>
)

export default function HrOverview({ adminUid, currentUser, setCurrentView, addToast }) {
  const [counts, setCounts] = useState({ highRisk: 'â€”', gigs: 'â€”' })

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
          <CardTitle className="text-base font-extrabold m-0">People Insights</CardTitle>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auto-checked</span>
      </CardHeader>
      <div className="p-4 pt-0 grid grid-cols-2 gap-2.5 flex-1">
        {stat('favorite', 'Well-being risks', counts.highRisk, 'bg-red-500/10 text-red-600', 'wellbeing', setCurrentView)}
        {stat('workspaces', 'Open gigs', counts.gigs, 'bg-emerald-500/10 text-emerald-600', 'gigs', setCurrentView)}
      </div>
    </Card>
  )
}
