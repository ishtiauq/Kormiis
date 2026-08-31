import { useState, useEffect } from 'react'
import { Megaphone, Plus, Image as ImageIcon, FileText, Send, Calendar, Clock, Edit, Trash2, Users, AlertTriangle, MessageSquare, Heart, ThumbsUp, PartyPopper, User } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { useConfirm } from '../hooks/useConfirm'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AdSlot from './AdSlot'
import { formatDateTime } from '../services/date.js'

const HoverTooltip = ({ content, children, position = 'center' }) => {
  if (!content) return children
  return (
    <div className="relative group/tooltip inline-flex items-center">
      {children}
      <div className={`absolute bottom-full mb-1 hidden group-hover/tooltip:block z-[999] w-max max-w-[250px] whitespace-normal bg-popover text-popover-foreground border border-border text-[10px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none ${position === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
        {content}
      </div>
    </div>
  )
}

export default function Announcements({ employees, announcements, setAnnouncements, addLog, addToast, currentUser, simulatedRole }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState(null)

  // Form States
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [priority, setPriority] = useState('Normal')
  const [audience, setAudience] = useState('all')

  const [hasPoll, setHasPoll] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [filterCategory, setFilterCategory] = useState('All')

  // Comments State
  const [expandedComments, setExpandedComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [editingComment, setEditingComment] = useState(null) // { postId, commentId, text }
  const [editingReply, setEditingReply] = useState(null) // { postId, commentId, replyId, text }

  const { confirm, ConfirmDialog } = useConfirm()

  const handleAddPollOption = () => setPollOptions([...pollOptions, ''])
  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions]
    newOptions[index] = value
    setPollOptions(newOptions)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title || !content) return addToast('Title and content are required', 'warning')

    if (editingPostId) {
      setAnnouncements(prev => prev.map(p => {
        if (p.id === editingPostId) {
          return {
            ...p,
            title, content, category, priority, audience,
            poll: hasPoll && pollQuestion ? {
              question: pollQuestion,
              options: pollOptions.filter(o => o.trim() !== '').map(opt => ({ text: opt, votes: [] }))
            } : null
          }
        }
        return p
      }))
      addToast('Announcement updated', 'success')
      setEditingPostId(null)
    } else {
      const newPost = {
        id: `ann-${Date.now()}`,
        title,
        content,
        authorId: currentUser?.id || 'admin',
        date: new Date().toISOString(),
        category,
        priority,
        audience,
        attachments: [],
        reactions: { '👍': [], '❤️': [], '👎': [] },
        comments: [],
        readBy: [currentUser?.id || 'admin'],
        poll: hasPoll && pollQuestion ? {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim() !== '').map(opt => ({ text: opt, votes: [] }))
        } : null
      }
      setAnnouncements(prev => [newPost, ...prev])
      addToast('Announcement published successfully!', 'success')
      addLog('Announcement Created', `Title: ${title}`)
    }

    setTitle('')
    setContent('')
    setCategory('General')
    setPriority('Normal')
    setAudience('all')
    setHasPoll(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setIsDialogOpen(false)
  }

  const handleEditPost = (post) => {
    setEditingPostId(post.id)
    setTitle(post.title)
    setContent(post.content)
    setCategory(post.category)
    setPriority(post.priority)
    setAudience(post.audience)
    if (post.poll) {
      setHasPoll(true)
      setPollQuestion(post.poll.question)
      setPollOptions(post.poll.options.map(o => o.text))
    } else {
      setHasPoll(false)
      setPollQuestion('')
      setPollOptions(['', ''])
    }
    setIsDialogOpen(true)
  }

  const handleCancelDialog = () => {
    setIsDialogOpen(false)
    setEditingPostId(null)
    setTitle('')
    setContent('')
    setHasPoll(false)
    setIsAddingCategory(false)
    setNewCategoryName('')
  }

  const handleDelete = async (id) => {
    const ok = await confirm('This announcement will be permanently removed.', 'Delete Announcement?', { destructive: true })
    if (!ok) return
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    addToast('Announcement deleted', 'info')
  }

  const handleReaction = (postId, type) => {
    const userId = currentUser?.id || 'admin'
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        let newReactions = { ...p.reactions }
        let wasAlreadyReacted = false

        Object.keys(newReactions).forEach(t => {
          let currentR = Array.isArray(newReactions[t]) ? newReactions[t] : (newReactions[t] > 0 ? [userId] : [])
          if (currentR.includes(userId)) {
            if (t === type) wasAlreadyReacted = true
            newReactions[t] = currentR.filter(id => id !== userId)
          } else {
            newReactions[t] = currentR
          }
        })

        if (!wasAlreadyReacted) {
          newReactions[type] = [...(newReactions[type] || []), userId]
        }

        return { ...p, reactions: newReactions }
      }
      return p
    }))
  }

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const handleAddComment = (postId) => {
    const text = commentInputs[postId]?.trim()
    if (!text) return

    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...(p.comments || []), { 
            id: `cmt-${Date.now()}`, 
            authorId: currentUser?.id || 'admin',
            authorName: currentUser?.name || 'System Admin', 
            text, 
            date: new Date().toISOString(),
            reactions: { '👍': [], '❤️': [] },
            replies: []
          }]
        }
      }
      return p
    }))
    
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
  }

  const handleDeleteComment = async (postId, commentId) => {
    const ok = await confirm('Delete this comment?', 'Delete Comment', { destructive: true })
    if (!ok) return
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.filter(c => c.id !== commentId)
        }
      }
      return p
    }))
  }

  const handleCommentReaction = (postId, commentId, type) => {
    const userId = currentUser?.id || 'admin'
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              let newReactions = { ...c.reactions }
              let wasAlreadyReacted = false
              
              Object.keys(newReactions).forEach(t => {
                let currentR = Array.isArray(newReactions[t]) ? newReactions[t] : []
                if (currentR.includes(userId)) {
                  if (t === type) wasAlreadyReacted = true
                  newReactions[t] = currentR.filter(id => id !== userId)
                }
              })

              if (!wasAlreadyReacted) {
                newReactions[type] = [...(newReactions[type] || []), userId]
              }
              return { ...c, reactions: newReactions }
            }
            return c
          })
        }
      }
      return p
    }))
  }

  const handleAddReply = (postId, commentId) => {
    const replyKey = `${postId}-${commentId}`
    const text = commentInputs[replyKey]?.trim()
    if (!text) return

    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: [...(c.replies || []), {
                  id: `rep-${Date.now()}`,
                  authorId: currentUser?.id || 'admin',
                  authorName: currentUser?.name || 'System Admin',
                  text,
                  date: new Date().toISOString(),
                  reactions: { '👍': [] }
                }]
              }
            }
            return c
          })
        }
      }
      return p
    }))
    setCommentInputs(prev => ({ ...prev, [replyKey]: '' }))
  }

  const handleReplyReaction = (postId, commentId, replyId, type) => {
    const userId = currentUser?.id || 'admin'
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: c.replies.map(r => {
                  if (r.id === replyId) {
                    let newReactions = { ...r.reactions }
                    let wasAlreadyReacted = false
                    
                    Object.keys(newReactions).forEach(t => {
                      let currentR = Array.isArray(newReactions[t]) ? newReactions[t] : []
                      if (currentR.includes(userId)) {
                        if (t === type) wasAlreadyReacted = true
                        newReactions[t] = currentR.filter(id => id !== userId)
                      }
                    })

                    if (!wasAlreadyReacted) {
                      newReactions[type] = [...(newReactions[type] || []), userId]
                    }
                    return { ...r, reactions: newReactions }
                  }
                  return r
                })
              }
            }
            return c
          })
        }
      }
      return p
    }))
  }

  const handleDeleteReply = async (postId, commentId, replyId) => {
    const ok = await confirm('Delete this reply?', 'Delete Reply', { destructive: true })
    if (!ok) return
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return { ...c, replies: c.replies.filter(r => r.id !== replyId) }
            }
            return c
          })
        }
      }
      return p
    }))
  }

  const handleSaveEditComment = (postId, commentId) => {
    const text = editingComment?.text?.trim()
    if (!text) return
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => c.id === commentId ? { ...c, text } : c)
        }
      }
      return p
    }))
    setEditingComment(null)
  }

  const handleSaveEditReply = (postId, commentId, replyId) => {
    const text = editingReply?.text?.trim()
    if (!text) return
    setAnnouncements(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: c.replies.map(r => r.id === replyId ? { ...r, text } : r)
              }
            }
            return c
          })
        }
      }
      return p
    }))
    setEditingReply(null)
  }

  const getReactionCount = (r) => Array.isArray(r) ? r.length : (r || 0)
  const getReactionTitle = (r) => {
    if (!Array.isArray(r) || r.length === 0) return ''
    return 'By: ' + r.map(id => employees.find(e => e.id === id)?.name || id).join(', ')
  }

  const canModify = (authorId) => {
    return currentUser?.id === authorId || simulatedRole === 'Admin'
  }

  const getPriorityBorder = (p) => {
    if (p === 'Urgent') return 'border-l-destructive'
    if (p === 'Important') return 'border-l-amber-500'
    return 'border-l-primary'
  }
  
  const getPriorityBadgeVariant = (p) => {
    if (p === 'Urgent') return 'destructive'
    if (p === 'Important') return 'secondary'
    return 'outline'
  }

  const allCategories = ['General', 'Policy Update', 'Event', 'Emergency']
  const uniqueCategories = ['All', ...new Set([...allCategories, ...announcements.map(a => a.category).filter(Boolean)])]

  const filteredAnnouncements = announcements.filter(a => filterCategory === 'All' || a.category === filterCategory)

  // Track unique views
  useEffect(() => {
    if (!currentUser || !currentUser.id) return
    let updated = false
    const newAnnouncements = announcements.map(a => {
      const isVisible = filterCategory === 'All' || a.category === filterCategory
      if (isVisible) {
        const readByArray = Array.isArray(a.readBy) ? a.readBy : []
        if (!readByArray.includes(currentUser.id)) {
          updated = true
          return { ...a, readBy: [...readByArray, currentUser.id] }
        }
      }
      return a
    })
    
    if (updated) {
      setAnnouncements(newAnnouncements)
    }
  }, [filterCategory, currentUser, announcements, setAnnouncements])

  return (
    <div className="fade-in pb-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Megaphone size={20} className="text-primary" />
          Announcements
        </h1>
        
        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleCancelDialog()
            else setIsDialogOpen(true)
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingPostId(null)
                setTitle('')
                setContent('')
                setHasPoll(false)
              }}>
                <Plus size={16} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">New Post</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPostId ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6 mt-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Town Hall Meeting" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  {isAddingCategory ? (
                    <div className="flex gap-2">
                      <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New category..." className="h-9 text-xs" />
                      <Button type="button" size="sm" className="h-9 px-2" onClick={() => {
                        if (newCategoryName.trim()) setCategory(newCategoryName.trim())
                        setIsAddingCategory(false)
                        setNewCategoryName('')
                      }}>Add</Button>
                      <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={category} onChange={setCategory}>
                          {uniqueCategories.filter(c => c !== 'All').map(c => (
                            <SelectItem key={c} id={c}>{c}</SelectItem>
                          ))}
                        </Select>
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsAddingCategory(true)}>
                        <Plus size={16} />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select value={priority} onChange={setPriority}>
                    <SelectItem id="Normal">Normal</SelectItem>
                    <SelectItem id="Important">Important</SelectItem>
                    <SelectItem id="Urgent">Urgent</SelectItem>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Target Audience</label>
                  <Select value={audience} onChange={setAudience}>
                    <SelectItem id="all">All Employees</SelectItem>
                    <SelectItem id="Engineering">Engineering Dept</SelectItem>
                    <SelectItem id="Design">Design Dept</SelectItem>
                    <SelectItem id="HR">HR Dept</SelectItem>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Message Content</label>
                <textarea required rows={6} value={content} onChange={(e) => setContent(e.target.value)} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" placeholder="Type your message here..." />
              </div>

              <div className="flex flex-col gap-4 p-4 rounded-lg border border-dashed bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <AlertTriangle size={16} className="text-muted-foreground" /> Attach Poll (Optional)
                  </span>
                  <button type="button" role="switch" aria-checked={hasPoll} onClick={() => setHasPoll(!hasPoll)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${hasPoll ? 'bg-primary' : 'bg-input'}`}>
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${hasPoll ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {hasPoll && (
                  <div className="flex flex-col gap-3 pt-2">
                    <Input aria-label="Poll question" type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll Question..." />
                    {pollOptions.map((opt, i) => (
                      <Input key={i} aria-label={`Poll option ${i + 1}`} type="text" value={opt} onChange={(e) => handlePollOptionChange(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPollOption} className="self-start mt-1">
                      <Plus size={14} className="mr-1" /> Add Option
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={handleCancelDialog}>Cancel</Button>
                <Button type="submit">{editingPostId ? 'Save Changes' : 'Publish Announcement'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <div className="border-t border-border mb-6" />
      
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
        {uniqueCategories.map(cat => (
          <Badge 
            key={cat} 
            variant={filterCategory === cat ? 'default' : 'secondary'}
            className="cursor-pointer hover:bg-primary/80 whitespace-nowrap"
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:gap-6">
        {filteredAnnouncements.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/10">
            <CardContent className="p-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
              <Megaphone size={40} className="text-muted-foreground/50" />
              <p>No announcements found in this category.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map(post => {
            const author = post.authorId === 'system' ? { name: 'System Auto-Post', avatar: '' } : employees.find(e => e.id === post.authorId) || { name: 'Unknown User' }
            const dateStr = formatDateTime(post.date)
            const isUrgent = post.priority === 'Urgent'

            return (
              <Card key={post.id} className="overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 pt-5 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <Avatar className="h-10 w-10">
                      {author.avatar ? (
                        <AvatarImage src={author.avatar} alt={author.name} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary font-medium"><User size={20} /></AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm leading-none">{author.name}</span>
                        {isUrgent && <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase animate-pulse tracking-wider">Pinned</Badge>}
                        {post.priority !== 'Normal' && <Badge variant={getPriorityBadgeVariant(post.priority)} className="h-5 px-1.5 text-[10px] uppercase tracking-wider">{post.priority}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {dateStr} &bull; {post.audience === 'all' ? 'All Employees' : post.audience}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="hidden sm:inline-flex">{post.category}</Badge>
                    {canModify(post.authorId) && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEditPost(post)} className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Edit post">
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete post">
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-5">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2">{post.title}</h3>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/90">
                    {post.content}
                  </div>

                  {post.poll && (
                    <div className="mt-6 p-4 rounded-xl border border-border/50 bg-muted/20">
                      <h4 className="font-medium text-sm mb-4 flex items-center gap-2 text-foreground">
                         <span className="text-lg">📊</span> {post.poll.question}
                      </h4>
                      <div className="flex flex-col gap-3">
                        {post.poll.options.map((opt, i) => {
                          const votes = opt.votes.length
                          const totalVotes = post.poll.options.reduce((sum, o) => sum + o.votes.length, 0)
                          const pct = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="flex-1 relative overflow-hidden h-9 rounded-md bg-muted/50 border border-transparent hover:border-border transition-colors">
                                <div className="absolute top-0 left-0 h-full opacity-10 bg-primary transition-all duration-500 ease-in-out" style={{ width: `${pct}%` }} />
                                <div className="absolute top-0 left-0 h-full w-full flex items-center px-3 text-sm font-medium text-foreground">
                                  {opt.text}
                                </div>
                              </div>
                              <div className="w-10 text-sm text-right text-muted-foreground font-medium">{votes}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-3 pb-3 border-t flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-wrap gap-1 -ml-2">
                    <HoverTooltip content={getReactionTitle(post.reactions['👍'])}>
                      <Button variant="ghost" size="sm" onClick={() => handleReaction(post.id, '👍')} className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                        👍 <span className="ml-1.5 text-xs font-medium">{getReactionCount(post.reactions['👍'])}</span>
                      </Button>
                    </HoverTooltip>
                    <HoverTooltip content={getReactionTitle(post.reactions['❤️'])}>
                      <Button variant="ghost" size="sm" onClick={() => handleReaction(post.id, '❤️')} className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                        ❤️ <span className="ml-1.5 text-xs font-medium">{getReactionCount(post.reactions['❤️'])}</span>
                      </Button>
                    </HoverTooltip>
                    <HoverTooltip content={getReactionTitle(post.reactions['👎'])}>
                      <Button variant="ghost" size="sm" onClick={() => handleReaction(post.id, '👎')} className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                        👎 <span className="ml-1.5 text-xs font-medium">{getReactionCount(post.reactions['👎'])}</span>
                      </Button>
                    </HoverTooltip>
                    <Button variant="ghost" size="sm" onClick={() => toggleComments(post.id)} className="h-8 px-2 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                      <MessageSquare size={14} className="mr-1.5" /> <span className="text-xs font-medium">{(post.comments || []).length}</span>
                    </Button>
                  </div>
                  <HoverTooltip content={getReactionTitle(post.readBy)} position="right">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-help transition-colors py-1">
                      <Users size={13} /> {Array.isArray(post.readBy) ? post.readBy.length : 0} views
                    </div>
                  </HoverTooltip>
                </CardFooter>

                {expandedComments[post.id] && (
                  <div className="border-t border-border bg-muted/10 p-4">
                    <div className="flex flex-col gap-3 mb-4 max-h-[250px] overflow-y-auto pr-2">
                      {!(post.comments && post.comments.length > 0) ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
                      ) : (
                        post.comments.map(comment => {
                          const commentAuthor = employees.find(e => e.id === comment.authorId)
                          return (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-7 w-7 mt-0.5">
                              {commentAuthor?.avatar ? (
                                <AvatarImage src={commentAuthor.avatar} alt={comment.authorName} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium"><User size={14} /></AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 flex flex-col">
                              <div className="bg-card border border-border/40 rounded-lg p-2.5 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold">{comment.authorName}</span>
                                  <span className="text-[10px] text-muted-foreground">{formatDateTime(comment.date)}</span>
                                </div>
                                {editingComment?.commentId === comment.id ? (
                                  <div className="flex flex-col gap-2 mt-1">
                                    <Input 
                                      value={editingComment.text} 
                                      onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                                      className="h-7 text-xs"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setEditingComment(null)}>Cancel</Button>
                                      <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleSaveEditComment(post.id, comment.id)}>Save</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-foreground/90">{comment.text}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 ml-1">
                                <HoverTooltip content={getReactionTitle(comment.reactions?.['👍'])}>
                                  <button onClick={() => handleCommentReaction(post.id, comment.id, '👍')} className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                    👍 {getReactionCount(comment.reactions?.['👍'])}
                                  </button>
                                </HoverTooltip>
                                <HoverTooltip content={getReactionTitle(comment.reactions?.['❤️'])}>
                                  <button onClick={() => handleCommentReaction(post.id, comment.id, '❤️')} className="text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                                    ❤️ {getReactionCount(comment.reactions?.['❤️'])}
                                  </button>
                                </HoverTooltip>
                                <HoverTooltip content={getReactionTitle(comment.reactions?.['👎'])}>
                                  <button onClick={() => handleCommentReaction(post.id, comment.id, '👎')} className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                    👎 {getReactionCount(comment.reactions?.['👎'])}
                                  </button>
                                </HoverTooltip>
                                <button onClick={() => setExpandedComments(prev => ({ ...prev, [`reply-${comment.id}`]: !prev[`reply-${comment.id}`] }))} className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors">
                                  Reply
                                </button>
                                {canModify(comment.authorId) && (
                                  <>
                                    <button onClick={() => setEditingComment({ postId: post.id, commentId: comment.id, text: comment.text })} className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto">
                                      Edit
                                    </button>
                                    <button onClick={() => handleDeleteComment(post.id, comment.id)} className="text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors ml-2">
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                              
                              {/* Nested Replies */}
                              {((comment.replies && comment.replies.length > 0) || expandedComments[`reply-${comment.id}`]) && (
                                <div className="flex flex-col gap-2 mt-2 ml-4 pl-3 border-l-2 border-border/50">
                                  {comment.replies?.map(reply => {
                                    const replyAuthor = employees.find(e => e.id === reply.authorId)
                                    return (
                                    <div key={reply.id} className="flex gap-2">
                                      <Avatar className="h-5 w-5 mt-0.5">
                                        {replyAuthor?.avatar ? (
                                          <AvatarImage src={replyAuthor.avatar} alt={reply.authorName} />
                                        ) : (
                                          <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-medium"><User size={12} /></AvatarFallback>
                                        )}
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="bg-muted/30 border border-border/30 rounded-md p-2">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10px] font-bold">{reply.authorName}</span>
                                          </div>
                                          {editingReply?.replyId === reply.id ? (
                                            <div className="flex flex-col gap-1 mt-1">
                                              <Input 
                                                value={editingReply.text} 
                                                onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                                                className="h-6 text-[10px]"
                                              />
                                              <div className="flex gap-1 mt-1">
                                                <Button size="sm" variant="outline" className="h-5 px-1.5 text-[9px]" onClick={() => setEditingReply(null)}>Cancel</Button>
                                                <Button size="sm" className="h-5 px-1.5 text-[9px]" onClick={() => handleSaveEditReply(post.id, comment.id, reply.id)}>Save</Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[11px] text-foreground/80">{reply.text}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 ml-1">
                                          <HoverTooltip content={getReactionTitle(reply.reactions?.['👍'])}>
                                            <button onClick={() => handleReplyReaction(post.id, comment.id, reply.id, '👍')} className="text-[9px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                              👍 {getReactionCount(reply.reactions?.['👍'])}
                                            </button>
                                          </HoverTooltip>
                                          <HoverTooltip content={getReactionTitle(reply.reactions?.['❤️'])}>
                                            <button onClick={() => handleReplyReaction(post.id, comment.id, reply.id, '❤️')} className="text-[9px] font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                                              ❤️ {getReactionCount(reply.reactions?.['❤️'])}
                                            </button>
                                          </HoverTooltip>
                                          <HoverTooltip content={getReactionTitle(reply.reactions?.['👎'])}>
                                            <button onClick={() => handleReplyReaction(post.id, comment.id, reply.id, '👎')} className="text-[9px] font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                              👎 {getReactionCount(reply.reactions?.['👎'])}
                                            </button>
                                          </HoverTooltip>
                                          {canModify(reply.authorId) && (
                                            <>
                                              <button onClick={() => setEditingReply({ postId: post.id, commentId: comment.id, replyId: reply.id, text: reply.text })} className="text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto">
                                                Edit
                                              </button>
                                              <button onClick={() => handleDeleteReply(post.id, comment.id, reply.id)} className="text-[9px] font-medium text-muted-foreground hover:text-destructive transition-colors ml-2">
                                                Delete
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )})}
                                  {expandedComments[`reply-${comment.id}`] && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input 
                                        placeholder="Write a reply..." 
                                        className="h-6 text-[11px]" 
                                        value={commentInputs[`${post.id}-${comment.id}`] || ''}
                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [`${post.id}-${comment.id}`]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddReply(post.id, comment.id) }}
                                      />
                                      <Button size="sm" className="h-6 px-2" onClick={() => handleAddReply(post.id, comment.id)}>
                                        <Send size={10} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )})
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Write a comment..." 
                        className="h-8 text-xs" 
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id) }}
                      />
                      <Button size="sm" className="h-8 px-3" onClick={() => handleAddComment(post.id)}>
                        <Send size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
      <ConfirmDialog />
      <AdSlot />
    </div>
  )
}
