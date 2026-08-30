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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filterFormat, setFilterFormat] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1024 : false)
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
      doc.setDrawColor(254, 53, 1)
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
          `This is to certify that ${emp.name} (Employee ID: ${emp.id}) has been actively employed with ${companyName} as a ${empRole} in the ${empDept} department since ${joinDate}.`,
          `During their tenure with us, we have found ${emp.name} to be hardworking, dedicated, and professional in performing their duties and responsibilities.`,
          letterNotes ? `Additional Remarks: ${letterNotes}` : 'We appreciate their valuable contributions to our organization and wish them all the best in their future endeavors.'
        ]
      } else if (letterType === 'salary') {
        bodyParagraphs = [
          `This is to certify that ${emp.name} (Employee ID: ${emp.id}) is a full-time regular employee of ${companyName}, currently holding the position of ${empRole} in the ${empDept} department since ${joinDate}.`,
          `As per our company records, their current gross monthly compensation is ${salaryAmount}, disbursed on a monthly basis via direct company payroll.`,
          letterNotes ? `Purpose/Notes: ${letterNotes}` : 'This certificate is issued upon the employee\'s request for official verification purposes without any financial liability on part of the company.'
        ]
      } else if (letterType === 'noc') {
        bodyParagraphs = [
          `This is to confirm that ${emp.name} (Employee ID: ${emp.id}) is employed with ${companyName} as ${empRole} in the ${empDept} department since ${joinDate}.`,
          `${companyName} has no objection regarding ${emp.name}'s official applications or travel requirements as requested.`,
          letterNotes ? `Specified Purpose: ${letterNotes}` : 'The employee is expected to resume their normal employment duties upon conclusion of the specified period.'
        ]
      } else {
        bodyParagraphs = [
          `This letter serves to verify that ${emp.name} (Employee ID: ${emp.id}) is currently employed with ${companyName} in good standing as a ${empRole} in the ${empDept} department since ${joinDate}.`,
          `Their employment status is active and verified as per current HR records.`,
          letterNotes ? `Notes: ${letterNotes}` : 'Should you require any further information or employment confirmation, please feel free to reach out to our HR department.'
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

  // Calculate Company Storage Usage
  const usedStorageBytes = useMemo(() => {
    return (documents || []).reduce((acc, doc) => acc + (Number(doc.fileSize) || 0), 0)
  }, [documents])

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
      setIsMobile(window.innerWidth <= 1024)
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
    if (selectedCategory === catId) setSelectedCategory('all')
    addToast('Category deleted', 'info')
  }

  const getCategoryInfo = (catId) => categories.find(c => c.id === catId) || categories[categories.length - 1]

  const filteredDocs = useMemo(() => {
    return (documents || []).filter(d => {
      const matchSearch = !search || 
        d.name?.toLowerCase().includes(search.toLowerCase()) || 
        (d.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.fileName || '').toLowerCase().includes(search.toLowerCase())
      
      const matchCategory = selectedCategory === 'all' || d.category === selectedCategory
      
      let matchFormat = true
      if (filterFormat !== 'all') {
        const type = (d.fileType || '').toLowerCase()
        const ext = (d.fileName || '').toLowerCase()
        if (filterFormat === 'pdf') matchFormat = type.includes('pdf') || ext.endsWith('.pdf')
        if (filterFormat === 'excel') matchFormat = type.includes('sheet') || type.includes('excel') || type.includes('csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')
        if (filterFormat === 'image') matchFormat = type.includes('image') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp')
        if (filterFormat === 'archive') matchFormat = type.includes('zip') || type.includes('rar') || type.includes('tar') || ext.endsWith('.zip') || ext.endsWith('.rar')
      }

      let matchDate = true
      if (filterDate !== 'all' && d.uploadedAt) {
        const docDate = new Date(d.uploadedAt)
        const now = new Date()
        const diffDays = (now - docDate) / (1000 * 60 * 60 * 24)
        if (filterDate === '7days') matchDate = diffDays <= 7
        if (filterDate === '30days') matchDate = diffDays <= 30
        if (filterDate === '90days') matchDate = diffDays <= 90
      }

      return matchSearch && matchCategory && matchFormat && matchDate
    })
  }, [documents, search, selectedCategory, filterFormat, filterDate])

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

      {/* Official HR Document & Certificate Studio (Quick Action Cards) */}
      <div className="rounded-[28px] p-5 sm:p-6 glass-kormiis glass-apple text-foreground border border-white/30 dark:border-white/14 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-fluid font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Icon name="description" className="text-primary" size={20}/>
              <span>Official Document & Certificate Studio</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instantly generate, brand, and download official company PDF letters with company letterhead & QR-ready reference.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: NOC */}
          <div 
            onClick={() => handleOpenLetterModal('noc')}
            className="group relative p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Icon name="flight_takeoff" size={32} className="text-foreground shrink-0"/>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-500/30 bg-amber-500/5">
                NOC
              </Badge>
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                No Objection Certificate
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 ">
                For foreign visa applications, passport renewal, and official travel clearances.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1 border-t border-border/40">
              <span>Generate PDF</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform"/>
            </div>
          </div>

          {/* Card 2: Salary & Employment */}
          <div 
            onClick={() => handleOpenLetterModal('salary')}
            className="group relative p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Icon name="payments" size={32} className="text-foreground shrink-0"/>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                Salary
              </Badge>
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Salary & Employment Certificate
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 ">
                For bank loans, credit cards, rent agreements, and income verification.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1 border-t border-border/40">
              <span>Generate PDF</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform"/>
            </div>
          </div>

          {/* Card 3: Experience */}
          <div 
            onClick={() => handleOpenLetterModal('experience')}
            className="group relative p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Icon name="workspace_premium" size={32} className="text-foreground shrink-0"/>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-500/30 bg-blue-500/5">
                Experience
              </Badge>
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Experience Certificate
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 ">
                Official proof of tenure, job performance, and professional conduct.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1 border-t border-border/40">
              <span>Generate PDF</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform"/>
            </div>
          </div>

          {/* Card 4: Verification */}
          <div 
            onClick={() => handleOpenLetterModal('verification')}
            className="group relative p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12] border border-border/70 dark:border-white/10 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Icon name="verified_user" size={32} className="text-foreground shrink-0"/>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-purple-600 border-purple-500/30 bg-purple-500/5">
                Verification
              </Badge>
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Employment Verification Letter
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 ">
                Standard proof of active employment and job designation in the organization.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1 border-t border-border/40">
              <span>Generate PDF</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform"/>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Company Cloud Storage Capacity & Health Tracker Card */}
      <div className="rounded-[28px] p-5 sm:p-6 glass-kormiis glass-apple text-foreground border border-white/30 dark:border-white/14 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Storage Meter Info */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <Icon name="cloud_sync" size={32} className="text-primary shrink-0 animate-pulse"/>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-fluid text-foreground">{settings?.company?.name ? `${settings.company.name} Cloud Storage` : 'Company Cloud Storage'}</span>
                <Badge 
                  variant="outline" 
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    usagePercentage > 90 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                      : usagePercentage > 70 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span className={`size-1.5 rounded-full mr-1.5 inline-block ${
                    usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}/>
                  {usagePercentage > 90 ? 'Critical (Near Limit)' : usagePercentage > 70 ? 'High Usage' : 'Healthy Quota'}
                </Badge>
              </div>

              {/* Storage Capacity Progress Bar */}
              <div className="mt-2.5 w-full">
                <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      usagePercentage > 90 
                        ? 'bg-rose-500' 
                        : usagePercentage > 70 
                        ? 'bg-amber-500' 
                        : 'bg-gradient-to-r from-primary to-emerald-500'
                    }`}
                    style={{ width: `${Math.max(1, usagePercentage)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-fluid-xs text-muted-foreground font-medium">
                <span>
                  <strong className="text-foreground">{formatFileSize(usedStorageBytes)}</strong> used of <strong className="text-foreground">500 MB</strong> allocated ({usagePercentage.toFixed(1)}%)
                </span>
                <span>
                  <strong className="text-foreground">{formatFileSize(remainingStorageBytes)}</strong> free space remaining
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="flex items-center gap-3 self-stretch lg:self-auto border-t lg:border-t-0 lg:border-l border-border/80 dark:border-white/12 pt-3 lg:pt-0 lg:pl-6">
            <div className="text-center px-3 py-1 flex-1 sm:flex-none">
              <span className="block text-fluid-lg font-bold text-foreground">{documents.length}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Total Files</span>
            </div>
            <div className="text-center px-3 py-1 flex-1 sm:flex-none">
              <span className="block text-fluid-lg font-bold text-foreground">
                {documents.length > 0 ? formatFileSize(usedStorageBytes / documents.length) : '0 B'}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">Avg File Size</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Controls: Search, Category Bar & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1 flex items-center">
            <Icon name="search" className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none" size={18}/>
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents by title, filename, or description..."
              aria-label="Search documents"
              className="w-full !pl-10.5 h-11 rounded-2xl bg-white/60 dark:bg-white/5 border border-border/80 dark:border-white/12"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 text-muted-foreground hover:text-foreground p-1"
              >
                <Icon name="close" size={14}/>
              </button>
            )}
          </div>
          
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            className="shrink-0 gap-2 h-11 px-4 rounded-2xl border-border/80 dark:border-white/12" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icon name="filter_list" size={16}/>
            <span className="hidden sm:inline">Filters</span>
          </Button>

          <Button 
            variant="outline" 
            className="shrink-0 gap-2 h-11 px-4 rounded-2xl border-border/80 dark:border-white/12 text-muted-foreground hover:text-foreground" 
            onClick={() => { setEditingCategory(null); setCatFormName(''); setShowCategoryModal(true) }}
            title="Manage Categories"
          >
            <Icon name="category" size={16}/>
            <span className="hidden sm:inline">Categories</span>
          </Button>
        </div>

        {/* Dynamic Category Pill Bar with Smooth Scroll */}
        <div className="relative flex items-center">
          {canScrollLeft && (
            <button 
              onClick={() => scrollCategory(-1)}
              className="liquid-icon-btn absolute left-0 z-10 size-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center"
            >
              <Icon name="chevron_left" size={16}/>
            </button>
          )}

          <div 
            ref={categoryScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full"
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground border border-black/10 dark:border-white/10'
              }`}
            >
              All Categories ({documents.length})
            </button>

            {categories.map(cat => {
              const count = documents.filter(d => d.category === cat.id).length
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground border border-black/10 dark:border-white/10'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span className="opacity-75 text-[11px]">({count})</span>
                </button>
              )
            })}
          </div>

          {canScrollRight && (
            <button 
              onClick={() => scrollCategory(1)}
              className="liquid-icon-btn absolute right-0 z-10 size-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center"
            >
              <Icon name="chevron_right" size={16}/>
            </button>
          )}
        </div>

        {/* Collapsible Format & Date Filter Drawer */}
        {showFilters && (
          <Card className="p-4 sm:p-5 rounded-2xl glass-kormiis border-border/80 dark:border-white/12 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-muted-foreground ml-1">Filter by Category</span>
                <Select value={selectedCategory} onChange={setSelectedCategory}>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-muted-foreground ml-1">File Format</span>
                <Select value={filterFormat} onChange={setFilterFormat}>
                  <SelectItem value="all">All File Types</SelectItem>
                  <SelectItem value="pdf">PDF Documents</SelectItem>
                  <SelectItem value="excel">Excel & Spreadsheets (.xlsx, .csv)</SelectItem>
                  <SelectItem value="image">Images (PNG, JPG, WEBP)</SelectItem>
                  <SelectItem value="archive">Archives (ZIP, RAR)</SelectItem>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-muted-foreground ml-1">Upload Date</span>
                <Select value={filterDate} onChange={setFilterDate}>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Past 7 Days</SelectItem>
                  <SelectItem value="30days">Past 30 Days</SelectItem>
                  <SelectItem value="90days">Past 3 Months</SelectItem>
                </Select>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 3. Real-Time Documents List / Cards */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-[28px] glass-kormiis border border-dashed border-border/80 dark:border-white/14">
          <Icon name="description" size={54} className="text-primary mx-auto mb-4"/>
          <h3 className="text-fluid-lg font-bold text-foreground">No documents found</h3>
          <p className="text-fluid-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {search || selectedCategory !== 'all' || filterFormat !== 'all' || filterDate !== 'all'
              ? 'No documents match your active search or filter criteria.'
              : 'Upload your company handbook, policies, forms, or training resources to get started.'}
          </p>
          <Button 
            variant="default" 
            onClick={handleOpenUploadModal} 
            className="mt-5 rounded-full"
          >
            <Icon name="upload" className="mr-2" size={16}/> Upload New Document
          </Button>
        </div>
      ) : (
        <div role="list" className="flex flex-col gap-3">
          {filteredDocs.map(doc => {
            const catInfo = getCategoryInfo(doc.category)
            const fileIcon = getFileIcon(doc.fileType || doc.fileName)
            const canManage = currentUser?.role === 'Admin' || currentUser?.isWorkspaceOwner || doc.uploadedById === (currentUser?.id || currentUser?.uid)

            return (
              <div 
                key={doc.id} 
                role="listitem" 
                className="group rounded-2xl p-4 sm:p-5 glass-kormiis glass-apple text-foreground border border-white/30 dark:border-white/14 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left Document Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <Icon name={fileIcon} size={32} className="text-primary shrink-0 group-hover:scale-105 transition-transform"/>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-fluid text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {doc.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-muted-foreground">
                        {catInfo.icon}
                        <span>{catInfo.label}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-fluid-xs text-muted-foreground">
                      <span className="font-mono text-muted-foreground/80 break-words max-w-[240px]">
                        {doc.fileName}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-foreground/80">
                        {formatFileSize(doc.fileSize)}
                      </span>
                      <span>•</span>
                      <span>
                        Uploaded {formatDate(doc.uploadedAt)} by <strong className="text-foreground">{doc.uploadedBy}</strong>
                      </span>
                    </div>

                    {doc.description && (
                      <p className="text-fluid-xs text-muted-foreground/90 mt-1.5 ">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/80 dark:border-white/12 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 rounded-full text-xs font-semibold gap-1.5"
                    onClick={() => handleDownload(doc)}
                    title={`Open / Download ${doc.name}`}
                  >
                    <Icon name="download" size={14} className="text-primary"/>
                    <span>Download</span>
                  </Button>

                  {canManage && (
                    <>
                      <button
                        title={`Edit ${doc.name}`}
                        onClick={() => handleOpenEditModal(doc)}
                        className="liquid-icon-btn size-8.5 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-primary/20 hover:text-primary active:scale-90 border border-black/10 dark:border-white/10 transition-all text-muted-foreground hover:text-foreground cursor-pointer shadow-xs"
                      >
                        <Icon name="edit" size={14} />
                      </button>

                      <button
                        title={`Delete ${doc.name}`}
                        onClick={() => handleDelete(doc.id)}
                        className="liquid-icon-btn size-8.5 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-destructive/20 hover:text-destructive active:scale-90 border border-black/10 dark:border-white/10 transition-all text-muted-foreground hover:text-destructive cursor-pointer shadow-xs"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

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
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Select Employee</label>
              <Select value={letterEmpId} onChange={setLetterEmpId}>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} — {emp.designation || emp.role || 'Employee'} ({emp.department || 'General'})
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
