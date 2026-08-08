import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { gigApi } from '../../services/hr.js'

const statusTone = {
  open: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  assigned: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  completed: 'bg-muted text-muted-foreground border-border',
}

export default function GigBoardPage({ adminUid, currentUser, employees, addToast }) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HR'
  const [view, setView] = useState('browse')
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', skills: '' })
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await gigApi.getOpenGigs({ view })
      const list = view === 'myPosted' ? res.myPosted : view === 'myAssigned' ? res.myAssigned : res.open
      setGigs(list || [])
      setSkills(res.skills || [])
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [view, addToast])

  useEffect(() => { load() }, [load])

  const toggleSkill = (skill) => {
    const has = skills.includes(skill)
    const skillApi = has ? gigApi.removeSkill : gigApi.addSkill
    skillApi({ skill }).then(() => { load(); addToast(has ? 'Skill removed.' : 'Skill added.', 'success') }).catch((e) => addToast(e.message, 'error'))
  }

  const submitGig = async () => {
    if (!form.title.trim() || !form.description.trim()) { addToast('Title and description are required.', 'error'); return }
    try {
      await gigApi.createGig({
        title: form.title.trim(),
        description: form.description.trim(),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      })
      addToast('Gig posted. Matching employees were notified.', 'success')
      setCreateOpen(false)
      setForm({ title: '', description: '', skills: '' })
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const act = async (gig, api, successMsg) => {
    try {
      const res = await api({ gigId: gig.id, userId: currentUser?.uid })
      addToast(successMsg, 'success')
      setExpanded(null)
      load()
      return res
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const assignGig = async (gig, applicantId) => {
    try {
      await gigApi.assignGig({ gigId: gig.id, applicantId })
      addToast('Gig assigned.', 'success')
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const tabBtn = (key, label, icon) => (
    <Button variant={view === key ? 'default' : 'ghost'} size="sm" onClick={() => setView(key)}>
      <Icon name={icon} size={14} className="mr-1.5" /> {label}
    </Button>
  )

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient m-0">
          <Icon name="workspaces" size={20} className="text-foreground" /> Gig Marketplace
        </h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="add" size={16} className="mr-1.5" /> Post a gig
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-muted/40 border border-border p-1">
          {tabBtn('browse', 'Browse', 'travel_explore')}
          {tabBtn('myPosted', 'My posted', 'inventory_2')}
          {tabBtn('myAssigned', 'My assigned', 'assignment_turned_in')}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">My skills</span>
          {skills.map((s) => (
            <Badge key={s} variant="outline" className="cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20" onClick={() => toggleSkill(s)}>
              {s} <Icon name="close" size={12} className="ml-1 opacity-60" />
            </Badge>
          ))}
          <Input placeholder="Add skill..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSkill.trim()) {
                gigApi.addSkill({ skill: newSkill.trim() }).then(() => { setNewSkill(''); load() }).catch((err) => addToast(err.message, 'error'))
              }
            }} className="w-36 h-8 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading gigs...</div>
      ) : gigs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Icon name="inventory_2" size={32} className="opacity-30 mx-auto mb-2" />
            No gigs in this view yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gigs.map((gig) => {
            const isPosted = gig.postedBy === currentUser?.uid
            const isAssigned = gig.assignedTo === currentUser?.uid
            const applied = gig.applicants?.includes(currentUser?.uid)
            const matching = gig.skillMatch && gig.skillMatch.length > 0
            return (
              <Card key={gig.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{gig.title}</CardTitle>
                    <Badge variant="outline" className={statusTone[gig.status] || 'bg-muted text-muted-foreground'}>
                      {gig.status}
                    </Badge>
                  </div>
                  {matching && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit">
                      <Icon name="bolt" size={12} className="mr-1" /> Matches your skills
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{gig.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {gig.skills?.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {gig.requiredSkill ? `Required: ${gig.requiredSkill}` : 'Open to everyone'}
                    </span>
                    <div className="flex items-center gap-2">
                      {gig.status === 'open' && !applied && !isPosted && (
                        <Button size="sm" onClick={() => act(gig, gigApi.applyForGig, 'Application submitted.')}>Apply</Button>
                      )}
                      {gig.status === 'open' && applied && (
                        <Badge variant="secondary">Applied</Badge>
                      )}
                      {gig.status === 'assigned' && isAssigned && (
                        <Button size="sm" onClick={() => act(gig, gigApi.completeGig, 'Marked as complete.')}>Mark complete</Button>
                      )}
                      {(isPosted || isAdmin) && gig.status === 'open' && (
                        <Select value={gig.assignedTo || ''} placeholder="Assign to..." className="w-[150px]"
                          onValueChange={(uid) => uid && assignGig(gig, uid)}>
                          {(gig.applicants || []).map((uid) => {
                            const emp = employees?.find((e) => e.id === uid)
                            return <SelectItem key={uid} value={uid}>{emp?.name || uid.slice(0, 6)}</SelectItem>
                          })}
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    {(gig.applicants || []).length > 0 && <span>{gig.applicants.length} applicant(s)</span>}
                    <span className="opacity-60">• posted by {gig.postedByName || gig.postedBy}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post a micro-gig</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Prepare monthly payroll export" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="What needs to be done, and by when?" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Skills needed (comma-separated)</label>
              <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="excel, design, content" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={submitGig}>Post gig</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
