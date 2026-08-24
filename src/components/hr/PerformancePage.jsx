import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import GlassMonthPicker from "@/components/ui/GlassMonthPicker.jsx"
import { performanceApi, currentMonthKey, lastMonthKey } from '../../services/hr.js'

const gradeTone = {
  A: 'bg-black/15 dark:bg-white/20 text-foreground border-black/20 dark:border-white/25 font-bold',
  B: 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20',
  C: 'bg-black/5 dark:bg-white/10 text-foreground border-black/10 dark:border-white/15',
  D: 'bg-black/20 dark:bg-white/25 text-foreground border-black/25 dark:border-white/30',
}

const DEFAULT_WEIGHTS = {
  on_time: 30,
  late_penalty: 10,
  absence_penalty: 20,
  overtime_discourage: 10,
  leave_utilization: 10,
  gig_contribution: 20,
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
  const [selectedSortGrade, setSelectedSortGrade] = useState(null)

  // Evaluation Criteria Weights State
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false)
  const [editWeights, setEditWeights] = useState(DEFAULT_WEIGHTS)
  const [savingCriteria, setSavingCriteria] = useState(false)
  const [weightError, setWeightError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch current criteria weights
      try {
        const wRes = await performanceApi.getWeights()
        if (wRes && wRes.weights) {
          setWeights(wRes.weights)
        }
      } catch (e) {}

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
        try {
          const topRes = await performanceApi.getTopPerformers({ month })
          setScores(topRes.topPerformers || [])
        } catch (e) {
          console.error("Failed to fetch top performers", e)
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

  const openEditCriteria = () => {
    setEditWeights({ ...weights })
    setWeightError(null)
    setCriteriaModalOpen(true)
  }

  const handleSaveCriteria = async () => {
    const total = Object.values(editWeights).reduce((acc, val) => acc + (Number(val) || 0), 0)
    if (total !== 100) {
      setWeightError(`Total weights must be exactly 100. Currently it is ${total}.`)
      return
    }
    setWeightError(null)
    setSavingCriteria(true)
    try {
      await performanceApi.updateWeights({ weights: editWeights })
      addToast('Evaluation criteria weights updated.', 'success')
      setWeights(editWeights)
      setCriteriaModalOpen(false)
      load()
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setSavingCriteria(false)
    }
  }

  const topPerformers = scores.length ? [...scores].sort((a, b) => (b.totalScore || b.score || 0) - (a.totalScore || a.score || 0)).slice(0, 3) : []

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground m-0">
          <Icon name="insights" className="text-foreground shrink-0" size={28}/> Performance Tracker
        </h1>
        <div className="flex items-center gap-2.5">
          <GlassMonthPicker 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
          />
          {isAdmin && (
            <Button size="sm" variant="default" onClick={handleCalculate} disabled={calculating} className="rounded-2xl shadow-sm h-10 px-4">
              <Icon name="calculate" className="mr-1.5" size={15}/> {calculating ? 'Calculating...' : 'Calculate month'}
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border border-headline" />

      {/* --- EVALUATION CRITERIA OVERVIEW CARD --- */}
      <Card className="border border-border/80 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Icon name="rule" className="text-primary" size={18}/>
            <CardTitle className="text-base font-bold">Evaluation Criteria</CardTitle>
          </div>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold rounded-full text-primary hover:text-primary hover:bg-primary/10" onClick={openEditCriteria}>
              <Icon name="edit" className="mr-1" size={14}/> Edit Criteria
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-0">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="check_circle" className="text-emerald-500" size={15}/> On-Time Attendance
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                +{weights.on_time || 30} pts
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5">Rewarded based on percentage of on-time workdays.</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="schedule" className="text-rose-500" size={15}/> Late Arrival Penalty
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-rose-500/10 text-rose-600 border-rose-500/20">
                -{weights.late_penalty || 10} pts
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5">Deducted for late check-ins beyond grace period.</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="cancel" className="text-rose-500" size={15}/> Absence Penalty
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-rose-500/10 text-rose-600 border-rose-500/20">
                -{weights.absence_penalty || 20} pts
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5">Deducted for unexcused absences without leave.</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="more_time" className="text-amber-500" size={15}/> Overtime Deduction
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-amber-500/10 text-amber-600 border-amber-500/20">
                -{weights.overtime_discourage || 10} pts
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5">Deducted if monthly check-out overtime exceeds 20 hours.</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="beach_access" className="text-emerald-500" size={15}/> Leave Utilization
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                +{weights.leave_utilization || 10} pts
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5">Rewarded for taking healthy, approved time off.</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="handshake" className="text-emerald-500" size={15}/> Help Hub Contributions
              </span>
              <Badge variant="secondary" className="text-xs font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                +{weights.gig_contribution || 20} pts
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5">Rewarded for completing requests helping colleagues.</span>
          </div>
        </CardContent>

        {/* Grade Threshold Scale */}
        <div className="mx-6 mb-5 flex flex-col gap-2">
          <div className="text-xs font-bold text-foreground flex items-center gap-1.5 px-1">
            <Icon name="military_tech" className="text-amber-500" size={16}/>
            <span>Performance Grade Scale</span>
          </div>
          <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
            <div role="tablist" className="menu-bar">
              <Button
                role="tab"
                aria-selected={selectedSortGrade === 'A'}
                variant={selectedSortGrade === 'A' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full px-4 justify-center ${selectedSortGrade !== 'A' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
                onClick={() => isAdmin && setSelectedSortGrade(prev => prev === 'A' ? null : 'A')}
              >
                Grade A (85 - 100 pts)
              </Button>
              <Button
                role="tab"
                aria-selected={selectedSortGrade === 'B'}
                variant={selectedSortGrade === 'B' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full px-4 justify-center ${selectedSortGrade !== 'B' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
                onClick={() => isAdmin && setSelectedSortGrade(prev => prev === 'B' ? null : 'B')}
              >
                Grade B (70 - 84 pts)
              </Button>
              <Button
                role="tab"
                aria-selected={selectedSortGrade === 'C'}
                variant={selectedSortGrade === 'C' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full px-4 justify-center ${selectedSortGrade !== 'C' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
                onClick={() => isAdmin && setSelectedSortGrade(prev => prev === 'C' ? null : 'C')}
              >
                Grade C (50 - 69 pts)
              </Button>
              <Button
                role="tab"
                aria-selected={selectedSortGrade === 'D'}
                variant={selectedSortGrade === 'D' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full px-4 justify-center ${selectedSortGrade !== 'D' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
                onClick={() => isAdmin && setSelectedSortGrade(prev => prev === 'D' ? null : 'D')}
              >
                Grade D (0 - 49 pts)
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* --- EMPLOYEE VIEW --- */}
      {!isAdmin && (
        <>
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading my performance score...</div>
          ) : !myScore ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <Icon name="analytics" className="opacity-30 mx-auto mb-2" size={32}/>
                No performance score evaluated for {month} yet.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border border-border/80 shadow-sm rounded-2xl">
                <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Performance Score • {month}</div>
                    <div className="text-fluid-display font-black tabular-nums text-foreground mt-1">
                      {myScore.totalScore ?? myScore.score ?? 0}<span className="text-fluid-sm text-muted-foreground font-semibold">/100</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-base px-4 py-1 font-bold ${gradeTone[myScore.grade] || ''}`}>
                    Grade {myScore.grade || 'N/A'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Evaluation Breakdown */}
              <Card className="border border-border/80 shadow-sm rounded-2xl">
                <CardHeader><CardTitle className="text-base font-bold">Score Breakdown • {month}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-0">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On-Time Attendance</span>
                    <span className="text-fluid-2xl font-black text-emerald-600 mt-2">+{myScore.onTimePoints ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late Penalty</span>
                    <span className="text-fluid-2xl font-black text-rose-600 mt-2">-{myScore.latePenalty ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absence Penalty</span>
                    <span className="text-fluid-2xl font-black text-rose-600 mt-2">-{myScore.absencePenalty ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overtime Deduction</span>
                    <span className="text-fluid-2xl font-black text-amber-600 mt-2">-{myScore.overtimeDeduct ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Utilization</span>
                    <span className="text-fluid-2xl font-black text-emerald-600 mt-2">+{myScore.leaveUtilizationPoints ?? 0} pts</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Help Hub Contributions</span>
                    <span className="text-fluid-2xl font-black text-emerald-600 mt-2">+{myScore.gigPoints ?? 0} pts</span>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Monthly Trends */}
              {trends.length > 0 && (
                <Card className="border border-border/80 shadow-sm rounded-2xl">
                  <CardHeader><CardTitle className="text-base font-bold">My Monthly Performance Trend</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-0">
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
              )}              {/* Top Performers for Employee View */}
              {topPerformers.length > 0 && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <Card className="border border-border/80 shadow-sm rounded-2xl">
                    <CardContent className="p-5">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Performers • {month}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {topPerformers.map((p, i) => (
                          <div key={p.employeeId || p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                            <div className="flex items-center gap-2.5">
                              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">#{i + 1}</div>
                              <span className="text-sm font-bold text-foreground break-words max-w-[120px]" title={p.employeeName}>{p.employeeName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground tabular-nums">{p.totalScore || p.score} pts</span>
                              <Badge variant="outline" className={`px-1.5 py-0 h-5 text-[10px] ${gradeTone[p.grade] || ''}`}>{p.grade}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* --- ADMIN VIEW --- */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 gap-4">
            <Card className="border border-border/80 shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Performers</div>
                {topPerformers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topPerformers.map((p, i) => (
                      <div key={p.employeeId || p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                        <div className="flex items-center gap-2.5">
                          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">#{i + 1}</div>
                          <span className="text-sm font-bold text-foreground break-words max-w-[120px]" title={p.employeeName}>{p.employeeName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground tabular-nums">{p.totalScore || p.score} pts</span>
                          <Badge variant="outline" className={`px-1.5 py-0 h-5 text-[10px] ${gradeTone[p.grade] || ''}`}>{p.grade}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No top performers recorded yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/80 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-bold">Employee Performance Tracker • {month}</CardTitle>
              <Badge variant="secondary">{scores.length} employees evaluated</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Loading scores...</div>
              ) : scores.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <Icon name="insights" className="opacity-30 mx-auto mb-2" size={28}/>
                  No performance scores evaluated for this month yet. Click "Calculate month".
                </div>
              ) : (
                <div className="rounded-b-2xl border-t border-border overflow-x-auto">
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
                      {[...scores].sort((a, b) => {
                        if (selectedSortGrade) {
                          if (a.grade === selectedSortGrade && b.grade !== selectedSortGrade) return -1;
                          if (b.grade === selectedSortGrade && a.grade !== selectedSortGrade) return 1;
                        }
                        return (b.totalScore || b.score || 0) - (a.totalScore || a.score || 0);
                      }).map((s, i) => (
                        <TableRow key={s.employeeId || s.id}>
                          <TableCell>
                            <div className="font-medium text-sm text-foreground">{s.employeeName}</div>
                            <div className="text-xs text-muted-foreground">{s.department || 'General'}</div>
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

      {/* --- EDIT CRITERIA WEIGHTS DIALOG (ADMIN ONLY) --- */}
      <Dialog open={criteriaModalOpen} onOpenChange={setCriteriaModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-5 border border-border/80 bg-card text-card-foreground shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <Icon name="tune" className="text-primary shrink-0" size={28}/>
              <div>
                <DialogTitle className="text-base font-bold">Configure Evaluation Criteria</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Adjust maximum point weightages and penalty deductions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Explicit Separator for perfect spacing */}
          <div className="w-full h-px bg-border shrink-0 my-5" />

          <div className="flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-5 border-b border-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">On-Time Attendance (Max Pts)</label>
                <Input
                  type="number"
                  value={editWeights.on_time ?? 30}
                  onChange={(e) => setEditWeights({ ...editWeights, on_time: Number(e.target.value) })}
                  className="h-9 rounded-xl border-input bg-background text-xs font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Late Penalty (Max Pts)</label>
                <Input
                  type="number"
                  value={editWeights.late_penalty ?? 10}
                  onChange={(e) => setEditWeights({ ...editWeights, late_penalty: Number(e.target.value) })}
                  className="h-9 rounded-xl border-input bg-background text-xs font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Absence Penalty (Max Pts)</label>
                <Input
                  type="number"
                  value={editWeights.absence_penalty ?? 20}
                  onChange={(e) => setEditWeights({ ...editWeights, absence_penalty: Number(e.target.value) })}
                  className="h-9 rounded-xl border-input bg-background text-xs font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Overtime Deduct (Max Pts)</label>
                <Input
                  type="number"
                  value={editWeights.overtime_discourage ?? 10}
                  onChange={(e) => setEditWeights({ ...editWeights, overtime_discourage: Number(e.target.value) })}
                  className="h-9 rounded-xl border-input bg-background text-xs font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Leave Utilization (Max Pts)</label>
                <Input
                  type="number"
                  value={editWeights.leave_utilization ?? 10}
                  onChange={(e) => setEditWeights({ ...editWeights, leave_utilization: Number(e.target.value) })}
                  className="h-9 rounded-xl border-input bg-background text-xs font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Help Hub Contributions (Pts)</label>
                <Input
                  type="number"
                  value={editWeights.gig_contribution ?? 20}
                  onChange={(e) => setEditWeights({ ...editWeights, gig_contribution: Number(e.target.value) })}
                  className="h-9 rounded-xl border-input bg-background text-xs font-bold"
                />
              </div>
            </div>

            {weightError && (
              <div className="text-xs font-semibold text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 mt-5">
                {weightError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-5">
              <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setCriteriaModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="rounded-full px-5 shadow-sm" onClick={handleSaveCriteria} disabled={savingCriteria}>
                <Icon name="check" className="mr-1.5" size={15}/>
                {savingCriteria ? 'Saving...' : 'Save Criteria'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
