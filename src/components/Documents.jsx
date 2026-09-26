import { useState, useRef, useEffect, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { uploadDocumentFile, deleteDocumentFile } from '../services/bridge.js'
import { Card, CardContent } from "@/components/ui/card"
import { useConfirm } from '../hooks/useConfirm'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import AdSlot from './AdSlot'
import { formatDate } from '../services/date.js'
import { DEMO_DOCUMENTS } from '../utils/demoData.js'

const BLUE = '#3b82f6'
const defaultCategories = [
  { id: 'hr-docs', label: 'HR Documents', icon: <Icon name="folder" className="inline mr-0.5" size={12}/>, color: BLUE },
  { id: 'policies', label: 'Policies', icon: <Icon name="description" className="inline mr-0.5" size={12}/>, color: BLUE },
  { id: 'forms', label: 'Forms', icon: <Icon name="description" className="inline mr-0.5" size={12}/>, color: BLUE },
  { id: 'training', label: 'Training', icon: <Icon name="folder_zip" className="inline mr-0.5" size={12}/>, color: BLUE },
  { id: 'other', label: 'Other', icon: <Icon name="description" className="inline mr-0.5" size={12}/>, color: BLUE },
]

// Default Company Storage Capacity: 500 MB (Enterprise-grade Cloud Limit per Workspace)
const DEFAULT_COMPANY_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_SINGLE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const getFileIcon = (type) => {
  if (!type) return 'description'
  const t = type.toLowerCase()
  if (t.includes('pdf')) return 'description'
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls') || t.includes('csv')) return 'table_chart'
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('webp') || t.includes('gif')) return 'image'
  if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('gz') || t.includes('7z')) return 'folder_zip'
  if (t.includes('word') || t.includes('document') || t.includes('doc') || t.includes('docx') || t.includes('text') || t.includes('txt')) return 'article'
  return 'description'
}

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getFileMeta = (type, name) => {
  const t = (type || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (t.includes('pdf') || n.endsWith('.pdf')) {
    return {
      label: 'PDF',
      tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      ribbonColor: 'bg-rose-500',
      icon: 'picture_as_pdf',
      accentColor: '#f43f5e'
    }
  }
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls') || t.includes('csv') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv')) {
    return {
      label: 'EXCEL',
      tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      ribbonColor: 'bg-emerald-500',
      icon: 'table_chart',
      accentColor: '#10b981'
    }
  }
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('webp') || n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.webp')) {
    return {
      label: 'IMAGE',
      tagColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      ribbonColor: 'bg-purple-500',
      icon: 'image',
      accentColor: '#a855f7',
      isImage: true
    }
  }
  if (t.includes('word') || t.includes('document') || t.includes('doc') || t.includes('docx') || n.endsWith('.doc') || n.endsWith('.docx') || n.endsWith('.txt')) {
    return {
      label: 'DOC',
      tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      ribbonColor: 'bg-blue-500',
      icon: 'article',
      accentColor: '#3b82f6'
    }
  }
  if (t.includes('zip') || t.includes('rar') || t.includes('tar') || n.endsWith('.zip') || n.endsWith('.rar')) {
    return {
      label: 'ZIP',
      tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      ribbonColor: 'bg-amber-500',
      icon: 'folder_zip',
      accentColor: '#f59e0b'
    }
  }
  return {
    label: 'FILE',
    tagColor: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
    ribbonColor: 'bg-neutral-500',
    icon: 'description',
    accentColor: '#737373'
  }
}

export default function Documents({ 
  documents = [], 
  setDocuments, 
  addLog, 
  addToast, 
  currentUser, 
  adminUid, 
  addNotification,
  settings,
  employees = []
}) {
  const [search, setSearch] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false)
  const [categories, setCategories] = useState(defaultCategories)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [catFormName, setCatFormName] = useState('')
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('hr-docs')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Official HR Letter Generator State
  const [showLetterModal, setShowLetterModal] = useState(false)
  const [letterEmpId, setLetterEmpId] = useState(employees[0]?.id || '')
  const [letterType, setLetterType] = useState('noc')
  const [letterNotes, setLetterNotes] = useState('')

  const handleOpenLetterModal = (type = 'noc', empId = null) => {
    setLetterType(type)
    if (empId) setLetterEmpId(empId)
    else if (!letterEmpId && employees.length > 0) setLetterEmpId(employees[0].id)
    setShowLetterModal(true)
  }

  const fileInputRef = useRef(null)
  const categoryScrollRef = useRef(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const generateOfficialHRLetter = async (e) => {
    e?.preventDefault()
    const emp = (employees || []).find(e => e.id === letterEmpId) || employees[0]
    if (!emp) {
      addToast('Please select an employee.', 'warning')
      return
    }

    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const companyName = settings?.company?.name || 'Kormiis Ltd.'
      const companyLogo = settings?.company?.logo
      const companyEmail = settings?.company?.email || 'hr@kormiis.io'
      const companyPhone = settings?.company?.phone || ''
      const companyWebsite = settings?.company?.website || 'kormiis.vercel.app'
      const currency = settings?.currency || '৳'
      const todayStr = formatDate(new Date().toISOString().split('T')[0])
      const refNo = `REF: ${companyName.substring(0, 3).toUpperCase()}/HR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

      let startY = 20

      // Letterhead
      const contactLine = [companyPhone, companyEmail, companyWebsite].filter(Boolean).join(' • ')

      if (companyLogo) {
        try {
          let format = 'PNG'
          if (companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')) format = 'JPEG'
          else if (companyLogo.startsWith('data:image/webp')) format = 'WEBP'
          doc.addImage(companyLogo, format, 20, 16, 20, 20)
          
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(20, 20, 20)
          doc.text(companyName.toUpperCase(), 46, 23)
          
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(contactLine, 46, 29)
          startY = 44
        } catch (err) {
          doc.setFontSize(18)
          doc.setFont('helvetica', 'bold')
          doc.text(companyName.toUpperCase(), 20, 24)
          startY = 34
        }
      } else {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(companyName.toUpperCase(), 20, 24)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(contactLine, 20, 30)
        startY = 40
      }

      // Separator Line
      doc.setDrawColor(30, 30, 30)
      doc.setLineWidth(0.8)
      doc.line(20, startY, 190, startY)
      startY += 10

      // Metadata
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(refNo, 20, startY)
      doc.text(`Date: ${todayStr}`, 190, startY, { align: 'right' })
      startY += 12

      // Title & Recipient
      let docTitle = 'EXPERIENCE CERTIFICATE'
      if (letterType === 'salary') docTitle = 'SALARY & EMPLOYMENT CERTIFICATE'
      else if (letterType === 'noc') docTitle = 'NO OBJECTION CERTIFICATE (NOC)'
      else if (letterType === 'verification') docTitle = 'EMPLOYMENT VERIFICATION LETTER'

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 20, 20)
      doc.text(docTitle, 105, startY, { align: 'center' })
      startY += 10

      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.text('TO WHOM IT MAY CONCERN', 20, startY)
      startY += 8

      // Body text based on type
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(40, 40, 40)

      let bodyParagraphs = []
      const empRole = emp.designation || emp.role || 'Team Member'
      const empDept = emp.department || 'General'
      const joinDate = emp.joiningDate ? formatDate(emp.joiningDate) : 'their official joining date'
      const salaryAmount = emp.salary ? `${currency} ${Number(emp.salary).toLocaleString()}` : `${currency} --`

      if (letterType === 'experience') {
        bodyParagraphs = [
          `This is to certify that ${emp.name} (Team Member ID: ${emp.id}) has been actively working with ${companyName} as a ${empRole} in the ${empDept} department since ${joinDate}.`,
          `During their tenure with us, we have found ${emp.name} to be hardworking, dedicated, and professional in performing their duties and responsibilities.`,
          letterNotes ? `Additional Remarks: ${letterNotes}` : 'We appreciate their valuable contributions to our organization and wish them all the best in their future endeavors.'
        ]
      } else if (letterType === 'salary') {
        bodyParagraphs = [
          `This is to certify that ${emp.name} (Team Member ID: ${emp.id}) is a full-time regular team member of ${companyName}, currently holding the position of ${empRole} in the ${empDept} department since ${joinDate}.`,
          `As per our company records, their current gross monthly compensation is ${salaryAmount}, disbursed on a monthly basis via direct company payroll.`,
          letterNotes ? `Purpose/Notes: ${letterNotes}` : 'This certificate is issued upon the team member\'s request for official verification purposes without any financial liability on part of the company.'
        ]
      } else if (letterType === 'noc') {
        bodyParagraphs = [
          `This is to confirm that ${emp.name} (Team Member ID: ${emp.id}) is working with ${companyName} as ${empRole} in the ${empDept} department since ${joinDate}.`,
          `${companyName} has no objection regarding ${emp.name}'s official applications or travel requirements as requested.`,
          letterNotes ? `Specified Purpose: ${letterNotes}` : 'The team member is expected to resume their normal duties upon conclusion of the specified period.'
        ]
      } else {
        bodyParagraphs = [
          `This letter serves to verify that ${emp.name} (Team Member ID: ${emp.id}) is currently with ${companyName} in good standing as a ${empRole} in the ${empDept} department since ${joinDate}.`,
          `Their team status is active and verified as per current HR records.`,
          letterNotes ? `Notes: ${letterNotes}` : 'Should you require any further information or confirmation, please feel free to reach out to our HR department.'
        ]
      }

      bodyParagraphs.forEach(p => {
        const lines = doc.splitTextToSize(p, 170)
        doc.text(lines, 20, startY)
        startY += (lines.length * 5.5) + 4
      })

      startY += 12
      doc.setFont('helvetica', 'normal')
      doc.text('Sincerely,', 20, startY)
      startY += 16

      doc.setFont('helvetica', 'bold')
      doc.text('HR Department / Authorized Signatory', 20, startY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`${companyName}`, 20, startY + 5)
      doc.text(`Official Contact: ${[companyPhone, companyEmail].filter(Boolean).join(' | ')}`, 20, startY + 10)

      // Official Footer
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.4)
      doc.line(20, 275, 190, 275)
      doc.setFontSize(8)
      doc.setTextColor(140, 140, 140)
      doc.text(`Official Document issued by ${companyName} • Confidential`, 105, 280, { align: 'center' })

      doc.save(`${companyName.replace(/\s+/g, '_')}_${docTitle.replace(/\s+/g, '_')}_${emp.name.replace(/\s+/g, '_')}.pdf`)
      addToast(`${docTitle} generated & downloaded successfully!`, 'success')
      if (addLog) addLog('HR Document Generated', `${docTitle} for ${emp.name}`)
      setShowLetterModal(false)
    } catch (err) {
      console.error(err)
      addToast('Failed to generate document: ' + err.message, 'danger')
    }
  }

  // Effective Documents (use DEMO_DOCUMENTS if documents list is empty)
  const effectiveDocuments = useMemo(() => {
    if (Array.isArray(documents) && documents.length > 0) return documents
    return DEMO_DOCUMENTS
  }, [documents])

  // Calculate Company Storage Usage
  const usedStorageBytes = useMemo(() => {
    return effectiveDocuments.reduce((acc, doc) => acc + (Number(doc.fileSize) || 0), 0)
  }, [effectiveDocuments])

  const usagePercentage = useMemo(() => {
    return Math.min(100, (usedStorageBytes / DEFAULT_COMPANY_STORAGE_LIMIT_BYTES) * 100)
  }, [usedStorageBytes])

  const remainingStorageBytes = useMemo(() => {
    return Math.max(0, DEFAULT_COMPANY_STORAGE_LIMIT_BYTES - usedStorageBytes)
  }, [usedStorageBytes])

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
    }
  }

  const scrollCategory = (dir) => {
    const el = categoryScrollRef.current
    if (el) el.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  useEffect(() => {
    checkCategoryScroll()
    const el = categoryScrollRef.current
    if (el) {
      el.addEventListener('scroll', checkCategoryScroll)
      return () => el.removeEventListener('scroll', checkCategoryScroll)
    }
  }, [categories])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
      setTimeout(checkCategoryScroll, 50)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormCategory('hr-docs')
    setFormDescription('')
    setFormFile(null)
    setEditingDoc(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenUploadModal = () => {
    resetForm()
    setShowUploadModal(true)
  }

  const handleOpenEditModal = (doc) => {
    setEditingDoc(doc)
    setFormName(doc.name || '')
    setFormCategory(doc.category || 'hr-docs')
    setFormDescription(doc.description || '')
    setFormFile(null)
    setShowUploadModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formName.trim() || !formCategory.trim()) {
      addToast('Please provide a document name and select a category.', 'warning')
      return
    }

    if (!editingDoc && !formFile) {
      addToast('Please select a file to upload.', 'warning')
      return
    }

    // Check Single File Size Limit
    if (formFile && formFile.size > MAX_SINGLE_FILE_SIZE_BYTES) {
      addToast(`File is too large (${formatFileSize(formFile.size)}). Max allowed per file is 25 MB.`, 'warning')
      return
    }

    // Check Company Storage Quota
    if (formFile && (usedStorageBytes + formFile.size > DEFAULT_COMPANY_STORAGE_LIMIT_BYTES)) {
      addToast(`Company storage capacity exceeded! Used: ${formatFileSize(usedStorageBytes)} / 500 MB. Please delete unused documents to free up space.`, 'danger')
      return
    }

    setIsUploading(true)
    try {
      if (editingDoc) {
        // Update Document Metadata in Real-Time
        setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { 
          ...d, 
          name: formName.trim(), 
          category: formCategory, 
          description: formDescription.trim(),
          updatedAt: new Date().toISOString()
        } : d))

        addToast('Document details updated successfully.', 'success')
        addLog('Document Updated', formName.trim())
        if (addNotification) {
          addNotification(`Company document updated: "${formName.trim()}"`, 'documents', { title: 'Document Updated', category: 'document' })
        }
      } else {
        // Upload New Document to Cloud Backend Storage
        const docId = `doc-${Date.now()}`
        const { downloadUrl, storagePath } = await uploadDocumentFile(adminUid, formFile, docId)

        const newDoc = {
          id: docId,
          name: formName.trim(),
          category: formCategory,
          description: formDescription.trim(),
          fileName: formFile.name,
          fileSize: formFile.size,
          fileType: formFile.type || 'application/octet-stream',
          uploadedBy: currentUser?.name || currentUser?.email || 'Teammate',
          uploadedById: currentUser?.id || currentUser?.uid || 'unknown',
          uploadedAt: new Date().toISOString(),
          downloadUrl,
          storagePath,
          status: 'synced'
        }

        setDocuments(prev => [newDoc, ...prev])
        addToast('Document uploaded to cloud server and synced across the company.', 'success')
        addLog('Document Uploaded', `${formName.trim()} (${formatFileSize(formFile.size)})`)
        if (addNotification) {
          addNotification(`New company document available: "${formName.trim()}"`, 'documents', { title: 'New Document', category: 'document' })
        }
      }

      setShowUploadModal(false)
      resetForm()
    } catch (err) {
      console.error('Document save error:', err)
      addToast('Failed to upload document: ' + (err.message || 'Server error'), 'danger')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = (doc) => {
    if (!doc.downloadUrl) {
      addToast('Document file is not accessible or currently processing.', 'warning')
      return
    }
    addToast(`Opening ${doc.fileName || doc.name}...`, 'info')
    window.open(doc.downloadUrl, '_blank')
    addLog('Document Downloaded', doc.name)
  }

  const handleDelete = async (id) => {
    const target = documents.find(d => d.id === id)
    const docName = target?.name || 'this document'
    
    const ok = await confirm(`Are you sure you want to permanently delete "${docName}"? This will free up ${formatFileSize(target?.fileSize || 0)} of company storage.`, 'Delete Document?', { destructive: true, confirmText: 'Delete' })
    if (!ok) return

    try {
      if (target?.storagePath) {
        deleteDocumentFile(target.storagePath).catch(err => console.warn('Storage file deletion note:', err))
      }
      setDocuments(prev => prev.filter(d => d.id !== id))
      addToast(`"${docName}" removed from company storage.`, 'info')
      addLog('Document Deleted', docName)
    } catch (err) {
      console.error('Delete error:', err)
      addToast('Failed to delete document', 'danger')
    }
  }

  const handleSaveCategory = () => {
    if (!catFormName.trim()) return addToast('Category name is required', 'warning')
    if (editingCategory) {
      setCategories(prev => prev.map(c =>
        c.id === editingCategory.id ? { ...c, label: catFormName.trim() } : c
      ))
      addToast('Category updated', 'success')
    } else {
      setCategories(prev => [...prev, { id: `cat-${Date.now()}`, label: catFormName.trim(), icon: <Icon name="description" className="inline mr-0.5" size={12}/>, color: BLUE }])
      addToast('Category added', 'success')
    }
    setShowCategoryModal(false)
    setCatFormName('')
    setEditingCategory(null)
  }

  const handleDeleteCategory = async (catId) => {
    const catLabel = getCategoryInfo(catId)?.label || 'this category'
    const docsInCategory = documents.filter(d => d.category === catId)
    let message = `Delete "${catLabel}" category?`
    if (docsInCategory.length > 0) {
      message = `"${catLabel}" has ${docsInCategory.length} document(s). They will be moved to the "Other" category. Delete anyway?`
    }
    const ok = await confirm(message, 'Delete Category?', { destructive: true, confirmText: 'Delete' })
    if (!ok) return

    if (docsInCategory.length > 0) {
      setDocuments(prev => prev.map(d =>
        d.category === catId ? { ...d, category: 'other' } : d
      ))
    }
    setCategories(prev => prev.filter(c => c.id !== catId))
    addToast('Category deleted', 'info')
  }

  const getCategoryInfo = (catId) => categories.find(c => c.id === catId) || categories[categories.length - 1]

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (effectiveDocuments || []).filter(d => {
      if (!q) return true
      const catLabel = getCategoryInfo(d.category)?.label?.toLowerCase() || ''
      const name = (d.name || '').toLowerCase()
      const desc = (d.description || '').toLowerCase()
      const fileName = (d.fileName || '').toLowerCase()
      const uploader = (d.uploadedBy || '').toLowerCase()
      const format = (d.fileType || '').toLowerCase()

      return (
        name.includes(q) ||
        desc.includes(q) ||
        fileName.includes(q) ||
        catLabel.includes(q) ||
        uploader.includes(q) ||
        format.includes(q)
      )
    })
  }, [effectiveDocuments, search, categories])

  return (
    <div className="fade-in px-1 sm:px-0 pb-12 space-y-6">
      
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-2.5">
        <Button 
          variant="default" 
          onClick={handleOpenUploadModal} 
          className="rounded-2xl h-11 px-5 font-bold shadow-sm"
        >
          <Icon name="upload" className="mr-2 h-4 w-4" size={16}/> Upload Document
        </Button>
      </div>

      {/* 1. Cloud Storage Capacity Tracker Card (Compact) */}
      <div className="rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 glass-kormiis glass-apple text-foreground border border-white/20 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Storage Meter Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="cloud_sync" size={20} className="text-primary"/>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Cloud Storage</span>
                <span className="text-xs text-muted-foreground font-medium">
                  ({formatFileSize(usedStorageBytes)} / 500 MB • {usagePercentage.toFixed(1)}%)
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-semibold px-2 py-0 h-4 rounded-full ml-auto sm:ml-0 ${
                    usagePercentage > 90 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                      : usagePercentage > 70 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span className={`size-1.5 rounded-full mr-1 inline-block ${
                    usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}/>
                  {usagePercentage > 90 ? 'Near Limit' : usagePercentage > 70 ? 'High' : 'Healthy'}
                </Badge>
              </div>

              {/* Storage Capacity Progress Bar */}
              <div className="mt-1.5 w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    usagePercentage > 90 
                      ? 'bg-rose-500' 
                      : usagePercentage > 70 
                      ? 'bg-amber-500' 
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.max(1, usagePercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium border-t sm:border-t-0 sm:border-l border-border/60 dark:border-white/10 pt-2 sm:pt-0 sm:pl-4 shrink-0">
            <div>
              <strong className="text-foreground font-semibold">{documents.length}</strong> Files
            </div>
            <div>
              <strong className="text-foreground font-semibold">{formatFileSize(remainingStorageBytes)}</strong> Free
            </div>
          </div>

        </div>
      </div>

      {/* 2. Main 2-Column Section: Col 1 = All Documents + Search; Col 2 = Insta Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: All Documents Widget — col-span-12 lg:col-span-7 xl:col-span-8 */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 rounded-2xl p-4 sm:p-5 glass-kormiis glass-apple text-foreground border border-white/20 dark:border-white/10 shadow-sm flex flex-col gap-4">
          
          {/* Widget Header & Search */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="folder_open" className="text-primary" size={18}/>
                <h3 className="font-bold text-sm text-foreground tracking-tight">
                  All Documents
                </h3>
                <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-semibold border-black/10 dark:border-white/10 text-muted-foreground">
                  {filteredDocs.length}
                </Badge>
              </div>
            </div>

            {/* Search Bar at the Top of Widget */}
            <div className="relative flex items-center w-full">
              <Icon name="search" className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none" size={18}/>
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents by name, category, or uploader..."
                aria-label="Search documents"
                className="w-full !pl-10.5 h-10 rounded-xl bg-white/60 dark:bg-white/5 border border-border/80 dark:border-white/12 text-xs"
              />
              {search && (
                <button 
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 text-muted-foreground hover:text-foreground p-1"
                >
                  <Icon name="close" size={14}/>
                </button>
              )}
            </div>
          </div>

          {/* Document Cards Grid */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border/80 dark:border-white/14">
              <Icon name="description" size={42} className="text-primary mx-auto mb-3 opacity-60"/>
              <h4 className="text-sm font-bold text-foreground">No documents found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {search
                  ? `No documents match "${search}". Try searching by another keyword.`
                  : 'Upload your company handbook, policies, forms, or training resources.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDocs.map(doc => {
                const catInfo = getCategoryInfo(doc.category)
                const meta = getFileMeta(doc.fileType, doc.fileName)
                const canManage = currentUser?.role === 'Admin' || currentUser?.isWorkspaceOwner || doc.uploadedById === (currentUser?.id || currentUser?.uid)
                const uploadTimeFormatted = doc.uploadedAt ? formatDate(doc.uploadedAt) : 'Recently'
                const uploaderName = doc.uploadedBy || 'Admin'

                return (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleDownload(doc)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDownload(doc) } }}
                    className="group relative rounded-xl p-3 bg-white dark:bg-[#1f1f23] border border-black/10 dark:border-white/10 hover:border-primary/50 transition-all duration-200 hover:-translate-y-0.5 shadow-2xs hover:shadow-md flex flex-col justify-between cursor-pointer select-none gap-2.5 overflow-hidden"
                  >
                    {/* Top Accent Stripe */}
                    <div className={`h-1 w-full rounded-full ${meta.ribbonColor} shrink-0`} />

                    {/* Main Content: Big Document Icon on Left + Details on Right */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Big Document Filled Icon Box */}
                      <div className={`size-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${meta.tagColor} relative overflow-hidden bg-primary/5`}>
                        <Icon name="description" fill={true} size={38} className="shrink-0 transition-transform duration-200 group-hover:scale-105"/>
                        <span className="text-[8px] font-black uppercase tracking-tight mt-0.5">
                          {meta.label}
                        </span>
                      </div>

                      {/* Document Meta & Details */}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate leading-snug" title={doc.name}>
                          {doc.name}
                        </h4>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center text-[10px] font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20">
                            {catInfo.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        </div>

                        {/* Uploader & Timestamp */}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium mt-1 truncate">
                          <Icon name="person" size={12} className="shrink-0 text-muted-foreground/80"/>
                          <span className="truncate max-w-[90px]" title={uploaderName}>{uploaderName}</span>
                          <span>•</span>
                          <Icon name="schedule" size={12} className="shrink-0 text-muted-foreground/80"/>
                          <span className="shrink-0">{uploadTimeFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(doc)
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-primary/5"
                        title={`Open / Download ${doc.name}`}
                      >
                        <Icon name="visibility" size={13}/>
                        <span>Open</span>
                      </button>

                      {canManage && (
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title={`Edit ${doc.name}`}
                            onClick={() => handleOpenEditModal(doc)}
                            className="liquid-icon-btn size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all"
                          >
                            <Icon name="edit" size={12}/>
                          </button>
                          <button
                            type="button"
                            title={`Delete ${doc.name}`}
                            onClick={() => handleDelete(doc.id)}
                            className="liquid-icon-btn size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all"
                          >
                            <Icon name="delete" size={12}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Column 2: Insta Documents — col-span-12 lg:col-span-5 xl:col-span-4 */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 rounded-2xl p-4 sm:p-5 glass-kormiis glass-apple text-foreground border border-white/20 dark:border-white/10 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Icon name="description" className="text-primary" size={18}/>
              <span>Generate Documents</span>
            </h2>
            <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5">
              4 Formats
            </Badge>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Card 1: NOC */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => handleOpenLetterModal('noc')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenLetterModal('noc') } }}
              className="group p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Icon name="flight_takeoff" size={18} className="text-amber-600 dark:text-amber-400"/>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    No Objection Certificate
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-medium">NOC Clearance</span>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-primary gap-1 shrink-0">
                <span className="text-[11px]">Create</span>
                <Icon name="arrow_forward" size={13} className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </div>

            {/* Card 2: Salary & Employment */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => handleOpenLetterModal('salary')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenLetterModal('salary') } }}
              className="group p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Icon name="payments" size={18} className="text-emerald-600 dark:text-emerald-400"/>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    Salary & Employment Certificate
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Income Verification</span>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-primary gap-1 shrink-0">
                <span className="text-[11px]">Create</span>
                <Icon name="arrow_forward" size={13} className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </div>

            {/* Card 3: Experience Certificate */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => handleOpenLetterModal('experience')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenLetterModal('experience') } }}
              className="group p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Icon name="workspace_premium" size={18} className="text-blue-600 dark:text-blue-400"/>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    Experience Certificate
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Tenure & Conduct</span>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-primary gap-1 shrink-0">
                <span className="text-[11px]">Create</span>
                <Icon name="arrow_forward" size={13} className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </div>

            {/* Card 4: Employment Verification */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => handleOpenLetterModal('verification')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenLetterModal('verification') } }}
              className="group p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Icon name="verified_user" size={18} className="text-purple-600 dark:text-purple-400"/>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    Employment Verification Letter
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-medium">Designation Proof</span>
                </div>
              </div>
              <div className="flex items-center text-xs font-semibold text-primary gap-1 shrink-0">
                <span className="text-[11px]">Create</span>
                <Icon name="arrow_forward" size={13} className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Upload / Edit Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) { setShowUploadModal(false); resetForm() } }}>
        <DialogContent className="sm:max-w-[540px] glass-kormiis">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
              <Icon name={editingDoc ? "edit" : "cloud_upload"} className="text-primary shrink-0" size={32}/>
              <span>{editingDoc ? 'Edit Document Details' : 'Upload to Cloud Storage'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-5 py-2">
            
            {/* Document Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Document Title <span className="text-destructive">*</span>
              </label>
              <Input 
                type="text" 
                required 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="e.g. Company HR Policy 2026" 
                className="h-11 rounded-xl"
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Category <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select value={formCategory} onChange={setFormCategory}>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="h-11 px-3.5 rounded-xl text-xs shrink-0"
                  onClick={() => { setEditingCategory(null); setCatFormName(''); setShowCategoryModal(true) }}
                >
                  <Icon name="add" className="mr-1" size={14}/> New Cat
                </Button>
              </div>
            </div>

            {/* File Dropzone (Only for New Uploads) */}
            {!editingDoc && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  File Attachment <span className="text-destructive">*</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl text-center cursor-pointer p-6 sm:p-8 border-2 transition-all duration-300 ease-out overflow-hidden group/drop ${
                    formFile 
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'border-dashed border-border/80 dark:border-white/20 bg-muted/20 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  {formFile ? (
                    <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-300">
                      <Icon name="check_circle" className="text-emerald-500 mb-2.5" size={44}/>
                      <p className="font-bold text-foreground text-sm break-words max-w-[280px]">{formFile.name}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full mt-1">
                        {formatFileSize(formFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="relative z-10 flex flex-col items-center">
                      <Icon name="cloud_upload" size={44} className="text-primary mb-3 group-hover/drop:scale-110 transition-transform"/>
                      <p className="text-sm text-foreground font-bold group-hover/drop:text-primary transition-colors">
                        Click to browse or drop file here
                      </p>
                      <p className="text-fluid-xs text-muted-foreground mt-1">
                        PDF, Word, Excel, Images, ZIP • Max 25 MB per file
                      </p>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => { 
                    const file = e.target.files?.[0]
                    if (file) setFormFile(file) 
                  }} 
                  className="hidden" 
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Description & Notes
              </label>
              <textarea 
                value={formDescription} 
                onChange={e => setFormDescription(e.target.value)} 
                rows={3} 
                placeholder="Brief summary or instructions for teammates (optional)..." 
                className="flex w-full rounded-xl bg-white/60 dark:bg-white/5 border border-border/80 dark:border-white/12 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus:border-primary transition-all resize-y" 
              />
            </div>

            <DialogFooter className="gap-2 mt-2">
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => { setShowUploadModal(false); resetForm() }} 
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isUploading}
                className="min-w-[140px]"
              >
                {isUploading ? (
                  <>
                    <span className="liquid-spinner size-4 mr-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <Icon name={editingDoc ? "check" : "upload"} className="mr-2" size={16}/> 
                    {editingDoc ? 'Save Changes' : 'Upload File'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-[480px] glass-kormiis">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="category" className="text-primary" size={20}/>
              Manage Categories
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            {/* Category list */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Active Categories</label>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {categories.filter(c => c.id !== 'other').map(cat => (
                  <div key={cat.id} className="flex items-center justify-between gap-2.5 p-2.5 px-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-sm font-semibold text-foreground break-words ">{cat.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon-xs" 
                        aria-label="Edit category" 
                        onClick={() => { setEditingCategory(cat); setCatFormName(cat.label) }}
                      >
                        <Icon name="edit" size={14}/>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-xs" 
                        aria-label="Delete category" 
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Icon name="delete" size={14}/>
                      </Button>
                    </div>
                  </div>
                ))}
                {categories.filter(c => c.id === 'other').map(cat => (
                  <div key={cat.id} className="flex items-center justify-between gap-2.5 p-2.5 px-3.5 rounded-xl opacity-60 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                    <span className="text-[11px] text-muted-foreground font-semibold">Default Protected</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/80 dark:border-white/12 pt-4">
              <h4 className="text-sm font-bold text-foreground mb-2.5">
                {editingCategory ? 'Edit Category Title' : 'Create New Category'}
              </h4>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={catFormName}
                  onChange={e => setCatFormName(e.target.value)}
                  placeholder={editingCategory ? 'Category title' : 'e.g. Legal & Contracts'}
                  className="h-10 rounded-xl flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                />
                {editingCategory && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(null); setCatFormName('') }}>
                    Cancel
                  </Button>
                )}
                <Button variant="default" size="sm" onClick={handleSaveCategory}>
                  {editingCategory ? 'Save' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official HR Letter & Certificate Generator Modal */}
      <Dialog open={showLetterModal} onOpenChange={setShowLetterModal}>
        <DialogContent className="sm:max-w-[540px] glass-kormiis">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <Icon name="assignment" className="text-primary shrink-0" size={28}/>
              <span>Generate Official HR Document</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={generateOfficialHRLetter} className="flex flex-col gap-4 py-2">
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-border/60 dark:border-white/10 flex items-center gap-3">
              {settings?.company?.logo ? (
                <img src={settings.company.logo} alt="Company Logo" className="size-10 object-contain rounded-xl p-1 bg-white/10 border border-border/40 shrink-0" />
              ) : (
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {settings?.company?.name ? settings.company.name.substring(0, 2).toUpperCase() : 'CO'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-foreground break-words ">{settings?.company?.name || 'Kormiis Ltd.'}</p>
                <p className="text-[11px] text-muted-foreground break-words ">{settings?.company?.email || 'hr@company.com'} • Letterhead Brand Active</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Select Team Member</label>
              <Select value={letterEmpId} onChange={setLetterEmpId}>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} — {emp.designation || emp.role || 'Teammate'} ({emp.department || 'General'})
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Document Type</label>
              <Select value={letterType} onChange={setLetterType}>
                <SelectItem value="experience">Experience Certificate</SelectItem>
                <SelectItem value="salary">Salary & Employment Certificate</SelectItem>
                <SelectItem value="noc">No Objection Certificate (NOC)</SelectItem>
                <SelectItem value="verification">Employment Verification Letter</SelectItem>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Special Purpose / Custom Remarks (Optional)</label>
              <Input
                type="text"
                value={letterNotes}
                onChange={e => setLetterNotes(e.target.value)}
                placeholder="e.g. For Embassy Visa Application / Bank Loan"
                className="h-11 rounded-2xl"
              />
            </div>

            <DialogFooter className="mt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setShowLetterModal(false)} className="rounded-2xl h-11 px-5">
                Cancel
              </Button>
              <Button type="submit" className="rounded-2xl h-11 px-6 font-bold shadow-sm">
                <Icon name="download" className="mr-2" size={16}/>
                Generate & Download PDF
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
      <AdSlot />
    </div>
  )
}
