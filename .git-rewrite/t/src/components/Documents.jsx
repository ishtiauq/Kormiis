import { useState, useRef, useEffect } from 'react'
import { FileText, Search, Upload, Download, Trash2, X, Folder, FolderOpen, FileSpreadsheet, FileImage, FileArchive, File, Settings, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { useConfirm } from '../hooks/useConfirm'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import AdSlot from './AdSlot'
import { formatDate } from '../services/date.js'

const BLUE = '#3b82f6'
const defaultCategories = [
  { id: 'hr-docs', label: 'HR Documents', icon: Folder, color: BLUE },
  { id: 'policies', label: 'Policies', icon: FileText, color: BLUE },
  { id: 'forms', label: 'Forms', icon: FileText, color: BLUE },
  { id: 'training', label: 'Training', icon: FileArchive, color: BLUE },
  { id: 'other', label: 'Other', icon: File, color: BLUE },
]

const getFileIcon = (type) => {
  if (!type) return File
  const t = type.toLowerCase()
  if (t.includes('pdf')) return FileText
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls') || t.includes('csv')) return FileSpreadsheet
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('gif')) return FileImage
  if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('gz')) return FileArchive
  return File
}

const formatFileSize = (bytes) => {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Documents({ documents, setDocuments, addLog, addToast, currentUser }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [categories, setCategories] = useState(defaultCategories)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [catFormName, setCatFormName] = useState('')

  const { confirm, ConfirmDialog } = useConfirm()

  const categoryScrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
    }
  }

  useEffect(() => {
    checkCategoryScroll()
    const el = categoryScrollRef.current
    if (el) {
      el.addEventListener('scroll', checkCategoryScroll)
      return () => el.removeEventListener('scroll', checkCategoryScroll)
    }
  }, [categories])

  const scrollCategory = (dir) => {
    const el = categoryScrollRef.current
    if (el) el.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  const fileInputRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      setTimeout(checkCategoryScroll, 50)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('hr-docs')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState(null)

  const resetForm = () => {
    setFormName('')
    setFormCategory('hr-docs')
    setFormDescription('')
    setFormFile(null)
    setEditingDoc(null)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formName) return addToast('Document name is required', 'warning')

    if (editingDoc) {
      setDocuments(prev => prev.map(d =>
        d.id === editingDoc.id
          ? { ...d, name: formName, category: formCategory, description: formDescription }
          : d
      ))
      addToast('Document updated', 'success')
      addLog('Document Updated', formName)
    } else {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: formName,
        category: formCategory,
        description: formDescription,
        fileName: formFile?.name || `${formName.replace(/\s+/g, '_')}.pdf`,
        fileSize: formFile?.size || Math.floor(Math.random() * 5000000) + 100000,
        fileType: formFile?.type || 'application/pdf',
        uploadedBy: currentUser?.id || 'unknown',
        uploadedAt: new Date().toISOString(),
      }
      setDocuments(prev => [newDoc, ...prev])
      addToast('Document uploaded successfully', 'success')
      addLog('Document Uploaded', formName)
    }

    setShowUploadModal(false)
    resetForm()
  }

  const handleDelete = async (id) => {
    const ok = await confirm('This document will be permanently removed.', 'Delete Document?', { destructive: true })
    if (!ok) return
    setDocuments(prev => prev.filter(d => d.id !== id))
    addToast('Document deleted', 'info')
  }

  const handleSaveCategory = () => {
    if (!catFormName.trim()) return addToast('Category name is required', 'warning')
    if (editingCategory) {
      setCategories(prev => prev.map(c =>
        c.id === editingCategory.id ? { ...c, label: catFormName.trim() } : c
      ))
      addToast('Category updated', 'success')
    } else {
      setCategories(prev => [...prev, { id: `cat-${Date.now()}`, label: catFormName.trim(), icon: File, color: BLUE }])
      addToast('Category added', 'success')
    }
    setShowCategoryModal(false)
  }

  const handleDeleteCategory = async (catId) => {
    const catLabel = getCategoryInfo(catId)?.label || 'this category'
    const docsInCategory = documents.filter(d => d.category === catId)
    let message = `Delete "${catLabel}" category?`
    if (docsInCategory.length > 0) {
      message = `"${catLabel}" has ${docsInCategory.length} document(s). They will be moved to the first available category. Delete anyway?`
    }
    const ok = await confirm(message, 'Delete Category?', { destructive: true, confirmText: 'Delete' })
    if (!ok) return
    if (docsInCategory.length > 0) {
      const remaining = categories.filter(c => c.id !== catId)
      const fallback = remaining.length > 0 ? remaining[0].id : 'other'
      setDocuments(prev => prev.map(d =>
        d.category === catId ? { ...d, category: fallback } : d
      ))
    }
    setCategories(prev => prev.filter(c => c.id !== catId))
    if (selectedCategory === catId) setSelectedCategory('all')
    addToast('Category deleted', 'info')
  }

  const getCategoryInfo = (catId) => categories.find(c => c.id === catId) || categories[categories.length - 1]

  const filteredDocs = documents.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === 'all' || d.category === selectedCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="fade-in px-1 sm:px-0 pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <FolderOpen size={20} className="text-primary" />
          Documents
        </h1>
        <Button variant="default" size="sm" onClick={() => { resetForm(); setShowUploadModal(true) }}>
          <Upload size={16} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
      </div>
      <div className="border-t border-border mb-6" />

      <div className="relative flex items-center mb-3">
        <Search size={16} className="absolute left-3 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          aria-label="Search documents"
          className="w-full pl-9"
        />
      </div>

      <div className="flex gap-2 mb-5">
        <Card className="flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 overflow-hidden flex items-center p-3 pl-1">
            {canScrollLeft && (
              <button onClick={() => scrollCategory(-1)}
                className="absolute left-1 z-[3] flex items-center justify-center rounded-full cursor-pointer bg-muted text-foreground border-none shadow-sm w-7 h-7">
                <ChevronLeft size={18} />
              </button>
            )}
            <div ref={categoryScrollRef} className="flex gap-1.5 flex-nowrap overflow-hidden scroll-smooth flex-1 px-1">
              <button onClick={() => setSelectedCategory('all')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full font-semibold text-[0.8rem] cursor-pointer border ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'}`}>
                All
              </button>
              {categories.map(cat => {
                const isActive = selectedCategory === cat.id
                return (
                  <div key={cat.id} className="relative flex items-center">
                    <button onClick={() => setSelectedCategory(cat.id)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 text-[0.8rem] font-semibold cursor-pointer rounded-full border transition-colors"
                      style={{
                        background: isActive ? cat.color : undefined,
                        color: isActive ? '#fff' : undefined,
                        borderColor: isActive ? cat.color : undefined,
                      }}>
                      {cat.label}
                    </button>
                  </div>
                )
              })}
            </div>
            {canScrollRight && (
              <button onClick={() => scrollCategory(1)}
                className="absolute right-1 z-[3] flex items-center justify-center rounded-full cursor-pointer bg-muted text-foreground border-none shadow-sm w-7 h-7">
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </Card>
        <Card className="shrink-0 flex items-center p-3 px-4">
          <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(null); setCatFormName(''); setShowCategoryModal(true) }}>
            <Settings size={14} /> Manage
          </Button>
        </Card>
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="text-center p-8 sm:p-10 lg:p-12">
          <FileText size={48} className="mb-4 opacity-50 text-muted-foreground mx-auto" />
          <h3 className="m-0 mb-2 text-muted-foreground">No documents found</h3>
          <p className="m-0 text-[0.9rem] text-muted-foreground/60">
            {search || selectedCategory !== 'all' ? 'Try a different search or filter' : 'Upload your first document to get started'}
          </p>
        </Card>
      ) : (
        <div role="list" className="flex flex-col gap-2">
          {filteredDocs.map(doc => {
            const catInfo = getCategoryInfo(doc.category)
            const Icon = getFileIcon(doc.fileType)
            const CatIcon = catInfo.icon
            return (
              <Card key={doc.id} role="listitem" className="cursor-default hover:border-primary transition-colors">
                <CardContent className={`p-3 sm:p-4 lg:p-5 flex ${isMobile ? 'flex-col items-stretch gap-3' : 'flex-row items-center gap-4'}`}>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center shrink-0 rounded-xl w-[38px] sm:w-11 h-[38px] sm:h-11" style={{ background: `${catInfo.color}15`, color: catInfo.color }}>
                      <Icon size={isMobile ? 18 : 20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[0.85rem] sm:text-[0.95rem] text-foreground">{doc.name}</span>
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${catInfo.color}20`, color: catInfo.color }}>
                          <CatIcon size={10} className="inline mr-0.5" />{catInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[0.75rem] sm:text-[0.8rem] text-muted-foreground/60">{doc.fileName}</span>
                        <span className="text-[0.7rem] sm:text-[0.75rem] text-muted-foreground/60">{formatFileSize(doc.fileSize)}</span>
                        <span className="text-[0.7rem] sm:text-[0.75rem] text-muted-foreground/60">Uploaded {formatDate(doc.uploadedAt)}</span>
                      </div>
                      {doc.description && (
                        <p className="text-[0.78rem] sm:text-[0.8rem] text-muted-foreground m-0 mt-1">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className={`flex gap-1 ${isMobile ? 'justify-end border-t border-border pt-2.5' : ''}`}>
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-primary">
                      <Download size={16} /> {isMobile ? 'Download' : ''}
                    </Button>
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-primary" onClick={() => { setEditingDoc(doc); setFormName(doc.name); setFormCategory(doc.category); setFormDescription(doc.description || ''); setFormFile(null); setShowUploadModal(true) }}>
                      <Upload size={16} /> {isMobile ? 'Edit' : ''}
                    </Button>
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                      <Trash2 size={16} /> {isMobile ? 'Delete' : ''}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload / Edit Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) { setShowUploadModal(false); resetForm() } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-xl w-10 h-10 bg-primary/10 text-primary">
                <Upload size={20} />
              </div>
              <div>
                <span>{editingDoc ? 'Edit Document' : 'Upload Document'}</span>
                <p className="text-[0.8rem] text-muted-foreground font-normal mt-0.5">
                  {editingDoc ? 'Update document details' : 'Add a new document to the repository'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.82rem] font-semibold text-muted-foreground">Document Name *</label>
              <Input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Employee Handbook 2026" aria-label="Document name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.82rem] font-semibold text-muted-foreground">Category</label>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map(cat => {
                  const isActive = formCategory === cat.id
                  const Icon = cat.icon
                  return (
                    <button key={cat.id} type="button" onClick={() => setFormCategory(cat.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold text-[0.8rem] cursor-pointer transition-colors"
                      style={{
                        border: isActive ? `2px solid ${cat.color}` : '1px solid hsl(var(--border))',
                        background: isActive ? `${cat.color}18` : undefined,
                        color: isActive ? cat.color : undefined,
                      }}>
                      <Icon size={14} /> {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {!editingDoc && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.82rem] font-semibold text-muted-foreground">File</label>
                <div onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl text-center cursor-pointer p-6 sm:p-8 border-2 border-dashed transition-all ${formFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-muted/30 hover:border-primary hover:bg-primary/5'}`}>
                  {formFile ? (
                    <>
                      <div className="w-10 h-10 rounded-xl inline-flex items-center justify-center mb-2.5 bg-emerald-500/10 text-emerald-500">
                        <FileText size={20} />
                      </div>
                      <p className="m-0 text-[0.9rem] font-semibold text-foreground">{formFile.name}</p>
                      <p className="m-0 mt-1 text-[0.78rem] text-muted-foreground">{formatFileSize(formFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload size={isMobile ? 22 : 28} className="mb-2.5 opacity-60 text-muted-foreground mx-auto" />
                      <p className="m-0 text-[0.9rem] text-muted-foreground"><span className="font-semibold text-primary">Click to browse</span> or drop a file</p>
                      <p className="m-0 mt-1.5 text-[0.75rem] text-muted-foreground/60">PDF, Images, Spreadsheets — up to 10MB</p>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files[0]; if (file) setFormFile(file) }} className="hidden" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.82rem] font-semibold text-muted-foreground">Description</label>
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="Brief description (optional)" aria-label="Document description"
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs sm:text-sm font-medium shadow-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
            </div>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => { setShowUploadModal(false); resetForm() }}>Cancel</Button>
              <Button type="submit" className="flex items-center gap-1.5">
                <Upload size={16} /> {editingDoc ? 'Update' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="relative">
            <DialogTitle>Manage Categories</DialogTitle>
            <button type="button" onClick={() => setShowCategoryModal(false)}
              className="absolute right-0 top-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer border-none">
              <X size={16} />
            </button>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            {/* Category list */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.82rem] font-semibold text-muted-foreground">Categories</label>
              <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
                {categories.filter(c => c.id !== 'other').map(cat => (
                  <div key={cat.id} className="flex items-center gap-2.5 p-2 px-3 rounded-lg bg-muted/30 border border-border">
                    <span className="flex-1 text-[0.9rem] font-medium text-foreground">{cat.label}</span>
                    <Button variant="ghost" size="icon-xs" aria-label="Edit category" onClick={() => { setEditingCategory(cat); setCatFormName(cat.label) }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon-xs" aria-label="Delete category" onClick={() => handleDeleteCategory(cat.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {categories.filter(c => c.id === 'other').map(cat => (
                  <div key={cat.id} className="flex items-center gap-2.5 p-2 px-3 rounded-lg opacity-60 bg-muted/30 border border-border">
                    <span className="flex-1 text-[0.9rem] font-medium text-foreground">{cat.label}</span>
                    <span className="text-[0.75rem] text-muted-foreground">Protected</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="m-0 mb-3 text-[0.95rem] font-semibold text-foreground">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  value={catFormName}
                  onChange={e => setCatFormName(e.target.value)}
                  aria-label="Category name"
                  placeholder={editingCategory ? 'Category name' : 'e.g. Payroll'}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                />
                <div className="flex gap-2 justify-end">
                  {editingCategory && (
                    <Button variant="secondary" size="sm" onClick={() => { setEditingCategory(null); setCatFormName('') }}>
                      Cancel
                    </Button>
                  )}
                  <Button variant="default" size="sm" className="flex items-center gap-1.5" onClick={handleSaveCategory}>
                    {editingCategory ? 'Save' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
      <AdSlot />
    </div>
  )
}
