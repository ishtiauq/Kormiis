import { memo, useState, useCallback, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDate } from '../../services/date.js'
import { DashboardWidget } from '../Dashboard.jsx'
import { generateAnnouncementMessage, queueWhatsAppMessages } from '../../services/whatsappService.js'

const EVENT_TYPES = [
  { id: 'meeting', label: 'Meeting', icon: 'groups' },
  { id: 'holiday', label: 'Holiday', icon: 'beach_access' },
  { id: 'birthday', label: 'Birthday', icon: 'cake' },
  { id: 'deadline', label: 'Deadline', icon: 'warning' },
  { id: 'social', label: 'Social', icon: 'celebration' },
  { id: 'training', label: 'Training', icon: 'school' },
  { id: 'other', label: 'Other', icon: 'event' },
]

export const AnnouncementsWidget = memo(({
  announcements = [],
  setAnnouncements,
  currentUser,
  employees = [],
  upcomingMilestones = [],
  upcomingEvents = [],
  events = [],
  setEvents,
  setCurrentView,
  addToast,
  addLog,
  addNotification,
  settings,
  cardClass = "col-span-12 lg:col-span-7 lg:row-span-3",
  ...wProps
}) => {
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'notice' | 'upcoming'
  const [seenTabs, setSeenTabs] = useState(() => new Set(['feed']))
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false)
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTabClick = (tab) => {
    setActiveTab(tab)
    setSeenTabs(prev => new Set([...prev, tab]))
  }

  const upcomingCount = (upcomingMilestones?.length || 0) + (upcomingEvents?.length || 0)

  // Event Form State
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [eventTime, setEventTime] = useState('')
  const [eventType, setEventType] = useState('meeting')
  const [eventDescription, setEventDescription] = useState('')

  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticeCategory, setNoticeCategory] = useState('General')
  const [noticePriority, setNoticePriority] = useState('Normal')
  const [noticeAudience, setNoticeAudience] = useState('all')

  // Feed & Poll Form State
  const [feedTitle, setFeedTitle] = useState('')
  const [feedContent, setFeedContent] = useState('')
  const [hasPoll, setHasPoll] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])

  const currentUserId = currentUser?.id || currentUser?.uid || 'guest'

  const isFeedPost = useCallback((post) => {
    if (!post) return false
    return post.postType === 'feed' || Boolean(post.poll) || post.category === 'Feed' || post.category === 'Discussion' || post.category === 'Poll'
  }, [])

  const feedPosts = useMemo(() => {
    return (Array.isArray(announcements) ? [...announcements] : [])
      .filter(isFeedPost)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [announcements, isFeedPost])

  const noticePosts = useMemo(() => {
    return (Array.isArray(announcements) ? [...announcements] : [])
      .filter(a => !isFeedPost(a))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [announcements, isFeedPost])

  const getAuthor = useCallback((id, post) => {
    // 1. Check if ID matches an employee in the employees list
    const emp = (employees || []).find(e => String(e.id) === String(id) || String(e.uid) === String(id))
    if (emp) {
      return {
        name: emp.name,
        avatar: emp.avatar || null,
        initials: (emp.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U',
        role: emp.role || emp.designation || 'Member'
      }
    }

    // 2. Check if current user created it
    if (currentUser && (String(currentUser.id) === String(id) || String(currentUser.uid) === String(id) || id === 'guest' || id === 'admin')) {
      const currentName = currentUser.name || currentUser.displayName || 'Sarah Rahman'
      return {
        name: currentName,
        avatar: currentUser.avatar || currentUser.photoURL || employees?.[0]?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        initials: currentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SR',
        role: currentUser.role || 'Member'
      }
    }

    // 3. Check if post has author name saved
    if (post && post.author && post.author !== 'Teammate' && post.author !== 'Unknown User') {
      const matchedEmp = (employees || []).find(e => e.name?.toLowerCase() === post.author.toLowerCase())
      return {
        name: post.author,
        avatar: post.authorAvatar || matchedEmp?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        initials: post.author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U',
        role: post.authorRole || matchedEmp?.role || 'Member'
      }
    }

    // 4. Default to first employee in company list (e.g. Sarah Rahman)
    const fallbackEmp = (employees && employees.length > 0) ? employees[0] : null
    if (fallbackEmp) {
      return {
        name: fallbackEmp.name,
        avatar: fallbackEmp.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        initials: (fallbackEmp.name || 'SR').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SR',
        role: fallbackEmp.role || 'Member'
      }
    }

    return {
      name: 'Sarah Rahman',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      initials: 'SR',
      role: 'Lead Software Engineer'
    }
  }, [employees, currentUser])

  // --- Handlers ---
  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions(prev => [...prev, ''])
    }
  }

  const handleRemovePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== idx))
    }
  }

  const handlePollOptionTextChange = (idx, text) => {
    setPollOptions(prev => {
      const next = [...prev]
      next[idx] = text
      return next
    })
  }

  const handleVote = (postId, optionIndex) => {
    if (!setAnnouncements) return

    setAnnouncements(prev => (Array.isArray(prev) ? prev : []).map(p => {
      if (p.id === postId && p.poll && Array.isArray(p.poll.options)) {
        const updatedOptions = p.poll.options.map((opt, idx) => {
          const votes = Array.isArray(opt.votes) ? opt.votes : []
          const hasVotedThis = votes.includes(currentUserId)
          
          if (idx === optionIndex) {
            // Toggle vote
            return {
              ...opt,
              votes: hasVotedThis ? votes.filter(id => id !== currentUserId) : [...votes, currentUserId]
            }
          } else {
            // Remove previous vote from other options (single-choice)
            return {
              ...opt,
              votes: votes.filter(id => id !== currentUserId)
            }
          }
        })

        return {
          ...p,
          poll: {
            ...p.poll,
            options: updatedOptions
          }
        }
      }
      return p
    }))

    addToast?.('Vote recorded', 'success')
  }

  const handleCreateNotice = (e) => {
    e.preventDefault()
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      addToast?.('Please provide title and content', 'warning')
      return
    }

    setIsSubmitting(true)
    const trimmedTitle = noticeTitle.trim()
    const trimmedContent = noticeContent.trim()
    const authorId = currentUserId
    const authorName = currentUser?.name || 'Management'

    const newNotice = {
      id: `ann-notice-${Date.now()}`,
      postType: 'notice',
      title: trimmedTitle,
      content: trimmedContent,
      authorId,
      date: new Date().toISOString(),
      category: noticeCategory || 'General',
      priority: noticePriority || 'Normal',
      audience: noticeAudience || 'all',
      attachments: [],
      reactions: { '👍': [], '❤️': [], '👎': [] },
      comments: [],
      readBy: [authorId],
      poll: null
    }

    setAnnouncements?.(prev => [newNotice, ...(Array.isArray(prev) ? prev : [])])
    addToast?.('Official notice published', 'success')
    addLog?.('Posted Company Notice', trimmedTitle)
    addNotification?.(`New Notice: "${trimmedTitle}"`, 'announcements', { title: 'New Notice', category: 'notice' })

    if (settings?.whatsapp?.enabled && settings?.whatsapp?.notifyAnnouncements) {
      const msg = generateAnnouncementMessage({
        companyName: settings?.company?.name || 'Kormiis HR',
        title: trimmedTitle,
        category: noticeCategory || 'General',
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

    setIsNoticeModalOpen(false)
    setNoticeTitle('')
    setNoticeContent('')
    setNoticeCategory('General')
    setNoticePriority('Normal')
    setNoticeAudience('all')
    setIsSubmitting(false)
  }

  const handleCreateEvent = (e) => {
    e.preventDefault()
    const trimmedTitle = eventTitle.trim()
    if (!trimmedTitle || !eventDate) {
      addToast?.('Event title and date are required', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const newEvent = {
        id: `evt-${Date.now()}`,
        title: trimmedTitle,
        date: eventDate,
        time: eventTime || '',
        type: eventType || 'meeting',
        description: eventDescription.trim() || '',
        createdBy: currentUser?.id || currentUser?.uid || 'unknown',
        createdAt: new Date().toISOString(),
      }

      if (setEvents) {
        setEvents((prev) => [...(Array.isArray(prev) ? prev : []), newEvent])
      }

      addToast?.('Event created successfully', 'success')
      addLog?.('Event Created', `${trimmedTitle} on ${eventDate}`)
      if (addNotification) {
        addNotification(`New company event scheduled: "${trimmedTitle}" on ${eventDate}`, 'calendar', {
          title: 'New Event',
          category: 'event'
        })
      }

      setIsEventModalOpen(false)
      setEventTitle('')
      setEventTime('')
      setEventType('meeting')
      setEventDescription('')
    } catch (err) {
      console.error('Failed to create event:', err)
      addToast?.('Failed to create event', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateFeed = (e) => {
    e.preventDefault()
    const trimmedContent = feedContent.trim()

    if (!trimmedContent) {
      addToast?.('Please write what you would like to share or ask', 'warning')
      return
    }

    const validOptions = pollOptions.map(o => o.trim()).filter(Boolean)
    const isPoll = validOptions.length >= 2

    setIsSubmitting(true)
    const authorName = currentUser?.name || currentUser?.displayName || employees?.[0]?.name || 'Sarah Rahman'
    const authorAvatar = currentUser?.avatar || currentUser?.photoURL || employees?.[0]?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'
    const authorId = currentUser?.id || currentUser?.uid || employees?.[0]?.id || 'emp-101'

    const derivedTitle = trimmedContent.length > 70 ? trimmedContent.slice(0, 67) + '...' : trimmedContent

    const newFeedPost = {
      id: `ann-feed-${Date.now()}`,
      postType: 'feed',
      title: derivedTitle,
      content: trimmedContent,
      author: authorName,
      authorAvatar: authorAvatar,
      authorId,
      date: new Date().toISOString(),
      category: isPoll ? 'Poll' : 'Team Update',
      priority: 'Normal',
      audience: 'all',
      attachments: [],
      reactions: { '👍': [], '❤️': [], '👎': [] },
      comments: [],
      readBy: [authorId],
      poll: isPoll ? {
        question: trimmedContent,
        options: validOptions.map(text => ({ text, votes: [] }))
      } : null
    }

    setAnnouncements?.(prev => [newFeedPost, ...(Array.isArray(prev) ? prev : [])])
    addToast?.(isPoll ? 'Poll posted to Feed!' : 'Post shared with team!', 'success')
    addLog?.(isPoll ? 'Posted Team Poll' : 'Posted Team Update', derivedTitle)

    setIsFeedModalOpen(false)
    setFeedTitle('')
    setFeedContent('')
    setHasPoll(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setIsSubmitting(false)
  }

  return (
    <>
      <DashboardWidget
        id="w4"
        title="Catch Up"
        icon={<Icon name="rss_feed" className="text-amber-500 shrink-0" size={22}/>}
        cardClass={cardClass}
        action={
          <button
            onClick={() => setCurrentView && setCurrentView('announcements')}
            className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center"
          >
            View All
          </button>
        }
        contentClass="flex flex-col p-0 overflow-hidden"
        {...wProps}
      >
        {/* Separate Split Buttons: Feed, Notice & Events */}
        <div className="px-2.5 sm:px-3 pt-0 pb-2.5 -mt-1 sm:-mt-1.5">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            {/* Feed Split Button */}
            <button
              type="button"
              onClick={() => handleTabClick('feed')}
              style={activeTab === 'feed' ? { backgroundColor: '#FE3501', color: '#ffffff', borderColor: '#FE3501' } : {}}
              className={`relative h-8 sm:h-8.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 border active:scale-[0.97] ${
                activeTab === 'feed'
                  ? 'bg-[#FE3501] !text-white border-[#FE3501] shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-foreground hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border-black/10 dark:border-white/12'
              }`}
            >
              <Icon 
                name="forum" 
                size={15} 
                className={`shrink-0 ${activeTab === 'feed' ? '!text-white' : 'text-foreground/80'}`} 
              />
              <span 
                style={activeTab === 'feed' ? { color: '#ffffff' } : {}}
                className={`whitespace-nowrap text-xs sm:text-sm font-bold tracking-tight ${activeTab === 'feed' ? '!text-white' : 'text-foreground'}`}
              >
                Feed
              </span>
              {feedPosts.length > 0 && !seenTabs.has('feed') && (
                <span className="absolute top-1 right-1.5 size-2 rounded-full bg-[#FE3501] ring-1.5 ring-background shrink-0 pointer-events-none" />
              )}
            </button>

            {/* Notice Split Button */}
            <button
              type="button"
              onClick={() => handleTabClick('notice')}
              style={activeTab === 'notice' ? { backgroundColor: '#FE3501', color: '#ffffff', borderColor: '#FE3501' } : {}}
              className={`relative h-8 sm:h-8.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 border active:scale-[0.97] ${
                activeTab === 'notice'
                  ? 'bg-[#FE3501] !text-white border-[#FE3501] shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-foreground hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border-black/10 dark:border-white/12'
              }`}
            >
              <Icon 
                name="campaign" 
                size={16} 
                className={`shrink-0 ${activeTab === 'notice' ? '!text-white' : 'text-foreground/80'}`} 
              />
              <span 
                style={activeTab === 'notice' ? { color: '#ffffff' } : {}}
                className={`whitespace-nowrap text-xs sm:text-sm font-bold tracking-tight ${activeTab === 'notice' ? '!text-white' : 'text-foreground'}`}
              >
                Notice
              </span>
              {noticePosts.length > 0 && !seenTabs.has('notice') && (
                <span className="absolute top-1 right-1.5 size-2 rounded-full bg-[#FE3501] ring-1.5 ring-background shrink-0 pointer-events-none" />
              )}
            </button>

            {/* Events Split Button */}
            <button
              type="button"
              onClick={() => handleTabClick('upcoming')}
              style={activeTab === 'upcoming' ? { backgroundColor: '#FE3501', color: '#ffffff', borderColor: '#FE3501' } : {}}
              className={`relative h-8 sm:h-8.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 border active:scale-[0.97] ${
                activeTab === 'upcoming'
                  ? 'bg-[#FE3501] !text-white border-[#FE3501] shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-foreground hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border-black/10 dark:border-white/12'
              }`}
            >
              <Icon 
                name="calendar_month" 
                size={15} 
                className={`shrink-0 ${activeTab === 'upcoming' ? '!text-white' : 'text-foreground/80'}`} 
              />
              <span 
                style={activeTab === 'upcoming' ? { color: '#ffffff' } : {}}
                className={`whitespace-nowrap text-xs sm:text-sm font-bold tracking-tight ${activeTab === 'upcoming' ? '!text-white' : 'text-foreground'}`}
              >
                Events
              </span>
              {upcomingCount > 0 && !seenTabs.has('upcoming') && (
                <span className="absolute top-1 right-1.5 size-2 rounded-full bg-[#FE3501] ring-1.5 ring-background shrink-0 pointer-events-none" />
              )}
            </button>
          </div>
        </div>

        {/* --- FEED TAB CONTENT --- */}
        {activeTab === 'feed' && (
          feedPosts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <Icon name="forum" size={38} className="text-primary/40 dark:text-primary/50 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="m-0 text-fluid-sm font-semibold text-foreground">No Feed Updates Yet</p>
                <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[260px] leading-relaxed">
                  Share a thought with your teammates or create an interactive poll!
                </p>
              </div>
              <button
                onClick={() => setIsFeedModalOpen(true)}
                className="apple-glass-btn text-xs font-semibold px-2.5 sm:px-3 h-8 rounded-full text-primary hover:text-primary/90 flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Icon name="add_circle" size={16}/>
                <span>Create First Poll or Post</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto max-h-[360px] lg:max-h-[640px] flex flex-col gap-2.5 px-2.5 sm:px-3 pb-2.5 chat-scrollbar">
              {feedPosts.map((post) => {
                const author = getAuthor(post.authorId, post)
                const hasActivePoll = post.poll && Array.isArray(post.poll.options) && post.poll.options.length > 0
                const totalPollVotes = hasActivePoll
                  ? post.poll.options.reduce((sum, opt) => sum + (Array.isArray(opt.votes) ? opt.votes.length : 0), 0)
                  : 0

                return (
                  <div
                    key={post.id}
                    className="p-3.5 sm:p-4 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2.5"
                  >
                    {/* Header Row: Author info, date (No right-side tag) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-7 rounded-xl border border-black/10 dark:border-white/15 shrink-0">
                          {author.avatar ? <AvatarImage src={author.avatar} alt={author.name} /> : null}
                          <AvatarFallback className="bg-foreground/10 text-foreground text-[10px] font-bold">
                            {author.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">{author.name}</span>
                          <span className="text-muted-foreground/40 text-xs">•</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {new Date(post.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Regular Post Content (Only shown when NOT a poll to avoid duplicate question) */}
                    {!hasActivePoll && (
                      <div className="flex flex-col gap-1">
                        {post.title && post.title !== post.content && (
                          <h5 className="font-bold text-xs sm:text-fluid-sm text-foreground tracking-tight m-0">{post.title}</h5>
                        )}
                        <p className="text-xs text-foreground/90 font-normal leading-relaxed m-0 break-words">
                          {post.content}
                        </p>
                      </div>
                    )}

                    {/* Interactive Poll Display (Monochrome Icon & Header) */}
                    {hasActivePoll && (
                      <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1.5 truncate">
                            <Icon name="poll" size={15} className="text-foreground shrink-0" />
                            <span className="truncate font-semibold">{post.poll.question || post.content || post.title}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                            {totalPollVotes} {totalPollVotes === 1 ? 'vote' : 'votes'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {post.poll.options.map((opt, optIdx) => {
                            const votes = Array.isArray(opt.votes) ? opt.votes : []
                            const voteCount = votes.length
                            const pct = totalPollVotes > 0 ? Math.round((voteCount / totalPollVotes) * 100) : 0
                            const hasVotedThis = votes.includes(currentUserId)

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleVote(post.id, optIdx)}
                                className={`relative w-full h-8 rounded-lg overflow-hidden border transition-all flex items-center justify-between px-3 cursor-pointer text-left select-none ${
                                  hasVotedThis
                                    ? 'border-foreground/30 bg-foreground/10 shadow-xs'
                                    : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-background/60 dark:bg-black/20'
                                }`}
                              >
                                {/* Progress Bar fill */}
                                <div
                                  className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                                    hasVotedThis ? 'bg-foreground/20' : 'bg-foreground/10'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />

                                <span className="relative z-10 text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                                  {hasVotedThis && (
                                    <Icon name="check_circle" size={13} className="text-foreground shrink-0" />
                                  )}
                                  <span className="truncate">{opt.text}</span>
                                </span>

                                <span className="relative z-10 text-[11px] font-bold text-muted-foreground tabular-nums shrink-0 ml-2">
                                  {pct}% <span className="text-[9px] font-normal opacity-70">({voteCount})</span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* --- NOTICE TAB CONTENT --- */}
        {activeTab === 'notice' && (
          noticePosts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <Icon name="campaign" size={38} className="text-amber-500/40 dark:text-amber-500/50 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="m-0 text-fluid-sm font-semibold text-foreground">No Official Notices</p>
                <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[240px] leading-relaxed">
                  Management announcements and official policies will appear here.
                </p>
              </div>
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="apple-glass-btn text-xs font-semibold px-2.5 sm:px-3 h-8 rounded-full text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Icon name="add_circle" size={16}/>
                <span>Post Company Notice</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto max-h-[360px] lg:max-h-[640px] flex flex-col gap-2.5 px-2.5 sm:px-3 pb-2.5 chat-scrollbar">
              {noticePosts.map((ann, idx) => {
                const author = getAuthor(ann.authorId, ann)
                return (
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
                      <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground truncate">
                        {author.name} &middot; {new Date(ann.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                )
              })}
            </div>
          )
        )}

        {/* --- UPCOMING TAB CONTENT --- */}
        {activeTab === 'upcoming' && (
          upcomingCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <Icon name="event_available" size={38} className="text-muted-foreground/40 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="m-0 text-fluid-sm font-semibold text-foreground">No Upcoming Events</p>
                <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[260px] leading-relaxed">
                  No birthdays, work anniversaries, or calendar events in the next 30 days.
                </p>
              </div>
              {setCurrentView && (
                <button
                  onClick={() => setIsEventModalOpen(true)}
                  className="apple-glass-btn text-xs font-semibold px-2.5 sm:px-3 h-8 rounded-full text-foreground hover:text-foreground/90 flex items-center gap-1.5 cursor-pointer mt-1"
                >
                  <Icon name="add" size={16}/>
                  <span>Add Event</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto max-h-[360px] lg:max-h-[640px] flex flex-col gap-2.5 px-2.5 sm:px-3 pb-2.5 chat-scrollbar">
              {/* Milestones (Birthdays & Work Anniversaries) */}
              {upcomingMilestones.map((milestone, i) => (
                <div key={`ms-${i}`} className="flex items-center gap-3 p-2.5 px-3.5 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08]">
                  <Avatar className="size-8 shrink-0 rounded-xl border border-black/10 dark:border-white/15">
                    {milestone.avatar ? <AvatarImage src={milestone.avatar} alt={milestone.empName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-foreground/10 text-foreground rounded-xl font-bold text-xs">
                      {milestone.empName?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{milestone.empName}</p>
                    <p className="m-0 text-[11px] font-medium text-muted-foreground break-words">{milestone.label}</p>
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px] rounded-full px-2.5 py-0.5 font-bold border-foreground/20 text-foreground bg-foreground/5 shrink-0">
                    {milestone.daysRemaining === 0 ? 'Today' : `${milestone.daysRemaining}d`}
                  </Badge>
                </div>
              ))}

              {/* Upcoming Events */}
              {upcomingEvents.map((evt, idx) => (
                <div
                  key={`ev-${evt.id || idx}`}
                  className="flex items-center gap-3.5 p-2.5 px-3.5 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08] cursor-pointer select-none active:scale-[0.99]"
                  onClick={() => setCurrentView && setCurrentView('calendar')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentView && setCurrentView('calendar') } }}
                >
                  <div className="size-8.5 rounded-xl flex items-center justify-center bg-foreground/5 text-foreground shrink-0">
                    <Icon name="calendar_month" size={18}/>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="m-0 text-fluid-xs font-bold text-foreground break-words truncate">{evt.title}</p>
                    <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground break-words">
                      {formatDate(evt.date)}{evt.time ? ` at ${evt.time}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5 rounded-full border-foreground/15 text-muted-foreground shrink-0">
                    {evt.type}
                  </Badge>
                </div>
              ))}
            </div>
          )
        )}

        {/* Widget Footer: Post / Serve Notice / Add Event Action Button (No separator line, colorless/blurless clean button) */}
        <div className="px-2.5 sm:px-3 pb-3 pt-0 flex items-center">
          {activeTab === 'feed' ? (
            <button
              type="button"
              onClick={() => setIsFeedModalOpen(true)}
              className="w-full h-8.5 rounded-xl font-semibold text-xs transition-all cursor-pointer select-none flex items-center justify-center gap-2 bg-transparent text-foreground/80 hover:text-foreground border border-black/10 dark:border-white/15 hover:border-black/25 dark:hover:border-white/30 active:scale-[0.99]"
            >
              <Icon name="add" size={15} className="text-foreground" />
              <span>Share Update or Create Poll</span>
            </button>
          ) : activeTab === 'notice' ? (
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(true)}
              className="w-full h-8.5 rounded-xl font-semibold text-xs transition-all cursor-pointer select-none flex items-center justify-center gap-2 bg-transparent text-foreground/80 hover:text-foreground border border-black/10 dark:border-white/15 hover:border-black/25 dark:hover:border-white/30 active:scale-[0.99]"
            >
              <Icon name="campaign" size={15} className="text-foreground" />
              <span>Post Company Notice</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEventModalOpen(true)}
              className="w-full h-8.5 rounded-xl font-semibold text-xs transition-all cursor-pointer select-none flex items-center justify-center gap-2 bg-transparent text-foreground/80 hover:text-foreground border border-black/10 dark:border-white/15 hover:border-black/25 dark:hover:border-white/30 active:scale-[0.99]"
            >
              <Icon name="add" size={15} className="text-foreground" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </DashboardWidget>

      {/* --- CREATE FEED POST & POLL DIALOG --- */}
      <Dialog open={isFeedModalOpen} onOpenChange={setIsFeedModalOpen}>
        <DialogContent
          className="max-w-[460px] glass-kormiis border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden shadow-none"
          dialogClassName="p-5 sm:p-6 outline-none flex flex-col"
        >
          {/* Header: Left title, Right raw cross icon (No separator line) */}
          <div className="flex items-center justify-between pb-1 shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-foreground m-0">Create Post or Poll</h3>
            <button
              type="button"
              onClick={() => setIsFeedModalOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0 bg-transparent border-0 flex items-center justify-center outline-none focus:outline-none"
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateFeed} className="flex flex-col flex-1 mt-2 gap-3">
            {/* Middle Space: Seamless transparent canvas without box background color */}
            <div className="flex-1 min-h-[90px] flex flex-col py-1">
              <textarea
                required
                rows={3}
                value={feedContent}
                onChange={(e) => setFeedContent(e.target.value)}
                placeholder="Share your thoughts, ideas, updates or ask a question..."
                className="w-full h-full flex-1 bg-transparent border-0 p-0 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0 resize-none leading-relaxed"
                autoFocus
              />
            </div>

            {/* Auto-Attached Poll Options */}
            <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Icon name="poll" size={16} className="text-foreground" />
                  Poll Options <span className="text-[11px] font-normal text-muted-foreground">(Optional)</span>
                </span>
                {pollOptions.some(o => o.trim()) && (
                  <button
                    type="button"
                    onClick={() => setPollOptions(['', ''])}
                    className="text-[11px] font-medium text-muted-foreground hover:text-rose-500 cursor-pointer bg-transparent border-0"
                  >
                    Clear Options
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-4 text-center">{idx + 1}.</span>
                    <Input
                      type="text"
                      value={opt}
                      onChange={(e) => handlePollOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="h-8.5 rounded-xl bg-background text-xs flex-1"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="size-7 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-muted-foreground transition-colors cursor-pointer bg-transparent border-0"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className="self-start text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 py-0.5 cursor-pointer bg-transparent border-0"
                  >
                    <Icon name="add" size={14} /> Add Option
                  </button>
                )}
              </div>
            </div>

            {/* Footer: Post Button on right (No separator line) */}
            <div className="flex items-center justify-end pt-1 mt-auto shrink-0">
              <Button
                type="submit"
                className="rounded-full h-9.5 px-7 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <span className="liquid-spinner" />
                    <span>Posting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Icon name="send" size={15}/>
                    <span>Post</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- CREATE NOTICE DIALOG (Official Company Notice) --- */}
      <Dialog open={isNoticeModalOpen} onOpenChange={setIsNoticeModalOpen}>
        <DialogContent className="max-w-lg glass-kormiis border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden p-0 shadow-none">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-500">
                <Icon name="campaign" size={20}/>
              </div>
              <DialogTitle className="text-fluid-lg font-bold text-foreground">Post Company Notice</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateNotice} className="flex flex-col gap-4 p-6 pt-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">
                Notice Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="e.g. Q3 Town Hall & Policy Updates"
                className="h-11 rounded-2xl bg-muted/40"
              />
            </div>

            {/* Category & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-fluid-xs font-semibold text-foreground">Category</label>
                <Select value={noticeCategory} onChange={setNoticeCategory}>
                  <SelectItem id="General">General</SelectItem>
                  <SelectItem id="Policy Update">Policy Update</SelectItem>
                  <SelectItem id="Company">Company</SelectItem>
                  <SelectItem id="Benefits">Benefits</SelectItem>
                  <SelectItem id="Emergency">Emergency</SelectItem>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-fluid-xs font-semibold text-foreground">Priority</label>
                <Select value={noticePriority} onChange={setNoticePriority}>
                  <SelectItem id="Normal">Normal</SelectItem>
                  <SelectItem id="Important">Important</SelectItem>
                  <SelectItem id="Urgent">Urgent</SelectItem>
                </Select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">Target Audience</label>
              <Select value={noticeAudience} onChange={setNoticeAudience}>
                <SelectItem id="all">All Team Members</SelectItem>
                <SelectItem id="Engineering">Engineering Dept</SelectItem>
                <SelectItem id="Design">Design Dept</SelectItem>
                <SelectItem id="HR">HR Dept</SelectItem>
                <SelectItem id="Marketing">Marketing Dept</SelectItem>
              </Select>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">
                Official Notice Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                placeholder="Write official company notice details..."
                className="w-full rounded-2xl border border-input bg-muted/40 px-3.5 py-2.5 text-fluid text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-h-[100px]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2.5 border-t border-border/60 dark:border-white/10 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNoticeModalOpen(false)}
                className="rounded-full h-11 px-5 font-semibold"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full h-11 px-6 font-semibold bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-black"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <span className="liquid-spinner" />
                    <span>Publishing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Icon name="campaign" size={16}/>
                    <span>Publish Notice</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- CREATE EVENT MODAL --- */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent
          className="max-w-[460px] glass-kormiis border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden shadow-none"
          dialogClassName="p-5 sm:p-6 outline-none flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1 shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-foreground m-0 flex items-center gap-2">
              <Icon name="calendar_month" size={20} className="text-foreground" />
              <span>Create Event</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0 bg-transparent border-0 flex items-center justify-center outline-none focus:outline-none"
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateEvent} className="flex flex-col flex-1 mt-3 gap-3.5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">
                Event Title <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Quarterly Review, Tech Workshop, Team Lunch"
                className="h-11 rounded-2xl bg-muted/40"
              />
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <DatePicker
                  label="Date *"
                  required
                  value={eventDate}
                  onChange={setEventDate}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-fluid-xs font-semibold text-foreground">Time (Optional)</label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="h-11 rounded-2xl bg-muted/40"
                />
              </div>
            </div>

            {/* Event Type Pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">Event Type</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_TYPES.map((t) => {
                  const isActive = eventType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEventType(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                        isActive
                          ? 'bg-foreground text-background font-bold border border-foreground'
                          : 'bg-muted/40 text-foreground/80 hover:bg-muted/70 hover:text-foreground border border-black/10 dark:border-white/10'
                      }`}
                    >
                      <Icon name={t.icon} size={14} />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-fluid-xs font-semibold text-foreground">Description (Optional)</label>
              <textarea
                rows={3}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Details about location, agenda or requirements..."
                className="w-full rounded-2xl border border-input bg-muted/40 px-3.5 py-2.5 text-fluid text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-h-[75px]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2.5 border-t border-border/60 dark:border-white/10 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEventModalOpen(false)}
                className="rounded-full h-11 px-5 font-semibold"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full h-11 px-6 font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <span className="liquid-spinner" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Icon name="add" size={16}/>
                    <span>Create Event</span>
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
