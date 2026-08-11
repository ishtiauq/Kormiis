import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { burnoutApi, lastMonthKey } from '../../services/hr.js'

const scoreTone = (s) => {
  if (s >= 85) return 'bg-red-500/10 text-red-600 border-red-500/20'
  if (s >= 65) return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  if (s > 50) return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
}

export default function WellbeingPage({ adminUid, currentUser, addToast }) {
  const [month, setMonth] = useState(lastMonthKey())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async (m) => {
    setLoading(true)
    try {
      setData(await burnoutApi.getBurnoutRisks({ month: m }))
    } catch (e) {
      addToast('Failed to load well-being risks: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load(month) }, [month, load])

  const handleAcknowledge = async (risk) => {
    try {
      await burnoutApi.acknowledgeRiskAlert({ docId: risk.id })
      addToast('Alert acknowledged.', 'success')
      load(month)
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const res = await burnoutApi.runNow({ month })
      addToast(`Analyzed ${res.analyzed} employees for ${res.month}.`, 'success')
      load(month)
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  const risks = data?.risks || []

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient m-0">
          <Icon name="favorite" className="text-foreground" size={20}/> Well-being Alerts
        </h1>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          <Button variant="outline" size="sm" onClick={handleRunNow} disabled={running}>
            <Icon name="refresh" className="mr-1.5" size={14}/> {running ? 'Running...' : 'Run analysis'}
          </Button>
        </div>
      </div>

      <div className="border-t border-border border-headline" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">High-risk employees</div>
            <div className="text-fluid-display font-black tabular-nums text-destructive mt-1">{loading ? 'Ã¢â‚¬â€' : data?.highRiskCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Threshold</div>
            <div className="text-fluid-display font-black tabular-nums text-foreground mt-1">{data?.threshold ?? 50}+</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Month</div>
            <div className="text-fluid-display font-black tabular-nums text-foreground mt-1">{data?.month || month}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Flagged employees</CardTitle>
          <Badge variant="secondary">{risks.length} flagged</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>
          ) : risks.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Icon name="favorite_border" className="opacity-30 mx-auto mb-2" size={28}/>
              No employees exceeded the risk threshold for this month.
            </div>
          ) : (
            <div className="rounded-b-xl border-t border-border overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Mon/Fri Sick</TableHead>
                    <TableHead className="text-center">Avg Late (min)</TableHead>
                    <TableHead className="text-center">Unauth. Absences</TableHead>
                    <TableHead className="text-center">Login Drop</TableHead>
                    <TableHead className="text-center">Risk Score</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{r.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{r.department || 'Ã¢â‚¬â€'}</div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{r.mondayFridaySickCount}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.averageLateMinutes}</TableCell>
                      <TableCell className="text-center tabular-nums">{r.unauthorizedAbsenceCount}</TableCell>
                      <TableCell className="text-center">
                        {r.loginDropFlag
                          ? <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Yes</Badge>
                          : <span className="text-xs text-muted-foreground">No</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={scoreTone(r.riskScore)}>{r.riskScore}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.alertSent ? (
                          <span className="text-xs text-muted-foreground">Acknowledged</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAcknowledge(r) }}>
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {expanded && (
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Ã¢â‚¬â€ {risks.find(r => r.id === expanded)?.employeeName}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const r = risks.find(x => x.id === expanded)
              if (!r) return null
              const breakdown = [
                { label: 'Mon/Fri sick leave x 15', value: r.mondayFridaySickCount, points: r.mondayFridaySickCount * 15 },
                { label: 'Avg late minutes x 2', value: r.averageLateMinutes, points: Math.round(r.averageLateMinutes * 2) },
                { label: 'Unauthorized absences x 20', value: r.unauthorizedAbsenceCount, points: r.unauthorizedAbsenceCount * 20 },
                { label: 'Login drop > 50%', value: r.loginDropFlag ? 'Yes' : 'No', points: r.loginDropFlag ? 30 : 0 },
              ]
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {breakdown.map((b) => (
                    <div key={b.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                      <span className="text-sm text-foreground">{b.label}</span>
                      <span className="font-bold tabular-nums">{b.points}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 sm:col-span-2">
                    <span className="text-sm font-semibold text-foreground">Total risk score</span>
                    <span className="font-black text-lg tabular-nums text-foreground">{r.riskScore}/100</span>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
