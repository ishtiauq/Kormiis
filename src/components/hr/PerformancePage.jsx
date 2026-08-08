import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { performanceApi, currentMonthKey, lastMonthKey } from '../../services/hr.js'

const gradeTone = {
  A: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  B: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  C: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  D: 'bg-red-500/10 text-red-600 border-red-500/20',
}

export default function PerformancePage({ adminUid, currentUser, addToast }) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HR'
  const currentUserId = currentUser?.employeeId || currentUser?.id || currentUser?.uid
  const [month, setMonth] = useState(isAdmin ? lastMonthKey() : currentMonthKey())
  const [scores, setScores] = useState([])
  const [myScore, setMyScore] = useState(null)
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isAdmin) {
        const scoreRes = await performanceApi.getScores({ month })
        setScores(scoreRes.scores || [])
      } else {
        const myScoreRes = await performanceApi.getMyScore({ month })
        setMyScore(myScoreRes.score || null)
        if (currentUserId) {
          const trendRes = await performanceApi.getTrends({ employeeId: currentUserId })
          setTrends(trendRes.scores || [])
        }
      }
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, month, currentUserId, addToast])

  useEffect(() => { load() }, [load])

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const res = await performanceApi.calculate({ month })
      addToast(`Calculated scores for ${res.calculated || 0} employees.`, 'success')
      load()
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setCalculating(false)
    }
  }

  const avg = scores.length ? Math.round(scores.reduce((a, s) => a + (s.totalScore || s.score || 0), 0) / scores.length) : 0
  const top = scores.length ? [...scores].sort((a, b) => (b.totalScore || b.score || 0) - (a.totalScore || a.score || 0))[0] : null

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient m-0">
          <Icon name="insights" size={20} className="text-foreground" /> Performance Tracker
        </h1>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleCalculate} disabled={calculating}>
              <Icon name="calculate" size={14} className="mr-1.5" /> {calculating ? 'Calculating...' : 'Calculate month'}
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border border-headline" />

      {/* --- EMPLOYEE VIEW --- */}
      {!isAdmin && (
        <>
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading my performance score...</div>
          ) : !myScore ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <Icon name="analytics" size={32} className="opacity-30 mx-auto mb-2" />
                No performance score evaluated for {month} yet.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Performance Score • {month}</div>
                    <div className="text-4xl font-black tabular-nums text-foreground mt-1">
                      {myScore.totalScore ?? myScore.score ?? 0}<span className="text-base text-muted-foreground font-semibold">/100</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-base px-4 py-1 font-bold ${gradeTone[myScore.grade] || ''}`}>
                    Grade {myScore.grade || '—'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Evaluation Breakdown */}
              <Card>
                <CardHeader><CardTitle>Score Breakdown — {month}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On-Time Attendance</span>
                    <span className="text-2xl font-black text-emerald-600 mt-2">+{myScore.onTimePoints ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late Penalty</span>
                    <span className="text-2xl font-black text-rose-600 mt-2">-{myScore.latePenalty ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absence Penalty</span>
                    <span className="text-2xl font-black text-rose-600 mt-2">-{myScore.absencePenalty ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overtime Deduction</span>
                    <span className="text-2xl font-black text-amber-600 mt-2">-{myScore.overtimeDeduct ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Utilization</span>
                    <span className="text-2xl font-black text-emerald-600 mt-2">+{myScore.leaveUtilizationPoints ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Help Hub Contributions</span>
                    <span className="text-2xl font-black text-emerald-600 mt-2">+{myScore.gigPoints ?? 0} pts</span>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Monthly Trends */}
              {trends.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>My Monthly Performance Trend</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {trends.map((t) => (
                      <div key={t.yearMonth || t.month} className="flex items-center gap-3">
                        <span className="w-16 text-xs font-semibold text-muted-foreground tabular-nums">{t.yearMonth || t.month}</span>
                        <div className="flex-1 h-7 rounded-lg bg-muted/50 overflow-hidden p-0.5">
                          <div className="h-full rounded-md bg-primary flex items-center px-2.5 transition-all" style={{ width: `${Math.min(t.totalScore || t.score || 0, 100)}%` }}>
                            <span className="text-xs font-bold text-primary-foreground tabular-nums">{t.totalScore || t.score || 0} pts (Grade {t.grade})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* --- ADMIN VIEW --- */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Average Score</div>
                <div className="text-3xl font-black tabular-nums text-foreground mt-1">{loading ? '—' : avg} <span className="text-sm font-normal text-muted-foreground">pts</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Performer</div>
                <div className="text-xl font-bold text-foreground mt-1">{top ? top.employeeName : '—'}</div>
                <div className="text-xs text-muted-foreground">{top ? `${top.totalScore || top.score} pts (Grade ${top.grade})` : ''}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Employee Performance Tracker — {month}</CardTitle>
              <Badge variant="secondary">{scores.length} employees evaluated</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Loading scores...</div>
              ) : scores.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <Icon name="insights" size={28} className="opacity-30 mx-auto mb-2" />
                  No performance scores evaluated for this month yet. Click "Calculate month".
                </div>
              ) : (
                <div className="rounded-b-xl border-t border-border overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...scores].sort((a, b) => (b.totalScore || b.score || 0) - (a.totalScore || a.score || 0)).map((s, i) => (
                        <TableRow key={s.employeeId || s.id}>
                          <TableCell>
                            <div className="font-medium text-sm text-foreground">{s.employeeName}</div>
                            <div className="text-xs text-muted-foreground">{s.department || '—'}</div>
                          </TableCell>
                          <TableCell className="text-center font-bold tabular-nums text-base">{s.totalScore || s.score}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={gradeTone[s.grade] || ''}>{s.grade}</Badge>
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-muted-foreground font-semibold">#{i + 1}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
