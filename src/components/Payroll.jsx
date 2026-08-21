import { useState, useRef, useMemo, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

import AdSlot from './AdSlot.jsx'
import { formatDate } from '../services/date.js'

export default function Payroll({ employees, payroll, setPayroll, addLog, settings, addAuditLog }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [processingId, setProcessingId] = useState(null)

  // Month/Year dropdown states
  const [monthOpen, setMonthOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const pickerRef = useRef(null)

  const currentMonth = parseInt(selectedMonth.split('-')[1])
  const currentYear = parseInt(selectedMonth.split('-')[0])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const yearOptions = useMemo(() => {
    const years = []
    for (let y = 2050; y >= 2000; y--) years.push(y)
    return years
  }, [])

  // Close pickers on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) { setMonthOpen(false); setYearOpen(false) }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Global salary overrides (keyed by employeeId)
  const [salaryOverrides, setSalaryOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hrp_salary_overrides') || '{}') } catch { return {} }
  })

  // Side Drawer and editing states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedEmpLog, setSelectedEmpLog] = useState(null)
  const [grossSalaryInput, setGrossSalaryInput] = useState(0)
  const [advanceInput, setAdvanceInput] = useState(0)
  const [loanTotalInput, setLoanTotalInput] = useState(0)
  const [loanInstallmentInput, setLoanInstallmentInput] = useState(0)
  const [loanRemainingInput, setLoanRemainingInput] = useState(0)
  const [applyGlobally, setApplyGlobally] = useState(true)

  // Bulk Action State
  const [selectedRows, setSelectedRows] = useState([])
  const [scrollTop, setScrollTop] = useState(0)

  const currency = settings?.currency || '$'
  const pdfCurrency = { '৳': 'BDT', '€': 'EUR', '£': 'GBP', '₹': 'INR', '¥': 'JPY', '$': 'USD', 'د.إ': 'AED', '﷼': 'SAR', 'S$': 'SGD', 'C$': 'CAD', 'A$': 'AUD' }[currency] || currency
  const structure = settings?.salaryStructure || [
    { id: 'basic', name: 'Basic Salary', percentage: 50, type: 'earning' },
    { id: 'hra', name: 'House Rent Allowance (HRA)', percentage: 25, type: 'earning' },
    { id: 'medical', name: 'Medical Allowance', percentage: 10, type: 'earning' },
    { id: 'conveyance', name: 'Conveyance Allowance', percentage: 10, type: 'earning' },
    { id: 'pf', name: 'Provident Fund (PF)', percentage: 5, type: 'deduction' }
  ]

  const monthLabel = `${monthNames[currentMonth - 1]} ${currentYear}`

  // Map/Sync payroll items with current employees list for the selected month
  const getPayrollEntries = () => {
    const monthData = payroll[selectedMonth]
    if (!monthData) return null // Requires initialization

    const basicComp = structure.find(s => s.id === 'basic' || s.name.toLowerCase().includes('basic'))
    const basicPercent = basicComp ? basicComp.percentage : 50

    const allowanceComps = structure.filter(s => s.type === 'earning' && s.id !== (basicComp?.id || 'basic'))
    const allowancePercent = allowanceComps.reduce((a, c) => a + c.percentage, 0)

    const deductionComps = structure.filter(s => s.type === 'deduction')
    const deductionPercent = deductionComps.reduce((a, c) => a + c.percentage, 0)

    return employees.map(emp => {
      const existing = monthData.find(p => p.employeeId === emp.id)
      
      // Default Gross salaries by role
      let gross = 3200
      if (existing && existing.grossSalary) {
        gross = existing.grossSalary
      } else {
        if (emp.role.includes('Manager')) {
          gross = 4500
        } else if (emp.role.includes('Lead') || emp.role.includes('Senior')) {
          gross = 5200
        } else if (emp.role.includes('Engineer')) {
          gross = 4000
        }
      }

      // Compute dynamic components using global settings
      const baseSalary = Math.round(gross * (basicPercent / 100))
      const allowance = Math.round(gross * (allowancePercent / 100))
      const deductions = Math.round(gross * (deductionPercent / 100))
      
      // Advance and Loan allocations
      const advance = existing?.advance || 0
      const loan = existing?.loan || { total: 0, installment: 0, remaining: 0 }

      return {
        employeeId: emp.id,
        grossSalary: gross,
        baseSalary,
        allowance,
        deductions,
        advance,
        loan,
        status: existing?.status || 'Pending',
        paymentDate: existing?.paymentDate || '',
        employee: emp
      }
    })
  }

  const entries = getPayrollEntries()

  // Initialize a new month copying previous settings and subtracting paid loan installments
  const handleInitializeMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const prevMonthVal = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2, '0')}`
    const prevMonthData = payroll[prevMonthVal] || []

    const newEntries = employees.map(emp => {
      const prevRecord = prevMonthData.find(p => p.employeeId === emp.id)
      const prevRemaining = prevRecord?.loan?.remaining || 0
      const prevInstallment = prevRecord?.loan?.installment || 0
      const prevTotal = prevRecord?.loan?.total || 0

      // Calculate carried over loan balance deducting paid installment
      let nextRemaining = prevRemaining
      if (prevRecord && prevRecord.status === 'Paid') {
        nextRemaining = Math.max(0, prevRemaining - Math.min(prevRemaining, prevInstallment))
      }

      let gross = salaryOverrides[emp.id] || prevRecord?.grossSalary || 3200
      if (!prevRecord && !salaryOverrides[emp.id]) {
        if (emp.role.includes('Manager')) gross = 4500
        else if (emp.role.includes('Lead') || emp.role.includes('Senior')) gross = 5200
        else if (emp.role.includes('Engineer')) gross = 4000
      }

      return {
        employeeId: emp.id,
        grossSalary: gross,
        baseSalary: 0,
        allowance: 0,
        deductions: 0,
        advance: 0, // Reset advances for new month
        loan: {
          total: prevTotal,
          installment: prevInstallment,
          remaining: nextRemaining
        },
        status: 'Pending',
        paymentDate: ''
      }
    })

    setPayroll(prev => ({
      ...prev,
      [selectedMonth]: newEntries
    }))

    addLog('Payroll Initialized', `Created new payroll record sheet for ${selectedMonth}`, 'success')
    if (addAuditLog) addAuditLog('CREATE', 'Payroll', `Initialized payroll for ${selectedMonth}`)
  }

  // Calculations (Only if initialized)
  const totalCost = entries ? entries.reduce((acc, curr) => {
    const loanDeduction = Math.min(curr.loan.remaining, curr.loan.installment)
    const net = curr.baseSalary + curr.allowance - curr.deductions - curr.advance - loanDeduction
    return acc + net
  }, 0) : 0
  
  const paidCount = entries ? entries.filter(e => e.status === 'Paid').length : 0
  const totalCount = entries ? entries.length : 0
  const averageSalary = totalCount > 0 ? Math.round(totalCost / totalCount) : 0
  const progressPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  // Filter list
  const filteredEntries = entries ? entries.filter(entry => {
    const emp = entry.employee
    if (!emp) return false
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || entry.status === statusFilter
    return matchesSearch && matchesStatus
  }) : []

  const containerHeight = 600 // px
  const rowHeight = 75 // px
  const overscan = 5
  
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop)
  }

  const totalRows = filteredEntries.length
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(totalRows - 1, Math.floor((scrollTop + containerHeight) / rowHeight) + overscan)
  
  const visibleEntries = filteredEntries.slice(startIndex, endIndex + 1)
  
  const paddingTop = startIndex * rowHeight
  const paddingBottom = Math.max(0, (totalRows - endIndex - 1) * rowHeight)

  // Execute payment and reduce loan remaining balances
  const handleExecutePayment = (entry) => {
    setProcessingId(entry.employeeId)
    setTimeout(() => {
      const today = formatDate(new Date().toISOString().split('T')[0])
      
      const loanDeduction = Math.min(entry.loan.remaining, entry.loan.installment)
      const nextRemaining = Math.max(0, entry.loan.remaining - loanDeduction)

      // Update state for selected month dictionary key
      setPayroll(prev => {
        const monthData = prev[selectedMonth] || []
        const index = monthData.findIndex(p => p.employeeId === entry.employeeId)
        
        const updatedEntry = {
          employeeId: entry.employeeId,
          grossSalary: entry.grossSalary,
          baseSalary: entry.baseSalary,
          allowance: entry.allowance,
          deductions: entry.deductions,
          status: 'Paid',
          paymentDate: today,
          advance: 0,
          loan: {
            total: entry.loan.total,
            installment: entry.loan.installment,
            remaining: nextRemaining
          }
        }
        
        const nextMonthData = [...monthData]
        if (index > -1) {
          nextMonthData[index] = updatedEntry
        } else {
          nextMonthData.push(updatedEntry)
        }

        return {
          ...prev,
          [selectedMonth]: nextMonthData
        }
      })

      const finalNet = entry.baseSalary + entry.allowance - entry.deductions - entry.advance - loanDeduction
      addLog('Salary Disbursed', `Processed salary payout of ${currency}${finalNet} to ${entry.employee.name}`, 'success')
      if (addAuditLog) addAuditLog('UPDATE', 'Payroll', `Executed payment for ${entry.employee.name} in ${selectedMonth}`)
      setProcessingId(null)

      // Download Payslip text receipt
      generatePayslipReceipt(entry, today)
    }, 1200)
  }

  // Bulk Actions
  const handlePayAllPending = () => {
    const pendingEntries = entries ? entries.filter(e => e.status === 'Pending') : []
    if (pendingEntries.length === 0) return

    setProcessingId('bulk-all')
    setTimeout(() => {
      const today = formatDate(new Date().toISOString().split('T')[0])
      setPayroll(prev => {
        const monthData = prev[selectedMonth] || []
        const updatedMonthData = monthData.map(entry => {
          if (entry.status === 'Pending') {
            const loanDeduction = Math.min(entry.loan.remaining, entry.loan.installment)
            return {
              ...entry,
              status: 'Paid',
              paymentDate: today,
              advance: 0,
              loan: {
                ...entry.loan,
                remaining: Math.max(0, entry.loan.remaining - loanDeduction)
              }
            }
          }
          return entry
        })
        return { ...prev, [selectedMonth]: updatedMonthData }
      })
      addLog('Bulk Disbursed', `Processed salary payout for ${pendingEntries.length} employees`, 'success')
      if (addAuditLog) addAuditLog('UPDATE', 'Payroll', `Bulk executed ${pendingEntries.length} payments in ${selectedMonth}`)
      setProcessingId(null)
    }, 1500)
  }

  const handleBulkExecute = () => {
    // If user has payroll access, they can recalculate
    if (selectedRows.length === 0) return
    const entriesToPay = entries.filter(e => selectedRows.includes(e.employeeId) && e.status === 'Pending')
    if (entriesToPay.length === 0) return

    setProcessingId('bulk-selected')
    setTimeout(() => {
      const today = formatDate(new Date().toISOString().split('T')[0])
      setPayroll(prev => {
        const monthData = prev[selectedMonth] || []
        const updatedMonthData = monthData.map(entry => {
          if (selectedRows.includes(entry.employeeId) && entry.status === 'Pending') {
            const loanDeduction = Math.min(entry.loan.remaining, entry.loan.installment)
            return {
              ...entry,
              status: 'Paid',
              paymentDate: today,
              advance: 0,
              loan: {
                ...entry.loan,
                remaining: Math.max(0, entry.loan.remaining - loanDeduction)
              }
            }
          }
          return entry
        })
        return { ...prev, [selectedMonth]: updatedMonthData }
      })
      addLog('Bulk Disbursed', `Processed salary payout for ${entriesToPay.length} selected employees`, 'success')
      if (addAuditLog) addAuditLog('UPDATE', 'Payroll', `Bulk executed ${entriesToPay.length} payments in ${selectedMonth}`)
      setProcessingId(null)
      setSelectedRows([])
    }, 1500)
  }

  const toggleRowSelection = (empId) => {
    setSelectedRows(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredEntries.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredEntries.map(e => e.employeeId))
    }
  }

  // Generate PDF payslip
  const generatePayslipReceipt = async (entry, payDate) => {
    const loanDeduction = Math.min(entry.loan.remaining, entry.loan.installment)
    const net = entry.baseSalary + entry.allowance - entry.deductions - entry.advance - loanDeduction
    const grossVal = entry.grossSalary
    const companyName = settings?.company?.name || 'Kormiis'
    const companyLogo = settings?.company?.logo

    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentW = pageW - margin * 2
    let y = margin

    // Header bar with Company Branding
    if (companyLogo) {
      try {
        let format = 'PNG'
        if (companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')) format = 'JPEG'
        else if (companyLogo.startsWith('data:image/webp')) format = 'WEBP'
        doc.addImage(companyLogo, format, margin, y, 16, 16)
        
        doc.setTextColor(20, 20, 20)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(companyName.toUpperCase(), margin + 22, y + 6)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`OFFICIAL PAYSLIP RECEIPT • ${selectedMonth}`, margin + 22, y + 12)
        y += 22
      } catch (err) {
        doc.setFillColor(0, 0, 0)
        doc.rect(margin, y, contentW, 14, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${companyName.toUpperCase()} — PAYSLIP RECEIPT`, pageW / 2, y + 9, { align: 'center' })
        y += 22
      }
    } else {
      doc.setFillColor(0, 0, 0)
      doc.rect(margin, y, contentW, 14, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${companyName.toUpperCase()} — PAYSLIP RECEIPT`, pageW / 2, y + 9, { align: 'center' })
      y += 22
    }

    // Employee info
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const infoLeft = [
      `Employee: ${entry.employee.name}`,
      `Role: ${entry.employee.role}`,
      `Department: ${entry.employee.department || '-'}`
    ]
    const infoRight = [
      `Pay Period: ${selectedMonth}`,
      `Issue Date: ${payDate}`,
      `ID: ${entry.employeeId}`
    ]
    infoLeft.forEach((line, i) => doc.text(line, margin, y + i * 5))
    infoRight.forEach((line, i) => doc.text(line, pageW - margin, y + i * 5, { align: 'right' }))
    y += infoLeft.length * 5 + 6

    // Separator
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // Earnings table
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('EARNINGS', margin, y); y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    let earningsTotal = 0
    structure.filter(s => s.type === 'earning').forEach(s => {
      const amt = grossVal * (s.percentage / 100)
      earningsTotal += amt
      doc.text(s.name, margin + 4, y)
      doc.text(`${pdfCurrency} ${amt.toFixed(2)}`, pageW - margin, y, { align: 'right' })
      y += 4.5
    })
    doc.setFont('helvetica', 'bold')
    doc.text('Total Earnings', margin + 4, y)
    doc.text(`${pdfCurrency} ${earningsTotal.toFixed(2)}`, pageW - margin, y, { align: 'right' })
    y += 7

    // Deductions table
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('DEDUCTIONS', margin, y); y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    let deductionsTotal = 0
    structure.filter(s => s.type === 'deduction').forEach(s => {
      const amt = grossVal * (s.percentage / 100)
      deductionsTotal += amt
      doc.text(s.name, margin + 4, y)
      doc.text(`-${pdfCurrency} ${amt.toFixed(2)}`, pageW - margin, y, { align: 'right' })
      y += 4.5
    })
    if (entry.advance > 0) {
      deductionsTotal += entry.advance
      doc.text('Salary Advance Settlement', margin + 4, y)
      doc.text(`-${pdfCurrency} ${entry.advance.toFixed(2)}`, pageW - margin, y, { align: 'right' })
      y += 4.5
    }
    if (loanDeduction > 0) {
      deductionsTotal += loanDeduction
      doc.text('Company Loan Installment', margin + 4, y)
      doc.text(`-${pdfCurrency} ${loanDeduction.toFixed(2)}`, pageW - margin, y, { align: 'right' })
      y += 4.5
    }
    doc.setFont('helvetica', 'bold')
    doc.text('Total Deductions', margin + 4, y)
    doc.text(`-${pdfCurrency} ${deductionsTotal.toFixed(2)}`, pageW - margin, y, { align: 'right' })
    y += 7

    // Net Salary
    doc.setFontSize(10)
    doc.text('NET SALARY', margin, y)
    const pdfNet = earningsTotal - deductionsTotal
    doc.text(`${pdfCurrency} ${pdfNet.toFixed(2)}`, pageW - margin, y, { align: 'right' })
    y += 12

    // Notes
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('This is an auto-generated HR document.', margin, y); y += 4
    if (entry.status === 'Paid') {
      doc.text(`Status: PAID on ${payDate}`, margin, y); y += 4
    }
    if (entry.loan?.remaining > 0) {
      doc.text(`Loan remaining balance: ${pdfCurrency} ${(entry.loan.remaining - loanDeduction).toFixed(2)}`, margin, y)
    }
    y += 8

    // Footer
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 5
    doc.setFontSize(7.5)
    doc.setTextColor(150, 150, 150)
    doc.text('This is a computer-generated document. No signature is required.', pageW / 2, y, { align: 'center' })

    // Loan remaining note
    if (loanDeduction > 0) {
      y += 4
      doc.text(`Loan remaining balance: ${currency}${(entry.loan.remaining - loanDeduction).toFixed(2)}`, margin, y)
    }

    doc.save(`payslip_${entry.employeeId}_${selectedMonth}_${entry.employee.name.replace(/\s+/g, '_')}.pdf`)
  }

  // Manage Compensation & Loan/Advance helper
  const openCompensationModal = (entry) => {
    setSelectedEmpLog(entry)
    setGrossSalaryInput(entry.grossSalary)
    setAdvanceInput(entry.advance)
    setLoanTotalInput(entry.loan.total)
    setLoanInstallmentInput(entry.loan.installment)
    setLoanRemainingInput(entry.loan.remaining)
    setApplyGlobally(true)
    setIsDrawerOpen(true)
  }

  const handleSaveCompensationLedger = (e) => {
    e.preventDefault()
    if (!selectedEmpLog) return

    const newGross = Number(grossSalaryInput) || 3200

    setPayroll(prev => {
      const monthData = prev[selectedMonth] || []
      const index = monthData.findIndex(p => p.employeeId === selectedEmpLog.employeeId)

      const updatedEntry = {
        employeeId: selectedEmpLog.employeeId,
        grossSalary: newGross,
        baseSalary: selectedEmpLog.baseSalary,
        allowance: selectedEmpLog.allowance,
        deductions: selectedEmpLog.deductions,
        status: selectedEmpLog.status,
        paymentDate: selectedEmpLog.paymentDate,
        advance: Number(advanceInput) || 0,
        loan: {
          total: Number(loanTotalInput) || 0,
          installment: Number(loanInstallmentInput) || 0,
          remaining: Number(loanRemainingInput) || 0
        }
      }

      const nextMonthData = [...monthData]
      if (index > -1) {
        nextMonthData[index] = updatedEntry
      } else {
        nextMonthData.push(updatedEntry)
      }

      if (applyGlobally) {
        setSalaryOverrides(prevOverrides => {
          const next = { ...prevOverrides, [selectedEmpLog.employeeId]: newGross }
          localStorage.setItem('hrp_salary_overrides', JSON.stringify(next))
          return next
        })
        // Also update all existing months' entries for this employee
        const updatedPayroll = {}
        Object.keys(prev).forEach(monthKey => {
          const monthEntries = prev[monthKey].map(entry =>
            entry.employeeId === selectedEmpLog.employeeId
              ? { ...entry, grossSalary: newGross }
              : entry
          )
          updatedPayroll[monthKey] = monthEntries
        })
        return { ...updatedPayroll, [selectedMonth]: nextMonthData }
      }

      return { ...prev, [selectedMonth]: nextMonthData }
    })

    setIsDrawerOpen(false)
    setTimeout(() => setSelectedEmpLog(null), 300)

    addLog('Ledger Updated', `${applyGlobally ? 'Globally updated' : 'Updated'} compensation for ${selectedEmpLog.employee.name}`, 'success')
  }

  const handleDownloadPayrollPDF = async () => {
    if (!entries) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`${settings?.company?.name || 'Kormiis'} — Payroll Summary Sheet`, 14, 22)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Pay Period: ${monthLabel}`, 14, 30)

    const tableColumn = ["Employee", "Job Title", "Basic", "Allowances", "Deductions", "Net Salary", "Status"]
    const tableRows = []

    entries.forEach(entry => {
      const loanDeduction = (entry.status === 'Paid' ? 0 : Math.min(entry.loan?.remaining || 0, entry.loan?.installment || 0))
      const net = (entry.baseSalary || 0) + (entry.allowance || 0) - (entry.deductions || 0) - (entry.advance || 0) - loanDeduction
      const totalDeductions = (entry.deductions || 0) + (entry.advance || 0) + loanDeduction
      
      const rowData = [
        entry.employee.name,
        entry.employee.designation || entry.employee.role || '-',
        `${pdfCurrency} ${entry.baseSalary.toFixed(2)}`,
        `${pdfCurrency} ${entry.allowance.toFixed(2)}`,
        `${pdfCurrency} ${totalDeductions.toFixed(2)}`,
        `${pdfCurrency} ${net.toFixed(2)}`,
        entry.status
      ]
      tableRows.push(rowData)
    })

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [254, 53, 1] }, 
      styles: { fontSize: 9, cellPadding: 3 },
      didDrawPage: (data) => {
        if (settings?.company?.logo) {
          try {
            const pageW = doc.internal.pageSize.getWidth()
            const pageH = doc.internal.pageSize.getHeight()
            
            let format = 'PNG'
            if (settings.company.logo.startsWith('data:image/jpeg')) format = 'JPEG'
            else if (settings.company.logo.startsWith('data:image/webp')) format = 'WEBP'
            
            let imgW = 35
            let imgH = 15
            try {
              const props = doc.getImageProperties(settings.company.logo)
              if (props && props.width && props.height) {
                const maxW = 35; const maxH = 15;
                imgW = props.width; imgH = props.height;
                if (imgW > maxW) { imgH = (imgH * maxW) / imgW; imgW = maxW; }
                if (imgH > maxH) { imgW = (imgW * maxH) / imgH; imgH = maxH; }
              }
            } catch (err) {
              console.warn("Could not get image properties, using default dimensions")
            }
            
            const x = (pageW - imgW) / 2
            const y = pageH - 8 - imgH
            doc.addImage(settings.company.logo, format, x, y, imgW, imgH)
          } catch (e) {
            console.error("Failed to add logo:", e)
          }
        }
      }
    })

    doc.save(`Payroll_Sheet_${monthLabel.replace(' ', '_')}.pdf`)
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      
      {/* Header and Month Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="account_balance" className="text-foreground shrink-0" size={28}/>
          Payroll
        </h1>
      </div>
      <div className="border-t border-border border-headline mb-2" />
      
      <div ref={pickerRef} className="flex flex-wrap gap-2 items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleDownloadPayrollPDF} disabled={!entries} className="rounded-full text-xs font-semibold hover:text-primary hover:border-primary/50 transition-colors shadow-sm">
          <Icon name="picture_as_pdf" size={16} className="mr-1.5" /> Download Sheet PDF
        </Button>

        <div className="flex gap-2 items-center">
          {/* Month dropdown */}
          <div className="relative w-[140px] h-10">
            <button onClick={() => { setMonthOpen(!monthOpen); setYearOpen(false) }} className={`flex w-full h-10 items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${monthOpen ? 'ring-2 ring-ring ring-offset-2' : ''}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <Icon name="calendar_month" className="h-4 w-4 shrink-0 text-muted-foreground" size={16}/>
                <span className="break-words">{monthNames[currentMonth - 1]}</span>
              </div>
              <Icon name="keyboard_arrow_down" className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${monthOpen ? 'rotate-180' : ''}`} size={16}/>
            </button>
          {monthOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto z-[100] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              {monthNames.map((name, i) => (
                <button key={name} onClick={() => { setSelectedMonth(`${currentYear}-${String(i + 1).padStart(2, '0')}`); setMonthOpen(false) }} 
                  className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${i + 1 === currentMonth ? 'bg-accent text-accent-foreground font-semibold' : ''}`}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Year dropdown */}
        <div className="relative w-24 h-10">
          <button onClick={() => { setYearOpen(!yearOpen); setMonthOpen(false) }} className={`flex w-full h-10 items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${yearOpen ? 'ring-2 ring-ring ring-offset-2' : ''}`}>
            <span className="break-words">{currentYear}</span>
            <Icon name="keyboard_arrow_down" className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${yearOpen ? 'rotate-180' : ''}`} size={16}/>
          </button>
          {yearOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto z-[100] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              {yearOptions.map(y => (
                <button key={y} onClick={() => { setSelectedMonth(`${y}-${String(currentMonth).padStart(2, '0')}`); setYearOpen(false) }} 
                  className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${y === currentYear ? 'bg-accent text-accent-foreground font-semibold' : ''}`}>
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {!entries ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-muted/20">
          <Icon name="calendar_month" className="h-12 w-12 text-primary opacity-80 mb-4" size={48}/>
          <h3 className="text-xl font-semibold mb-2">Payroll Not Initialized</h3>
          <p className="text-fluid-sm text-muted-foreground max-w-md mx-auto mb-6">
            The payroll sheet for {monthLabel} has not been created yet. 
            Initialize it to pull the active roster and carry over compensation parameters.
          </p>
          <Button onClick={handleInitializeMonth} size="lg">
            <Icon name="add_circle" className="mr-2 h-5 w-5" size={20}/> Initialize Month Payroll
          </Button>
        </Card>
      ) : (
        <>
          {/* Stats Cards Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Total Payout Budget</CardTitle>
                <Icon name="account_balance" className="h-4 w-4 text-muted-foreground" size={16}/>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-display font-bold font-sans">{currency}{totalCost.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Average Salary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-display font-bold font-sans">{currency}{averageSalary.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar Filter Section */}
          <div className="flex justify-between items-center flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary" aria-label="Select all" checked={selectedRows.length === filteredEntries.length && filteredEntries.length > 0} onChange={toggleSelectAll} />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Select All</span>
            </div>
            
            <div className="relative flex-1 min-w-[200px] max-w-[350px] flex items-center">
              <Icon name="search" className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none" size={18}/>
              <Input placeholder="Search employee or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="!pl-10.5 h-11 rounded-2xl w-full" />
            </div>

            <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              {['All', 'Paid', 'Pending'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${statusFilter === status ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50 hover:text-foreground'}`}
                >
                  {statusFilter === status && <Icon name="check" className="mr-1.5 h-3.5 w-3.5" size={14}/>}
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions Sticky Bar */}
          {selectedRows.length > 0 && (
            <div className="sticky top-2 z-[50] p-3 px-4 bg-primary text-primary-foreground flex justify-between items-center rounded-lg shadow-lg animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-medium">
                <Icon name="check_box" className="h-5 w-5" size={20}/>
                <span>{selectedRows.length} employee{selectedRows.length > 1 ? 's' : ''} selected</span>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setSelectedRows([])}>Cancel</Button>
                <Button variant="secondary" size="sm" onClick={handleBulkExecute} disabled={processingId === 'bulk-selected'}>
                  {processingId === 'bulk-selected' ? 'Processing...' : 'Execute Selected'}
                </Button>
              </div>
            </div>
          )}

          {/* Universal Payroll Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">No employees found.</div>
            )}
            {filteredEntries.map(entry => {
              const emp = entry.employee
              const loanDeduction = Math.min(entry.loan.remaining, entry.loan.installment)
              const netPay = entry.baseSalary + entry.allowance - entry.deductions - entry.advance - loanDeduction
              const isPaid = entry.status === 'Paid'
              const isProcessing = processingId === entry.employeeId
              const isSelected = selectedRows.includes(entry.employeeId)

              return (
                <Card key={entry.employeeId} className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}>
                  <div className="p-4 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary mt-1" aria-label={`Select ${emp.name}`} checked={isSelected} onChange={() => toggleRowSelection(entry.employeeId)} />
                        <Avatar className="w-10 h-10 shrink-0 ring-1 ring-border">
                          {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                          <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={20}/></AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-base leading-tight">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">{emp.designation && emp.designation.toLowerCase() !== 'teammate' ? emp.designation : (emp.role && emp.role.toLowerCase() !== 'teammate' ? emp.role : '')}</span>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5 shrink-0 ${
                          isPaid 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {entry.status}
                      </Badge>
                    </div>
                    
                    {/* Body: Salary Grid */}
                    <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg text-sm border border-border/50">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs font-medium">Gross Salary</span>
                        <span className="font-sans font-medium">{currency}{entry.grossSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs font-medium">Deductions</span>
                        <span className="font-sans font-medium text-red-500 dark:text-red-400">-{currency}{entry.deductions.toLocaleString()}</span>
                      </div>
                      {(entry.advance > 0 || entry.loan.total > 0) && (
                        <>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs font-medium">Advance/Loan</span>
                            <span className="font-sans font-medium text-yellow-600 dark:text-yellow-500">-{currency}{(entry.advance + loanDeduction).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs font-medium">Loan Rem.</span>
                            <span className="font-sans text-muted-foreground">{currency}{entry.loan.remaining}</span>
                          </div>
                        </>
                      )}
                      <div className="flex flex-col col-span-2 pt-2 mt-1 border-t border-border/50">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Net Payout</span>
                        <span className="font-sans font-bold text-primary text-fluid-lg">{currency}{netPay.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="outline" className="flex-1" onClick={() => openCompensationModal(entry)}>
                        <Icon name="edit" className="mr-2 h-4 w-4 text-blue-500" size={16}/> Edit
                      </Button>
                      {!isPaid ? (
                        <Button className="flex-1" onClick={() => handleExecutePayment(entry)} disabled={isProcessing}>
                          {isProcessing ? '...' : 'Execute'}
                        </Button>
                      ) : (
                        <Button variant="secondary" className="flex-1" onClick={() => generatePayslipReceipt(entry, entry.paymentDate)}>
                          <Icon name="download" className="mr-2 h-4 w-4" size={16}/> Payslip
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* MANAGE COMPENSATION MODAL */}
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="edit" className="h-5 w-5 text-blue-500" size={20}/>
              Manage Compensation
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmpLog && (
            <div className="flex flex-col gap-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 py-4 px-2 border-b border-border/50">
                <Avatar className="w-10 h-10 shrink-0 ring-1 ring-border">
                  {selectedEmpLog.employee.avatar ? <AvatarImage src={selectedEmpLog.employee.avatar} alt={selectedEmpLog.employee.name} className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={20}/></AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{selectedEmpLog.employee.name}</span>
                  <span className="text-xs text-muted-foreground">{selectedEmpLog.employee.role}</span>
                </div>
              </div>

              <form onSubmit={handleSaveCompensationLedger} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Monthly Salary ({currency})</label>
                  <Input type="number" min="0" value={grossSalaryInput} onChange={(e) => setGrossSalaryInput(e.target.value)} className="font-semibold" />
                  <span className="text-[11px] text-muted-foreground">Basic and allowances dynamically split from gross.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary Advance ({currency})</label>
                  <Input type="number" min="0" value={advanceInput} onChange={(e) => setAdvanceInput(e.target.value)} />
                  <span className="text-[11px] text-muted-foreground">Deducted in full from the next payout.</span>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <span className="text-sm font-semibold">Company Loan Settings</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Total Principal</label>
                      <Input type="number" min="0" value={loanTotalInput} onChange={(e) => setLoanTotalInput(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-muted-foreground">Remaining Balance</label>
                      <Input type="number" min="0" value={loanRemainingInput} onChange={(e) => setLoanRemainingInput(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-muted-foreground">Monthly Installment Deduction ({currency})</label>
                    <Input type="number" min="0" value={loanInstallmentInput} onChange={(e) => setLoanInstallmentInput(e.target.value)} />
                    <span className="text-[11px] text-muted-foreground">Deducted monthly until balance reaches $0.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apply Changes To</span>
                  <div className="flex rounded-lg overflow-hidden border border-border">
                    <button type="button" onClick={() => setApplyGlobally(false)} className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${!applyGlobally ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
                      This Month Only
                    </button>
                    <button type="button" onClick={() => setApplyGlobally(true)} className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${applyGlobally ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
                      All Future Months
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {applyGlobally ? 'Salary is saved centrally and affects all months.' : 'Change applies only to the current selected month.'}
                  </span>
                </div>

                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDrawerOpen(false); setTimeout(() => setSelectedEmpLog(null), 300); }}>Cancel</Button>
                  <Button type="submit">
                    <Icon name="check_box" className="mr-2 h-4 w-4" size={16}/> Apply Changes
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AdSlot type="horizontal" className="mt-4" />
    </div>
  )
}
