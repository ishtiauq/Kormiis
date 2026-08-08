import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HR'
  const [tab, setTab] = useState('browse')
  const [gigs, setGigs] = useState([])
  const [myEmpId, setMyEmpId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Dialog State (Used for both Create and Edit)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGigId, setEditingGigId] = useState(null)
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

  const openCreateModal = () => {
    setEditingGigId(null)
    setForm({
      title: '',
      description: '',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    })
    setModalOpen(true)
  }

  const openEditModal = (gig) => {
    setEditingGigId(gig.id)
    setForm({
      title: gig.title || '',
      description: gig.description || '',
      expiresAt: gig.expiresAt ? new Date(gig.expiresAt).toISOString().slice(0, 16) : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    })
    setModalOpen(true)
  }

  const submitForm = async () => {
    if (!form.title.trim()) {
      addToast('Title is required.', 'error')
      return
    }
    try {
      if (editingGigId) {
        await gigApi.updateGig({
          gigId: editingGigId,
          title: form.title.trim(),
          description: form.description.trim(),
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        })
        addToast('Help request updated.', 'success')
      } else {
        await gigApi.createGig({
          title: form.title.trim(),
          description: form.description.trim(),
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        })
        addToast('Help request posted successfully.', 'success')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const deleteGig = async (gigId) => {
    if (!window.confirm('Are you sure you want to delete this help request?')) return
    try {
      await gigApi.deleteGig({ gigId })
      addToast('Help request deleted.', 'success')
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
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
        tab === key
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
      }`}
    >
      <Icon name={icon} size={15} /> {label}
    </button>
  )

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient m-0">
          <Icon name="handshake" size={22} className="text-foreground" /> Help Hub
        </h1>
        <Button onClick={openCreateModal} className="rounded-full shadow-sm">
          <Icon name="add" size={16} className="mr-1.5" /> Request Help
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
            const canManage = isPosted || isAdmin
            const isAccepted = gig.status === 'accepted'
            const isCompleted = gig.status === 'completed'
            const offers = gig.offers || []
            const expiryText = formatExpiry(gig.expiresAt)

            return (
              <Card key={gig.id} className="flex flex-col border border-border/80 shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold leading-snug">{gig.title}</CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`capitalize shrink-0 ${statusTone[gig.status] || ''}`}>
                        {gig.status === 'open' ? 'Open for Help' : gig.status === 'accepted' ? 'Help Accepted' : 'Completed'}
                      </Badge>
                      {canManage && gig.status !== 'completed' && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => openEditModal(gig)}
                            title="Edit Request"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            onClick={() => deleteGig(gig.id)}
                            title="Delete Request"
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Icon name="delete" size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {gig.expiresAt && gig.status === 'open' && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-rose-500 mt-1">
                      <Icon name="timer" size={14} />
                      <span>{expiryText}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  {gig.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{gig.description}</p>
                  )}

                  {/* Poster & Helper Details */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>Posted by:</span>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <img
                            src={gig.posterAvatar || "https://i.pravatar.cc/150?u=poster"}
                            alt={gig.postedByName || "Poster"}
                            className="size-5 rounded-full object-cover border border-border/60 shadow-xs"
                          />
                          <span>{gig.postedByName || 'Colleague'}</span>
                        </div>
                      </div>
                      {gig.createdAt && <span>{new Date(gig.createdAt).toLocaleDateString()}</span>}
                    </div>

                    {/* Helper Status */}
                    {isAccepted && gig.helper && (
                      <div className="flex items-center gap-2 text-sky-600 font-semibold pt-1 border-t border-border/40">
                        <Icon name="check_circle" size={16} />
                        <img
                          src={gig.helper.avatar || "https://i.pravatar.cc/150?u=helper"}
                          alt={gig.helper.name || "Helper"}
                          className="size-5 rounded-full object-cover border border-sky-400/50"
                        />
                        <span>Accepted <strong>{gig.helper.name}</strong>'s help!</span>
                      </div>
                    )}

                    {isCompleted && gig.helper && (
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold pt-1 border-t border-border/40">
                        <Icon name="task_alt" size={16} />
                        <img
                          src={gig.helper.avatar || "https://i.pravatar.cc/150?u=helper"}
                          alt={gig.helper.name || "Helper"}
                          className="size-5 rounded-full object-cover border border-emerald-400/50"
                        />
                        <span>Completed with help from <strong>{gig.helper.name}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Offers List for Poster */}
                  {canManage && gig.status === 'open' && (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Help Offers ({offers.length})
                      </span>
                      {offers.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No offers received yet.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                          {offers.map((offer) => (
                            <div key={offer.id} className="flex items-center justify-between p-2 rounded-xl bg-background border border-border text-xs">
                              <div className="flex items-center gap-2">
                                <img
                                  src={offer.avatar || "https://i.pravatar.cc/150?u=offer"}
                                  alt={offer.name || "Offerer"}
                                  className="size-6 rounded-full object-cover border border-border/60"
                                />
                                <span className="font-semibold text-foreground">{offer.name} offered to help</span>
                              </div>
                              <Button size="sm" variant="default" className="h-7 text-xs px-2.5 rounded-full" onClick={() => acceptHelp(gig, offer.id)}>
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
                        <Badge variant="secondary" className="px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          ✋ Help Offered
                        </Badge>
                      ) : (
                        <Button size="sm" className="rounded-full px-4" onClick={() => offerHelp(gig)}>
                          <Icon name="front_hand" size={14} className="mr-1.5" /> Help
                        </Button>
                      )
                    )}

                    {(isPosted || (gig.helper && gig.helper.id === myEmpId) || isAdmin) && isAccepted && (
                      <Button size="sm" variant="outline" className="rounded-full text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => markComplete(gig)}>
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

      {/* Modern High-End Modal Dialog (Create & Edit) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 border border-border/80 bg-card text-card-foreground shadow-xl">
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name={editingGigId ? "edit_note" : "handshake"} size={22} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {editingGigId ? 'Edit Help Request' : 'Post a Help Request'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {editingGigId ? 'Update your request details or expiry time.' : 'Ask your colleagues for help on a task or project.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-4">
            {/* Title (Mandatory) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Title / Task Name</label>
                <span className="text-xs font-semibold !text-red-500" style={{ color: '#ef4444' }}>Required</span>
              </div>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Need assistance with Excel VLOOKUP formula"
                className="rounded-xl border-input bg-background"
              />
            </div>

            {/* Description (Optional) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <span className="text-xs font-semibold text-muted-foreground">Optional</span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="border border-input bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/60"
                placeholder="Details of what help you need (optional)..."
              />
            </div>

            {/* Expiry Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Expiry Time</label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full text-sm rounded-xl border-input bg-background"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                If no colleague's help is accepted before this time, the request will be automatically deleted.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50 mt-1">
              <Button variant="outline" className="rounded-full px-5" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitForm} className="rounded-full px-6 shadow-sm">
                <Icon name={editingGigId ? "check" : "send"} size={15} className="mr-1.5" />
                {editingGigId ? 'Save Changes' : 'Post Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
