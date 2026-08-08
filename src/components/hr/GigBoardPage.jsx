import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { gigApi } from '../../services/hr.js'

const statusTone = {
  open: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  accepted: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
}

function formatExpiry(isoString) {
  if (!isoString) return null
  const dt = new Date(isoString)
  const diffMs = dt - Date.now()
  if (diffMs <= 0) return 'Expired (Auto-deleted)'
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (diffHrs > 24) {
    return `Expires: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffHrs > 0) {
    return `Destroys in ${diffHrs}h ${diffMins}m`
  }
  return `Destroys in ${diffMins}m`
}

export default function GigBoardPage({ adminUid, currentUser, addToast }) {
  const [tab, setTab] = useState('browse')
  const [gigs, setGigs] = useState([])
  const [myEmpId, setMyEmpId] = useState(null)
  const [loading, setLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await gigApi.getOpenGigs()
      setMyEmpId(res.myEmployeeId)
      if (tab === 'browse') setGigs(res.open || [])
      else if (tab === 'myPosted') setGigs(res.myPosted || [])
      else setGigs(res.myAssigned || [])
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [tab, addToast])

  useEffect(() => { load() }, [load])

  const submitGig = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      addToast('Title and description are required.', 'error')
      return
    }
    try {
      await gigApi.createGig({
        title: form.title.trim(),
        description: form.description.trim(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      })
      addToast('Help request posted successfully.', 'success')
      setCreateOpen(false)
      setForm({
        title: '',
        description: '',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      })
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const offerHelp = async (gig) => {
    try {
      await gigApi.offerHelp({ gigId: gig.id })
      addToast('Your offer to help was sent!', 'success')
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const acceptHelp = async (gig, helperId) => {
    try {
      await gigApi.acceptHelp({ gigId: gig.id, helperId })
      addToast('Help accepted successfully!', 'success')
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const markComplete = async (gig) => {
    try {
      await gigApi.completeGig({ gigId: gig.id })
      addToast('Task marked as complete.', 'success')
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const tabBtn = (key, label, icon) => (
    <button
      onClick={() => setTab(key)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
        tab === key
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
      }`}
    >
      <Icon name={icon} size={14} /> {label}
    </button>
  )

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient m-0">
          <Icon name="handshake" size={22} className="text-foreground" /> Peer Help & Gigs
        </h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="add" size={16} className="mr-1.5" /> Post a help request
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-muted/40 border border-border p-1">
          {tabBtn('browse', 'Browse Requests', 'travel_explore')}
          {tabBtn('myPosted', 'My Requests', 'inventory_2')}
          {tabBtn('myAssigned', 'Helping Out', 'assignment_turned_in')}
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading help requests...</div>
      ) : gigs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Icon name="handshake" size={32} className="opacity-30 mx-auto mb-2" />
            No active help requests in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gigs.map((gig) => {
            const isPosted = gig.postedBy === myEmpId
            const isAccepted = gig.status === 'accepted'
            const isCompleted = gig.status === 'completed'
            const offers = gig.offers || []
            const expiryText = formatExpiry(gig.expiresAt)

            return (
              <Card key={gig.id} className="flex flex-col border border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold leading-snug">{gig.title}</CardTitle>
                    <Badge variant="outline" className={`capitalize shrink-0 ${statusTone[gig.status] || ''}`}>
                      {gig.status === 'open' ? 'Open for Help' : gig.status === 'accepted' ? 'Help Accepted' : 'Completed'}
                    </Badge>
                  </div>
                  {gig.expiresAt && gig.status === 'open' && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-rose-500 mt-1">
                      <Icon name="timer" size={14} />
                      <span>{expiryText}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{gig.description}</p>

                  {/* Poster & Helper Details */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Posted by: <strong className="text-foreground">{gig.postedByName || 'Colleague'}</strong></span>
                      {gig.createdAt && <span>{new Date(gig.createdAt).toLocaleDateString()}</span>}
                    </div>

                    {/* Helper Status */}
                    {isAccepted && gig.helper && (
                      <div className="flex items-center gap-1.5 text-sky-600 font-semibold pt-1 border-t border-border/40">
                        <Icon name="check_circle" size={15} />
                        <span>Accepted <strong>{gig.helper.name}</strong>'s help!</span>
                      </div>
                    )}

                    {isCompleted && gig.helper && (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-semibold pt-1 border-t border-border/40">
                        <Icon name="task_alt" size={15} />
                        <span>Completed with help from <strong>{gig.helper.name}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Offers List for Poster */}
                  {isPosted && gig.status === 'open' && (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Help Offers ({offers.length})
                      </span>
                      {offers.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No offers received yet.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                          {offers.map((offer) => (
                            <div key={offer.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                              <span className="font-semibold text-foreground">{offer.name} offered to help</span>
                              <Button size="sm" variant="default" className="h-7 text-xs px-2.5" onClick={() => acceptHelp(gig, offer.id)}>
                                Accept Help
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t border-border/40">
                    {!isPosted && gig.status === 'open' && (
                      gig.hasOffered ? (
                        <Badge variant="secondary" className="px-3 py-1 bg-amber-500/10 text-amber-600">
                          ✋ Offered Help
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => offerHelp(gig)}>
                          <Icon name="front_hand" size={14} className="mr-1.5" /> Offer Help
                        </Button>
                      )
                    )}

                    {(isPosted || (gig.helper && gig.helper.id === myEmpId)) && isAccepted && (
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => markComplete(gig)}>
                        <Icon name="check" size={14} className="mr-1.5" /> Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Post Help Request Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post a Help Request</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Title / Topic</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Need help with Excel VLOOKUP formula"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Explain what help you need from colleagues..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Destroying Date & Time (Expiry)</label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full text-sm"
              />
              <span className="text-[11px] text-muted-foreground">
                If no help offer is accepted before this date & time, the request will be automatically deleted.
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={submitGig}>Post Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
