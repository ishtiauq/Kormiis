import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/ui/Icon.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'

import { Select, SelectItem } from '@/components/ui/select.jsx'
import TooltipPopover from '@/components/TooltipPopover.jsx'

const COLORS = [
  { id: 'yellow', value: 'bg-amber-100 dark:bg-amber-500/20', border: 'border-amber-200 dark:border-amber-500/30' },
  { id: 'blue', value: 'bg-blue-100 dark:bg-blue-500/20', border: 'border-blue-200 dark:border-blue-500/30' },
  { id: 'green', value: 'bg-emerald-100 dark:bg-emerald-500/20', border: 'border-emerald-200 dark:border-emerald-500/30' },
  { id: 'pink', value: 'bg-pink-100 dark:bg-pink-500/20', border: 'border-pink-200 dark:border-pink-500/30' },
  { id: 'purple', value: 'bg-purple-100 dark:bg-purple-500/20', border: 'border-purple-200 dark:border-purple-500/30' },
  { id: 'default', value: 'bg-card', border: 'border-border' }
]

const PRIORITY_STYLES = {
  High: 'bg-black/20 dark:bg-white/25 text-foreground border-black/25 dark:border-white/30 font-bold',
  Medium: 'bg-black/15 dark:bg-white/20 text-foreground border-black/20 dark:border-white/25',
  Low: 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20'
}

export default function Notes({ notes = [], setNotes, currentUser, addToast }) {
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [viewingNote, setViewingNote] = useState(null)
  const [noteToDelete, setNoteToDelete] = useState(null)
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('text') // 'text' | 'checklist'
  const [items, setItems] = useState([]) // For checklist
  const [color, setColor] = useState(COLORS[5])
  const [priority, setPriority] = useState('Medium')
  const [pinned, setPinned] = useState(false)
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState(null)
  const [isDailyChecklist, setIsDailyChecklist] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Load editing data
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '')
      setContent(editingNote.content || '')
      setType(editingNote.type || 'text')
      setItems(editingNote.items || [])
      setColor(COLORS.find(c => c.id === editingNote.color?.id) || COLORS[5])
      setPriority(editingNote.priority || 'Medium')
      setPinned(editingNote.pinned || false)
      setAudioURL(editingNote.audioURL || null)
      setIsDailyChecklist(editingNote.isDailyChecklist || false)
    } else {
      resetForm()
    }
  }, [editingNote])

  const resetForm = () => {
    setTitle('')
    setContent('')
    setType('text')
    setItems([])
    setColor(COLORS[5])
    setPriority('Medium')
    setPinned(false)
    setAudioURL(null)
    setIsDailyChecklist(false)
  }

  const handleSave = () => {
    if (!title.trim() && !content.trim() && items.length === 0 && !audioURL) {
      addToast('Note cannot be empty', 'danger')
      return
    }

    const noteData = {
      id: editingNote ? editingNote.id : `note-${Date.now()}`,
      title, content, type, items, color, priority, pinned, audioURL,
      isDailyChecklist: type === 'checklist' ? isDailyChecklist : false,
      ownerId: currentUser?.id || currentUser?.uid || '',
      updatedAt: new Date().toISOString()
    }

    if (editingNote) {
      setNotes(notes.map(n => n.id === noteData.id ? noteData : n))
      addToast('Note updated', 'success')
    } else {
      setNotes([noteData, ...notes])
      addToast('Note created', 'success')
    }
    
    setShowModal(false)
    setEditingNote(null)
  }

  const confirmDelete = (id) => {
    setNotes(notes.filter(n => n.id !== id))
    addToast('Note deleted', 'success')
    if (viewingNote?.id === id) {
      setShowViewModal(false)
    }
    setNoteToDelete(null)
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    setNoteToDelete(id)
  }

  const togglePin = (id, e) => {
    if (e) e.stopPropagation()
    setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
    if (viewingNote?.id === id) {
      setViewingNote({ ...viewingNote, pinned: !viewingNote.pinned })
    }
  }

  const toggleChecklistItem = (noteId, itemId, e) => {
    e.stopPropagation()
    setNotes(notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          items: n.items.map(item => item.id === itemId ? { ...item, done: !item.done } : item)
        }
      }
      return n
    }))
  }

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = () => setAudioURL(reader.result)
        audioChunksRef.current = []
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      addToast("Microphone access denied. Please grant permissions.", "danger")
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }

  const removeAudio = () => {
    setAudioURL(null)
  }

  const myOwnerId = currentUser?.id || currentUser?.uid || ''
  const myNotes = notes.filter(n => !n.ownerId || n.ownerId === myOwnerId)
  const pinnedNotes = myNotes.filter(n => n.pinned)
  const otherNotes = myNotes.filter(n => !n.pinned)

  const NoteCard = ({ note }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      className={`relative group p-5 rounded-2xl border ${note.color?.value || 'bg-card'} ${note.color?.border || 'border-border'} shadow-sm cursor-pointer overflow-hidden break-inside-avoid mb-4 transition-all`}
      onClick={() => { setViewingNote(note); setShowViewModal(true) }}
    >
      {/* Top Actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {note.pinned ? (
          <div className="text-primary opacity-80">
            <Icon name="push_pin" size={16}/>
          </div>
        ) : <div />}
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_STYLES[note.priority || 'Medium']}`}>
          {note.priority || 'Medium'} Priority
        </div>
      </div>

      {note.title && <h3 className="text-lg font-bold text-foreground mb-2 leading-tight flex items-center gap-2">
        {note.isDailyChecklist && <Icon name="task_alt" className="text-primary" size={18}/>}
        {note.title}
      </h3>}
      
      {note.type === 'text' && note.content && (
        <p className="text-fluid-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">{note.content}</p>
      )}

      {note.type === 'checklist' && note.items && note.items.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {note.items.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center gap-2 group/item" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => toggleChecklistItem(note.id, item.id, e)}
                className={`flex-shrink-0 size-5 rounded border flex items-center justify-center transition-colors ${item.done ? 'bg-primary border-primary text-primary-foreground' : 'border-foreground/30 hover:border-primary'}`}
              >
                {item.done && <Icon name="check" size={14}/>}
              </button>
              <span className={`text-sm truncate transition-all ${item.done ? 'text-foreground/40 line-through' : 'text-foreground/90'}`}>
                {item.text}
              </span>
            </div>
          ))}
          {note.items.length > 5 && <span className="text-xs font-semibold text-muted-foreground mt-1">+{note.items.length - 5} more items</span>}
        </div>
      )}

      {note.audioURL && (
        <div className="mt-4 pt-4 border-t border-foreground/10" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70 mb-2">
            <Icon name="mic" size={14}/> Voice Note
          </div>
          <audio src={note.audioURL} controls className="w-full h-8" />
        </div>
      )}

      <div className="mt-4 text-[10px] text-foreground/50 font-medium text-right">
        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </motion.div>
  )

  return (
    <div className="animate-fade-in pb-10 flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="sticky_note_2" className="text-foreground" size={24}/>
          Notes
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      
      <div className="flex justify-end w-full">
        <Button onClick={() => { setEditingNote(null); setShowModal(true) }} className="hidden sm:flex gap-2 rounded-xl shadow-sm bg-primary hover:bg-primary/90">
          <Icon name="add" size={18}/> New Note
        </Button>
      </div>

      {myNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Icon name="edit_note" className="text-primary mb-4" size={56}/>
          <h3 className="text-xl font-bold text-foreground mb-2">No notes yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Create your first note to capture ideas, to-dos, or voice memos!</p>
          <Button onClick={() => setShowModal(true)} variant="outline" className="rounded-xl">Create Note</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                <Icon name="push_pin" size={16}/> Pinned
              </div>
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                <AnimatePresence>
                  {pinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
                </AnimatePresence>
              </div>
            </div>
          )}
          
          {otherNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 mt-4">
                  <Icon name="notes" size={16}/> Others
                </div>
              )}
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                <AnimatePresence>
                  {otherNotes.map(note => <NoteCard key={note.id} note={note} />)}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note Editor Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]`}
            >
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${color.value} ${color.border}`}>
                <div className="flex items-center gap-2">
                  <Icon name={type === 'checklist' ? 'check_box' : 'edit_document'} className="text-foreground/70" size={20}/>
                  <span className="font-bold text-foreground">{editingNote ? 'Edit Note' : 'Create Note'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPinned(!pinned)} className={`p-2 rounded-xl transition-colors ${pinned ? 'bg-primary/20 text-primary' : 'hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60'}`} title="Pin Note">
                    <Icon name="push_pin" size={18}/>
                  </button>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60 transition-colors">
                    <Icon name="close" size={18}/>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
                <Input 
                  value={title} onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Note Title" 
                  className="text-fluid-xl font-bold border-none bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto"
                />

                {type === 'text' ? (
                  <textarea 
                    value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your note here..."
                    className="w-full min-h-[150px] border-none bg-transparent px-0 shadow-none focus:outline-none resize-none text-fluid text-foreground placeholder:text-muted-foreground/50"
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button 
                          onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
                          className={`flex-shrink-0 size-5 rounded border flex items-center justify-center transition-colors ${item.done ? 'bg-primary border-primary text-primary-foreground' : 'border-foreground/30'}`}
                        >
                          {item.done && <Icon name="check" size={14}/>}
                        </button>
                        <Input 
                          value={item.text} 
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))}
                          className={`flex-1 border-none bg-transparent h-8 px-1 focus-visible:ring-1 focus-visible:ring-primary ${item.done ? 'text-muted-foreground line-through' : ''}`}
                          placeholder="List item..."
                        />
                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded">
                          <Icon name="close" size={16}/>
                        </button>
                      </div>
                    ))}
                      <Button variant="ghost" size="sm" onClick={() => setItems([...items, { id: Date.now(), text: '', done: false }])} className="text-primary hover:text-primary hover:bg-primary/10 mt-2 self-start rounded-lg px-3">
                        <Icon name="add" className="mr-1.5" size={18}/> Add Item
                      </Button>

                      <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            Set as a daily checklist
                          </label>
                        </div>
                        <button
                          onClick={() => setIsDailyChecklist(!isDailyChecklist)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isDailyChecklist ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDailyChecklist ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  )}

                {/* Audio Section */}
                <div className="mt-2 p-4 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold flex items-center gap-2"><Icon name="mic" size={16}/> Audio Note</span>
                    {audioURL && (
                      <button onClick={removeAudio} className="text-xs text-destructive hover:underline">Remove</button>
                    )}
                  </div>
                  {audioURL ? (
                    <audio src={audioURL} controls className="w-full h-10" />
                  ) : (
                    <div className="flex items-center gap-3">
                      {isRecording ? (
                        <Button onClick={stopRecording} variant="destructive" className="animate-pulse flex items-center gap-2">
                          <Icon name="stop_circle" size={18}/> Stop Recording
                        </Button>
                      ) : (
                        <Button onClick={startRecording} variant="secondary" className="flex items-center gap-2">
                          <Icon name="mic" size={18}/> Start Recording
                        </Button>
                      )}
                      {isRecording && <span className="text-xs font-bold text-destructive animate-pulse">Recording...</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer / Toolbar */}
              <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Type Toggle */}
                  <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setType('text')} className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${type === 'text' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                      <Icon name="subject" size={16}/> Text
                    </button>
                    <button onClick={() => setType('checklist')} className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 border-l border-border ${type === 'checklist' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                      <Icon name="check_box" size={16}/> List
                    </button>
                  </div>

                  {/* Priority Select */}
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectItem value="High">
                      <div className="flex items-center gap-2 text-red-500"><Icon name="flag" size={14}/> High</div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="flex items-center gap-2 text-amber-500"><Icon name="flag" size={14}/> Medium</div>
                    </SelectItem>
                    <SelectItem value="Low">
                      <div className="flex items-center gap-2 text-blue-500"><Icon name="flag" size={14}/> Low</div>
                    </SelectItem>
                  </Select>

                  {/* Color Picker */}
                  <div className="flex items-center gap-1.5 ml-2">
                    {COLORS.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setColor(c)}
                        className={`size-6 rounded-full border-2 transition-transform ${c.value} ${color.id === c.id ? 'scale-125 border-primary shadow-sm' : 'border-transparent hover:scale-110'}`}
                        title={c.id}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} className="rounded-xl px-6 font-bold shadow-sm">Save Note</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note View Modal */}
      <AnimatePresence>
        {showViewModal && viewingNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowViewModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]`}
            >
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${viewingNote.color?.value || 'bg-card'} ${viewingNote.color?.border || 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <div className={`px-1.5 py-0.5 rounded-[4px] text-[8px] sm:text-[9px] font-bold uppercase tracking-wide border ${PRIORITY_STYLES[viewingNote.priority || 'Medium']}`}>
                    {viewingNote.priority || 'Medium'} Priority
                  </div>
                  {viewingNote.pinned && <Icon name="push_pin" className="text-primary ml-1" size={16}/>}
                  {viewingNote.isDailyChecklist && <Icon name="task_alt" className="text-primary ml-1" size={16}/>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowViewModal(false)} className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60 transition-colors">
                    <Icon name="close" size={18}/>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                {viewingNote.title && (
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground break-words">{viewingNote.title}</h2>
                )}

                {viewingNote.type === 'text' && viewingNote.content && (
                  <div className="text-fluid text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {viewingNote.content}
                  </div>
                )}

                {viewingNote.type === 'checklist' && viewingNote.items && viewingNote.items.length > 0 && (
                  <div className="flex flex-col gap-3 mt-2">
                    {viewingNote.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <button 
                          onClick={(e) => toggleChecklistItem(viewingNote.id, item.id, e)}
                          className={`flex-shrink-0 size-6 rounded-md border-2 flex items-center justify-center transition-colors ${item.done ? 'bg-primary border-primary text-primary-foreground' : 'border-foreground/30 hover:border-primary'}`}
                        >
                          {item.done && <Icon name="check" size={16}/>}
                        </button>
                        <span className={`text-base transition-all break-words flex-1 ${item.done ? 'text-foreground/50 line-through' : 'text-foreground/90'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {viewingNote.audioURL && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <Icon name="mic" className="text-primary" size={18}/> Voice Note
                    </div>
                    <audio src={viewingNote.audioURL} controls className="w-full h-10" />
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-4 font-medium">
                  Last updated: {new Date(viewingNote.updatedAt).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Footer / Toolbar */}
              <div className="p-4 border-t border-border flex items-center justify-center gap-3 sm:gap-4 bg-muted/10">
                <Button 
                  variant="outline"
                  onClick={(e) => togglePin(viewingNote.id, e)} 
                  className={`rounded-xl px-4 sm:px-6 font-bold shadow-sm flex items-center gap-2 ${viewingNote.pinned ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10' : ''}`}
                >
                  <Icon name="push_pin" size={18}/> {viewingNote.pinned ? "Unpin" : "Pin"}
                </Button>

                <Button 
                  onClick={() => {
                    setEditingNote(viewingNote);
                    setShowViewModal(false);
                    setShowModal(true);
                  }} 
                  className="rounded-xl px-4 sm:px-6 font-bold shadow-sm flex items-center gap-2"
                >
                  <Icon name="edit" size={18}/> Edit
                </Button>

                <Button 
                  variant="destructive" 
                  onClick={(e) => handleDelete(viewingNote.id, e)} 
                  className="rounded-xl px-4 sm:px-6 flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-none font-bold shadow-none"
                >
                  <Icon name="delete" size={18}/> Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setNoteToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border p-6 flex flex-col items-center text-center"
            >
              <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <Icon name="warning" size={28}/>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Delete Note?</h3>
              <p className="text-fluid-sm text-muted-foreground mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
              
              <div className="flex items-center gap-3 w-full">
                <Button variant="outline" onClick={() => setNoteToDelete(null)} className="flex-1 rounded-xl">Cancel</Button>
                <Button variant="destructive" onClick={() => confirmDelete(noteToDelete)} className="flex-1 rounded-xl shadow-sm">Delete</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Button
        className="sm:hidden fixed bottom-[76px] right-8 h-14 w-14 rounded-full shadow-lg z-50 p-0 hover:scale-105 active:scale-95 transition-transform bg-primary text-primary-foreground"
        onClick={() => { setEditingNote(null); setShowModal(true) }}
        aria-label="New Note"
      >
        <Icon name="add" size={24}/>
      </Button>
    </div>
  )
}
