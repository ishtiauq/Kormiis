import { useState, useEffect, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker.jsx"
import { GlassTimePicker } from "../attendance/GlassTimePicker.jsx"
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
  if (diffMs <= 0) return 'Expired'
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (diffHrs > 24) {
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffHrs > 0) {
    return `${diffHrs}h ${diffMins}m left`
  }
  return `${diffMins}m left`
}

function isoTo12HrTime(isoOrDateTimeStr) {
  if (!isoOrDateTimeStr) return '09:00 AM'
  const dt = new Date(isoOrDateTimeStr)
  if (isNaN(dt.getTime())) return '09:00 AM'
  let hours = dt.getHours()
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  const mins = String(dt.getMinutes()).padStart(2, '0')
  return `${String(hours).padStart(2, '0')}:${mins} ${period}`
}

function updateIsoWith12HrTime(isoOrDateTimeStr, time12HrStr) {
  const dt = isoOrDateTimeStr ? new Date(isoOrDateTimeStr) : new Date(Date.now() + 24 * 60 * 60 * 1000)
  const datePart = !isNaN(dt.getTime())
    ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    : new Date().toISOString().slice(0, 10)

  if (!time12HrStr) return `${datePart}T09:00`
  const [tPart, period] = time12HrStr.split(' ')
  if (!tPart) return `${datePart}T09:00`
  const [hStr, mStr] = tPart.split(':')
  let hours = parseInt(hStr || '9', 10)
  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  const formattedH = String(hours).padStart(2, '0')
  const formattedM = String(mStr || '00').padStart(2, '0')
  return `${datePart}T${formattedH}:${formattedM}`
}

export default function GigBoardPage({ adminUid, currentUser, addToast }) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HR'
  const [tab, setTab] = useState('browse')
  const [gigs, setGigs] = useState([])
  const [myEmpId, setMyEmpId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Dialog State (Used for Create & Edit)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGigId, setEditingGigId] = useState(null)

  // Global GlassTimePicker Popover Modal State
  const [timePickerOpen, setTimePickerOpen] = useState(false)

  // Delete Alert State (App Native Shadcn Alert)
  const [deleteTargetId, setDeleteTargetId] = useState(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  })

  const dateStr = form.expiresAt ? form.expiresAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const time12Str = isoTo12HrTime(form.expiresAt)

  const handleDateChange = (newDateVal) => {
    if (!newDateVal) return
    const timePart = form.expiresAt ? form.expiresAt.slice(11, 16) : '09:00'
    setForm({ ...form, expiresAt: `${newDateVal}T${timePart}` })
  }

  const handleTimeChange = (new12HrStr) => {
    const updatedIso = updateIsoWith12HrTime(form.expiresAt, new12HrStr)
    setForm({ ...form, expiresAt: updatedIso })
  }

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

    const title = form.title.trim()
    const description = form.description.trim()
    const expiresAt = form.expiresAt ? new Date(form.expiresAt).toISOString() : null

    // Immediate UI responsiveness
    let posterName = currentUser?.name || currentUser?.displayName || 'You'
    let posterAvatar = currentUser?.avatar || currentUser?.photoURL || `https://i.pravatar.cc/150?u=${myEmpId || 'me'}`

    if (editingGigId) {
      // Instant Optimistic Edit
      const targetId = editingGigId
      setGigs((prev) =>
        prev.map((g) =>
          g.id === targetId
            ? { ...g, title, description, expiresAt: expiresAt || g.expiresAt }
            : g
        )
      )
      setModalOpen(false)
      addToast('Help request updated.', 'success')

      gigApi.updateGig({ gigId: targetId, title, description, expiresAt })
        .catch((e) => {
          addToast(e.message || 'Failed to save changes.', 'error')
          load()
        })
    } else {
      // Instant Optimistic Create
      const tempId = `gig-temp-${Date.now()}`
      const newGig = {
        id: tempId,
        title,
        description,
        postedBy: myEmpId || 'me',
        postedByName: posterName,
        posterAvatar,
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'open',
        helper: null,
        offers: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      }

      setGigs((prev) => [newGig, ...prev])
      setModalOpen(false)
      addToast('Help request posted successfully.', 'success')

      gigApi.createGig({ title, description, expiresAt })
        .then(() => load())
        .catch((e) => {
          setGigs((prev) => prev.filter((g) => g.id !== tempId))
          addToast(e.message || 'Failed to post request.', 'error')
        })
    }
  }

  const confirmDeleteGig = async (gigId) => {
    // Instant Optimistic Delete
    setGigs((prev) => prev.filter((g) => g.id !== gigId))
    addToast('Help request deleted.', 'success')

    gigApi.deleteGig({ gigId }).catch((e) => {
      addToast(e.message || 'Failed to delete request.', 'error')
      load()
    })
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

  const declineHelp = async (gig, helperId) => {
    // Instant Optimistic Update
    setGigs((prev) =>
      prev.map((g) =>
        g.id === gig.id
          ? { ...g, offers: (g.offers || []).filter((o) => o.id !== helperId) }
          : g
      )
    )
    addToast('Help offer declined.', 'info')

    gigApi.declineHelp({ gigId: gig.id, helperId }).catch((e) => {
      addToast(e.message || 'Failed to decline offer.', 'error')
      load()
    })
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
      className={`w-full justify-center px-2 sm:px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
        tab === key
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      <Icon name={icon} size={15} /> <span>{label}</span>
    </button>
  )

  return (
    <div className="animate-fade-in flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient m-0">
          <Icon name="handshake" size={22} className="text-foreground" /> Help Hub
        </h1>
        <Button onClick={openCreateModal} className="hidden sm:inline-flex rounded-full shadow-sm">
          <Icon name="add" size={16} className="mr-1.5" /> Request Help
        </Button>
      </div>

      <div className="border-t border-border border-headline my-4" />

      <div className="w-full">
        <div className="w-full grid grid-cols-3 gap-1 rounded-full bg-muted/40 border border-border p-1">
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
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold leading-snug pt-0.5">{gig.title}</CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {gig.status === 'open' ? (
                        isPosted ? (
                          <Badge variant="outline" className="px-3 py-1 text-xs font-bold text-rose-500 border-rose-500/30 bg-rose-500/10 flex items-center gap-1.5 rounded-full shrink-0">
                            <Icon name="front_hand" size={13} />
                            <span>Need help</span>
                            {expiryText && <span className="font-semibold opacity-80">({expiryText})</span>}
                          </Badge>
                        ) : (
                          gig.hasOffered ? (
                            <Badge variant="secondary" className="px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold flex items-center gap-1 rounded-full shrink-0 text-xs">
                              ✋ Help Offered
                            </Badge>
                          ) : (
                            <Button size="sm" className="rounded-full px-3.5 h-8 text-xs font-bold shadow-sm flex items-center" onClick={() => offerHelp(gig)}>
                              <Icon name="front_hand" size={14} className="mr-1" />
                              <span>Help</span>
                              {expiryText && <span className="font-medium opacity-90 ml-1.5 text-[11px]">({expiryText})</span>}
                            </Button>
                          )
                        )
                      ) : (
                        <Badge variant="outline" className={`capitalize shrink-0 ${statusTone[gig.status] || ''}`}>
                          {gig.status === 'accepted' ? 'Help Accepted' : 'Completed'}
                        </Badge>
                      )}

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
                            onClick={() => setDeleteTargetId(gig.id)}
                            title="Delete Request"
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Icon name="delete" size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3 pt-1">
                  {/* Description Container */}
                  <div className="my-1.5 p-3.5 rounded-xl bg-muted/20 border border-border/50 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {gig.description && gig.description.trim() ? (
                      <span className="text-foreground/90">{gig.description}</span>
                    ) : (
                      <span className="text-muted-foreground/60 font-medium">No additional details provided.</span>
                    )}
                  </div>

                  {/* Helper Status */}
                  {(isAccepted || isCompleted) && gig.helper && (
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs flex flex-col gap-1">
                      {isAccepted && (
                        <div className="flex items-center gap-2 text-sky-600 font-semibold">
                          <Icon name="check_circle" size={16} />
                          <img
                            src={gig.helper.avatar || "https://i.pravatar.cc/150?u=helper"}
                            alt={gig.helper.name || "Helper"}
                            className="size-5 rounded-full object-cover border border-sky-400/50"
                          />
                          <span>Accepted <strong>{gig.helper.name}</strong>'s help!</span>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold">
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
                  )}

                  {/* Offers List for Poster */}
                  {canManage && gig.status === 'open' && offers.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Help Offers ({offers.length})
                      </span>
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                        {offers.map((offer) => (
                          <div key={offer.id} className="flex items-center justify-between p-2 rounded-xl bg-background border border-border text-xs gap-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={offer.avatar || "https://i.pravatar.cc/150?u=offer"}
                                alt={offer.name || "Offerer"}
                                className="size-6 rounded-full object-cover border border-border/60"
                              />
                              <span className="font-semibold text-foreground">{offer.name} offered to help</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => declineHelp(gig, offer.id)}>
                                Decline
                              </Button>
                              <Button size="sm" variant="default" className="h-7 text-xs px-3 rounded-full" onClick={() => acceptHelp(gig, offer.id)}>
                                Accept
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons & Footer Bottom Row */}
                  <div className="mt-auto pt-2 flex flex-col gap-2 border-t border-border/40">
                    {(isPosted || (gig.helper && gig.helper.id === myEmpId) || isAdmin) && isAccepted && (
                      <div>
                        <Button size="sm" variant="outline" className="rounded-full text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => markComplete(gig)}>
                          <Icon name="check" size={14} className="mr-1.5" /> Mark Complete
                        </Button>
                      </div>
                    )}

                    {/* Footer Bottom: Posted by WITH Date and Time */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span>Posted by:</span>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <img
                            src={gig.posterAvatar || "https://i.pravatar.cc/150?u=poster"}
                            alt={gig.postedByName || "Poster"}
                            className="size-4.5 rounded-full object-cover border border-border/60 shadow-xs"
                          />
                          <span>{gig.postedByName || 'Colleague'}</span>
                        </div>
                      </div>
                      {gig.createdAt && (
                        <span className="font-medium text-muted-foreground/80">
                          {new Date(gig.createdAt).toLocaleDateString()} at {new Date(gig.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modern High-End Compact Modal Dialog (Create & Edit) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-4 sm:p-5 border border-border/80 bg-card text-card-foreground shadow-xl">
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name={editingGigId ? "edit_note" : "handshake"} size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {editingGigId ? 'Edit Help Request' : 'Post a Help Request'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {editingGigId ? 'Update your request details or expiry time.' : 'Ask colleagues for help on a task or project.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-3">
            {/* Title (Mandatory) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Title / Task Name</label>
                <span className="text-xs font-semibold !text-red-500" style={{ color: '#ef4444' }}>Required</span>
              </div>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Need assistance with Excel VLOOKUP formula"
                className="h-9 rounded-xl border-input bg-background text-xs"
              />
            </div>

            {/* Description (Optional) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <span className="text-xs font-semibold text-muted-foreground">Optional</span>
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="border border-input bg-background rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/60"
                placeholder="Details of what help you need (optional)..."
              />
            </div>

            {/* Compact Side-by-Side Date & Time Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-2.5">
              {/* Global DatePicker */}
              <div className="flex flex-col gap-1">
                <DatePicker
                  label="Expiry Date"
                  value={dateStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              {/* Global GlassTimePicker Trigger Button */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Expiry Time</label>
                <button
                  type="button"
                  onClick={() => setTimePickerOpen(true)}
                  className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-all cursor-pointer shadow-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon name="schedule" size={15} className="text-primary" />
                    {time12Str}
                  </span>
                  <Icon name="unfold_more" size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 mt-1">
              <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setModalOpen(false)}>
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

      {/* Global GlassTimePicker Modal */}
      <GlassTimePicker
        isOpen={timePickerOpen}
        setIsOpen={setTimePickerOpen}
        time={time12Str}
        onTimeChange={handleTimeChange}
        label="Select Expiry Time"
      />

      {/* App Native Shadcn AlertDialog for Delete Confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Help Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this help request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTargetId) confirmDeleteGig(deleteTargetId)
                setDeleteTargetId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Floating Action Button (FAB) */}
      <Button
        className="sm:hidden fixed bottom-[76px] right-6 h-14 w-14 rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] z-50 p-0 hover:scale-105 active:scale-95 transition-transform"
        onClick={openCreateModal}
        aria-label="Request Help"
      >
        <Icon name="add" size={24} />
      </Button>
    </div>
  )
}
