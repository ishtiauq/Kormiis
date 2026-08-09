import { useState, useRef, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { subscribeToTable, writeToTable } from '../services/bridge.js'
import { isDriveConfigured, getDriveToken, hasDriveToken, findOrCreateCompanyFolder, uploadToDriveFolder, deleteDriveFile } from '../services/drive.js'
import { Card, CardContent } from "@/components/ui/card"
import { useConfirm } from '../hooks/useConfirm'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import AdSlot from './AdSlot'
import { formatDate } from '../services/date.js'

const BLUE = '#3b82f6'
const defaultCategories = [
  { id: 'hr-docs', label: 'HR Documents', icon: <Icon name="folder" size={10} className="inline mr-0.5" />, color: BLUE },
  { id: 'policies', label: 'Policies', icon: <Icon name="description" size={10} className="inline mr-0.5" />, color: BLUE },
  { id: 'forms', label: 'Forms', icon: <Icon name="description" size={10} className="inline mr-0.5" />, color: BLUE },
  { id: 'training', label: 'Training', icon: <Icon name="folder_zip" size={10} className="inline mr-0.5" />, color: BLUE },
  { id: 'other', label: 'Other', icon: <Icon name="description" size={10} className="inline mr-0.5" />, color: BLUE },
]

const getFileIcon = (type) => {
  if (!type) return 'description'
  const t = type.toLowerCase()
  if (t.includes('pdf')) return 'description'
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls') || t.includes('csv')) return 'table_chart'
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('gif')) return 'image'
  if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('gz')) return 'folder_zip'
  return 'description'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Documents({ documents, setDocuments, addLog, addToast, currentUser, adminUid, addNotification }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filterFormat, setFilterFormat] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [categories, setCategories] = useState(defaultCategories)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [catFormName, setCatFormName] = useState('')

  // Google Drive storage config (shared folder, saved in Firestore by the admin)
  const [driveConfig, setDriveConfig] = useState(null)
  const [isConnectingDrive, setIsConnectingDrive] = useState(false)
  const [driveConnected, setDriveConnected] = useState(() => hasDriveToken())

  useEffect(() => {
    if (!adminUid) return
    return subscribeToTable(adminUid, 'drive', (data) => {
      setDriveConfig(data || null)
    })
  }, [adminUid])

  const handleConnectDrive = async () => {
    if (!isDriveConfigured()) {
      addToast('Google Drive is not configured yet. The admin needs to add the Google Client ID.', 'warning')
      return
    }
    setIsConnectingDrive(true)
    try {
      await getDriveToken({ forcePrompt: true })
      setDriveConnected(true)
      const isOwner = currentUser?.role === 'Admin' || currentUser?.isWorkspaceOwner
      if (isOwner) {
        const { folderId, shareLink } = await findOrCreateCompanyFolder(adminUid, currentUser?.companyName || 'Company')
        await writeToTable(adminUid, 'drive', {
          folderId,
          shareLink,
          connectedEmail: currentUser?.email || '',
          connectedAt: new Date().toISOString(),
        })
        setDriveConfig({ folderId, shareLink })
        addToast('Google Drive connected. Shared folder created for the team.', 'success')
      } else {
        addToast('Google Drive connected. You can now upload documents to the shared folder.', 'success')
      }
    } catch (err) {
      addToast(err.message || 'Could not connect Google Drive', 'error')
    } finally {
      setIsConnectingDrive(false)
    }
  }

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

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formName.trim() || !formCategory.trim()) return

    if (!editingDoc && !formFile) {
      addToast('Please select a file to upload', 'error')
      return
    }

    setIsUploading(true)
    try {
      if (editingDoc) {
        setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { ...d, name: formName, category: formCategory, description: formDescription } : d))
        addToast('Document metadata updated', 'success')
        addLog('Document Updated', formName)
        if (addNotification) addNotification(`Company document updated: "${formName}"`)
      } else {
        const id = `doc-${Date.now()}`;
        const fileName = formFile?.name || `${formName.replace(/\s+/g, '_')}.pdf`;
        let downloadUrl = null;
        let driveFileId = null;
        
        if (adminUid && formFile) {
          if (!driveConfig?.folderId) {
            throw new Error('Google Drive is not connected yet. Ask the admin to connect it first.');
          }
          const info = await uploadToDriveFolder(driveConfig.folderId, formFile);
          downloadUrl = info.downloadUrl;
          driveFileId = info.id;
        }

        const newDoc = {
          id,
          name: formName,
          category: formCategory,
          description: formDescription,
          fileName,
          fileSize: formFile?.size || 0,
          fileType: formFile?.type || 'application/pdf',
          uploadedBy: currentUser?.id || 'unknown',
          uploadedAt: new Date().toISOString(),
          downloadUrl,
          driveFileId,
          status: 'synced',
        }
        setDocuments(prev => [newDoc, ...prev])
        addToast('Document uploaded and stored securely.', 'success')
        addLog('Document Uploaded', formName)
        if (addNotification) addNotification(`New company document available: "${formName}"`)
      }

      setShowUploadModal(false)
      resetForm()
    } catch (err) {
      console.error('Upload error:', err)
      addToast('Failed to upload document', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = (doc) => {
    if (doc.downloadUrl) {
      addToast(`Opening ${doc.fileName}...`, 'info')
      window.open(doc.downloadUrl, '_blank')
      addLog('Document Downloaded', doc.name)
    } else {
      addToast('Document file is still syncing or unavailable', 'warning')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('This document will be permanently removed.', 'Delete Document?', { destructive: true })
    if (!ok) return
    const target = documents.find(d => d.id === id)
    if (target?.driveFileId) {
      deleteDriveFile(target.driveFileId).catch(e => console.error('Drive delete failed:', e))
    }
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
      setCategories(prev => [...prev, { id: `cat-${Date.now()}`, label: catFormName.trim(), icon: <Icon name="description" size={10} className="inline mr-0.5" />, color: BLUE }])
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
    
    let matchFormat = true
    if (filterFormat !== 'all') {
      const type = (d.fileType || '').toLowerCase()
      if (filterFormat === 'pdf') matchFormat = type.includes('pdf')
      if (filterFormat === 'excel') matchFormat = type.includes('sheet') || type.includes('excel') || type.includes('csv')
      if (filterFormat === 'image') matchFormat = type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')
      if (filterFormat === 'archive') matchFormat = type.includes('zip') || type.includes('rar') || type.includes('tar')
    }

    let matchDate = true
    if (filterDate !== 'all') {
      const docDate = new Date(d.uploadedAt)
      const now = new Date()
      const diffDays = (now - docDate) / (1000 * 60 * 60 * 24)
      if (filterDate === '7days') matchDate = diffDays <= 7
      if (filterDate === '30days') matchDate = diffDays <= 30
      if (filterDate === '90days') matchDate = diffDays <= 90
    }

    return matchSearch && matchCategory && matchFormat && matchDate
  })

  return (
    <div className="fade-in px-1 sm:px-0 pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="folder_open" size={20} className="text-foreground" />
          Documents
        </h1>
      </div>
      <div className="border-t border-border border-headline mb-6" />

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 flex items-center">
          <Icon name="search" size={16} className="absolute left-3 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            aria-label="Search documents"
            className="w-full pl-9 bg-muted/40"
          />
        </div>
        
        <Button variant={showFilters ? "secondary" : "outline"} className="shrink-0 gap-2" onClick={() => setShowFilters(!showFilters)}>
          <Icon name="filter_list" size={16} />
          <span className="hidden sm:inline">Filter</span>
        </Button>

        {!isMobile && (
          <Button variant="default" className="shrink-0" onClick={() => { resetForm(); setShowUploadModal(true) }}>
            <Icon name="upload" size={16} className="mr-2" />
            Upload
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="mb-6 p-4 bg-muted/20 border-border/50 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground ml-1">Category</span>
              <Select value={selectedCategory} onChange={setSelectedCategory}>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground ml-1">File Format</span>
              <Select value={filterFormat} onChange={setFilterFormat}>
                <SelectItem value="all">Any Format</SelectItem>
                <SelectItem value="pdf">PDF Documents</SelectItem>
                <SelectItem value="excel">Spreadsheets</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="archive">Archives (ZIP)</SelectItem>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground ml-1">Upload Date</span>
              <Select value={filterDate} onChange={setFilterDate}>
                <SelectItem value="all">Any Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 3 Months</SelectItem>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {!driveConfig?.folderId && (
        <Card className="mb-6 p-4 sm:p-5 bg-muted/20 border-border/50 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="cloud" size={16} className="text-primary" />
                Google Drive Storage
              </div>
              <p className="text-fluid-xs text-muted-foreground mt-0.5">
                {currentUser?.role === 'Admin' || currentUser?.isWorkspaceOwner
                  ? 'Connect your Google Drive to create a shared folder for all company documents.'
                  : 'Ask your HR admin to connect Google Drive to enable document uploads.'}
              </p>
            </div>
            {(currentUser?.role === 'Admin' || currentUser?.isWorkspaceOwner) && (
              <Button variant="default" className="shrink-0 gap-2" onClick={handleConnectDrive} disabled={isConnectingDrive}>
                <Icon name="cloud_upload" size={16} />
                {isConnectingDrive ? 'Connecting...' : 'Connect Google Drive'}
              </Button>
            )}
          </div>
        </Card>
      )}

      {driveConfig?.folderId && !(driveConnected || hasDriveToken()) && (
        <div className="mb-6 p-3.5 rounded-xl bg-muted/30 border border-border flex items-center gap-3">
          <Icon name="cloud" size={16} className="text-primary shrink-0" />
          <p className="text-fluid-xs text-muted-foreground flex-1">Connect your Google Drive to upload documents. Downloads work without it.</p>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={handleConnectDrive} disabled={isConnectingDrive}>
            {isConnectingDrive ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
      )}

      {filteredDocs.length === 0 ? (
        <Card className="text-center p-8 sm:p-10 lg:p-12">
          <Icon name="description" size={48} className="mb-4 opacity-50 text-muted-foreground mx-auto" />
          <h3 className="m-0 mb-2 text-muted-foreground">No documents found</h3>
          <p className="m-0 text-[0.9rem] text-muted-foreground/60">
            {search || selectedCategory !== 'all' ? 'Try a different search or filter' : 'Upload your first document to get started'}
          </p>
        </Card>
      ) : (
        <div role="list" className="flex flex-col gap-2">
          {filteredDocs.map(doc => {
            const catInfo = getCategoryInfo(doc.category)
            const fileIcon = getFileIcon(doc.fileType)
            return (
              <Card key={doc.id} role="listitem" className="cursor-default hover:border-primary transition-colors">
                <CardContent className={`p-3 sm:p-4 lg:p-5 flex ${isMobile ? 'flex-col items-stretch gap-3' : 'flex-row items-center gap-4'}`}>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center shrink-0 rounded-xl w-[38px] sm:w-11 h-[38px] sm:h-11 bg-muted/50 text-muted-foreground">
                      <Icon name={fileIcon} size={isMobile ? 18 : 20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[0.85rem] sm:text-[0.95rem] text-foreground">{doc.name}</span>
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full font-semibold border border-border text-muted-foreground bg-muted/20">
                          {catInfo.icon}{catInfo.label}
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
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-primary" onClick={() => handleDownload(doc)}>
                      <Icon name="download" size={16} /> {isMobile ? 'Download' : ''}
                    </Button>
                    {(currentUser?.role === 'Admin' || doc.uploadedBy === currentUser?.id) && (
                      <>
                        <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-primary" onClick={() => { setEditingDoc(doc); setFormName(doc.name); setFormCategory(doc.category); setFormDescription(doc.description || ''); setFormFile(null); setShowUploadModal(true) }}>
                          <Icon name="edit" size={16} /> {isMobile ? 'Edit' : ''}
                        </Button>
                        <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                          <Icon name="delete" size={16} /> {isMobile ? 'Delete' : ''}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload / Edit Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) { setShowUploadModal(false); resetForm() } }}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-4 text-xl sm:text-2xl font-bold">
                <div className="flex items-center justify-center rounded-2xl w-12 h-12 bg-primary/10 text-primary shadow-inner">
                  <Icon name="upload" size={24} className="animate-pulse" />
                </div>
                <span>{editingDoc ? 'Edit Document' : 'Upload Document'}</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-focus-within:text-primary transition-colors">Document Name *</label>
                <Input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Employee Handbook 2026" aria-label="Document name" 
                  className="rounded-xl bg-muted/40 border-border/50 focus-visible:ring-0 focus-visible:outline-none transition-all h-11" />
              </div>

              <div className="space-y-1.5 group shrink-0">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-focus-within:text-primary transition-colors">Category</label>
                <div className="flex bg-muted/40 rounded-xl p-1 border border-border/50 focus-within:ring-0 focus-within:outline-none transition-all">
                  <div className="flex-1">
                    <Select value={formCategory} onChange={setFormCategory}>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <button type="button" className="shrink-0 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-none group/add h-10 px-4 rounded-lg flex items-center transition-all duration-300 ease-out overflow-hidden" onClick={() => { setEditingCategory(null); setCatFormName(''); setShowCategoryModal(true) }}>
                    <Icon name="add" size={18} className="transition-transform duration-300 group-hover/add:rotate-90 group-hover/add:scale-110" />
                    <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-300 ease-out group-hover/add:w-auto group-hover/add:opacity-100 group-hover/add:ml-2">Add</span>
                  </button>
                </div>
              </div>

              {!editingDoc && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">File</label>
                  <div onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-2xl text-center cursor-pointer p-8 sm:p-10 border-2 transition-all duration-300 ease-out overflow-hidden group/drop ${formFile ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-dashed border-border/60 bg-muted/20 hover:border-primary hover:bg-primary/5'}`}>
                    
                    {!formFile && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/drop:opacity-100 transition-opacity duration-500" />}

                    {formFile ? (
                      <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <div className="w-14 h-14 rounded-2xl inline-flex items-center justify-center mb-3 bg-emerald-500/15 text-emerald-500 shadow-sm ring-4 ring-emerald-500/10">
                          <Icon name="description" size={28} />
                        </div>
                        <p className="m-0 text-[1rem] font-bold text-foreground mb-1 truncate max-w-[250px]">{formFile.name}</p>
                        <p className="m-0 text-[0.8rem] text-emerald-600/80 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{formatFileSize(formFile.size)}</p>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl inline-flex items-center justify-center mb-4 bg-primary/10 text-primary shadow-sm group-hover/drop:scale-110 group-hover/drop:rotate-3 transition-transform duration-300">
                          <Icon name="upload" size={28} />
                        </div>
                        <p className="m-0 text-fluid text-foreground font-semibold mb-1 group-hover/drop:text-primary transition-colors">Click to browse or drop a file</p>
                        <p className="m-0 text-fluid-xs text-muted-foreground font-medium">PDF, Images, Spreadsheets (Up to 10MB)</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files[0]; if (file) setFormFile(file) }} className="hidden" />
                </div>
              )}

              <div className="space-y-1.5 group shrink-0">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-focus-within:text-primary transition-colors">Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="Brief description (optional)" aria-label="Document description"
                  className="flex w-full rounded-xl bg-muted/40 border border-border/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 transition-all resize-y" />
              </div>

              <DialogFooter>
                <Button variant="ghost" type="button" onClick={() => { setShowUploadModal(false); resetForm() }}>Cancel</Button>
                <Button type="submit">
                  <Icon name="upload" size={18} className="mr-2" /> 
                  {editingDoc ? 'Update Document' : 'Upload Document'}
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
              <Icon name="close" size={16} />
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
                      <Icon name="edit" size={14} />
                    </Button>
                    <Button variant="ghost" size="icon-xs" aria-label="Delete category" onClick={() => handleDeleteCategory(cat.id)}>
                      <Icon name="delete" size={14} />
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
      {isMobile && (
        <Button
          className="fixed bottom-[76px] right-8 h-14 w-14 rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] z-50 p-0 hover:scale-105 active:scale-95 transition-transform"
          onClick={() => { resetForm(); setShowUploadModal(true) }}
        >
          <Icon name="upload" size={24} />
        </Button>
      )}
      <ConfirmDialog />
      <AdSlot />
    </div>
  )
}
