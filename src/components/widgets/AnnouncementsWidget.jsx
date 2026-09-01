import { memo, useState, useCallback } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DashboardWidget } from '../Dashboard.jsx'
import { generateAnnouncementMessage, queueWhatsAppMessages } from '../../services/whatsappService.js'

export const AnnouncementsWidget = memo(({
  announcements = [],
  setAnnouncements,
  currentUser,
  employees = [],
  setCurrentView,
  addToast,
  addLog,
  addNotification,
  settings,
  ...wProps
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [priority, setPriority] = useState('Normal')
  const [audience, setAudience] = useState('all')

  const resetForm = () => {
    setTitle('')
    setContent('')
    setCategory('General')
    setPriority('Normal')
    setAudience('all')
    setIsSubmitting(false)
  }

  const handleOpenDialog = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const handleCloseDialog = () => {
    setIsCreateOpen(false)
    resetForm()
  }

  const handleCreateAnnouncement = (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      if (addToast) addToast('Please provide both title and content', 'warning')
      return
    }

    setIsSubmitting(true)

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const authorId = currentUser?.id || currentUser?.uid || 'admin'
    const authorName = currentUser?.name || 'Management'

    const newPost = {
      id: `ann-${Date.now()}`,
      title: trimmedTitle,
      content: trimmedContent,
      authorId,
      date: new Date().toISOString(),
      category: category || 'General',
      priority: priority || 'Normal',
      audience: audience || 'all',
      attachments: [],
      reactions: { '👍': [], '❤️': [], '👎': [] },
      comments: [],
      readBy: [authorId],
    }

    if (setAnnouncements) {
      setAnnouncements(prev => [newPost, ...(Array.isArray(prev) ? prev : [])])
    }

    if (addToast) {
      addToast('Announcement posted successfully', 'success')
    }

    if (addLog) {
      addLog('Posted Announcement', trimmedTitle)
    }

    if (addNotification) {
      addNotification(
        `New announcement posted: "${trimmedTitle}"`,
        'announcements',
        { title: 'New Announcement', category: 'announcement' }
      )
    }

    // Queue WhatsApp broadcast if enabled
    if (settings?.whatsapp?.enabled && settings?.whatsapp?.notifyAnnouncements) {
      const msg = generateAnnouncementMessage({
        companyName: settings?.company?.name || 'Kormiis HR',
        title: trimmedTitle,
        category: category || 'General',
        content: trimmedContent,
        publishedBy: authorName
      })
      const items = (employees || [])
        .filter(emp => emp.phone)
        .map(emp => ({
          phone: emp.phone,
          employeeName: emp.name,
          event: 'announcement',
          message: msg
        }))
      if (items.length) {
        queueWhatsAppMessages({ items }).catch(() => {})
      }
    }

    handleCloseDialog()
  }

  const recentAnnouncements = (Array.isArray(announcements) ? [...announcements] : [])
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3)

  const getAuthorName = useCallback((id) => {
    const emp = employees.find(e => e.id === id || e.uid === id)
    return emp ? emp.name : 'Management'
  }, [employees])

  return (
    <>
      <DashboardWidget
        id="w4"
        title="Announcements"
        icon={<Icon name="rss_feed" className="text-amber-500 shrink-0" size={22}/>}
        cardClass="col-span-12 lg:col-span-7 lg:row-span-2"
        action={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleOpenDialog}
              className="apple-glass-btn text-xs font-semibold px-3 h-7 rounded-full text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Post Announcement"
            >
              <Icon name="add" size={15}/>
              <span>Post</span>
            </button>
            <button
              onClick={() => setCurrentView && setCurrentView('announcements')}
              className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer text-foreground"
            >
              View All
            </button>
          </div>
        }
        contentClass="flex flex-col p-0 pt-1 overflow-hidden"
        {...wProps}
      >
        {recentAnnouncements.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
            <Icon name="rss_feed" size={38} className="text-amber-500/40 dark:text-amber-500/50 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="m-0 text-fluid-sm font-semibold text-foreground">No Active Announcements</p>
              <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[240px] leading-relaxed">
                Share important updates, events or notices with your team.
              </p>
            </div>
            <button
              onClick={handleOpenDialog}
              className="apple-glass-btn text-xs font-semibold px-4 h-8 rounded-full text-primary hover:text-primary/90 flex items-center gap-1.5 cursor-pointer mt-1"
            >
              <Icon name="add_circle" size={16}/>
              <span>Post First Announcement</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[360px] lg:max-h-[520px] flex flex-col gap-2.5 px-4 sm:px-5 pb-4 chat-scrollbar">
            {recentAnnouncements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className="flex items-center gap-3.5 p-3 px-4 rounded-2xl liquid-widget-item cursor-pointer select-none active:scale-[0.99] border-black/[0.06] dark:border-white/[0.08]"
                onClick={() => setCurrentView && setCurrentView('announcements')}
              >
                <div className="size-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Icon name="campaign" size={20}/>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <p className="m-0 text-fluid-xs font-bold text-foreground break-words truncate">{ann.title}</p>
                    {ann.category && ann.category !== 'General' && (
                      <span className="text-[10px] font-medium text-muted-foreground/80 px-2 py-0.5 rounded-md bg-foreground/5 hidden sm:inline-block shrink-0">
                        {ann.category}
                      </span>
                    )}
                  </div>
                  <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {getAuthorName(ann.authorId)} &middot; {new Date(ann.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {ann.priority === 'Urgent' ? (
                  <Badge variant="destructive" className="uppercase text-[10px] font-bold rounded-full px-2.5 py-0.5 shadow-xs shrink-0">
                    Urgent
                  </Badge>
                ) : ann.priority === 'Important' ? (
                  <Badge variant="outline" className="uppercase text-[10px] font-bold rounded-full px-2.5 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 shrink-0">
                    Important
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DashboardWidget>

      {/* Direct Announcement Compose Dialog (MonoGlass Standard) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg glass-kormiis border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden p-0 shadow-none">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-500">
                <Icon name="campaign" size={20}/>
              </div>
              <DialogTitle className="text-fluid-lg font-bold text-foreground">Post New Announcement</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-4 p-6 pt-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Town Hall & Team Updates"
                className="h-11 rounded-2xl bg-muted/40"
              />
            </div>

            {/* Category & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-fluid-xs font-semibold text-foreground">Category</label>
                <Select value={category} onChange={setCategory}>
                  <SelectItem id="General">General</SelectItem>
                  <SelectItem id="Policy Update">Policy Update</SelectItem>
                  <SelectItem id="Event">Event</SelectItem>
                  <SelectItem id="Emergency">Emergency</SelectItem>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-fluid-xs font-semibold text-foreground">Priority</label>
                <Select value={priority} onChange={setPriority}>
                  <SelectItem id="Normal">Normal</SelectItem>
                  <SelectItem id="Important">Important</SelectItem>
                  <SelectItem id="Urgent">Urgent</SelectItem>
                </Select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">Target Audience</label>
              <Select value={audience} onChange={setAudience}>
                <SelectItem id="all">All Employees</SelectItem>
                <SelectItem id="Engineering">Engineering Dept</SelectItem>
                <SelectItem id="Design">Design Dept</SelectItem>
                <SelectItem id="HR">HR Dept</SelectItem>
              </Select>
            </div>

            {/* Message Content */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">
                Message Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement message here..."
                className="w-full rounded-2xl border border-input bg-muted/40 px-3.5 py-2.5 text-fluid text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-h-[100px]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2.5 border-t border-border/60 dark:border-white/10 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="rounded-full h-11 px-5 font-semibold"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full h-11 px-6 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <span className="liquid-spinner" />
                    <span>Publishing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Icon name="send" size={16}/>
                    <span>Publish Announcement</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
})

AnnouncementsWidget.displayName = 'AnnouncementsWidget'
