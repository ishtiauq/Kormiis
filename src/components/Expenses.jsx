import { useState, useRef, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Select, SelectItem } from "@/components/ui/select"
import AdSlot from './AdSlot'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Expenses({ employees, expenses, setExpenses, settings, addLog, addToast, addAuditLog, currentUser, addNotification }) {
  const [activeTab, setActiveTab] = useState('submit')

  // Employee Submission States
  const [category, setCategory] = useState('Travel')
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [receiptBase64, setReceiptBase64] = useState(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Manager Approval States
  const [selectedExpenses, setSelectedExpenses] = useState([])
  const [rejectReasonModal, setRejectReasonModal] = useState({ open: false, id: null, reason: '' })

  const fileInputRef = useRef(null)

  const expenseCategories = ['Travel', 'Meals', 'Office Supplies', 'Medical', 'Other']
  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'BDT']

  // Multi-currency mock exchange rates to USD
  const exchangeRates = { USD: 1, EUR: 1.1, GBP: 1.3, INR: 0.012, BDT: 0.009 }

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptBase64(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount || !date || !description) {
      addToast('Please fill all required fields.', 'warning')
      return
    }

    const expCategory = category === 'Add New...' ? customCategory : category
    const newExpense = {
      id: `EXP-${Date.now()}`,
      employeeId: currentUser?.employeeId || currentUser?.id || 'SYS-ADMIN',
      category: expCategory,
      amount: Number(amount),
      currency,
      usdAmount: Number(amount) * exchangeRates[currency],
      date,
      description,
      status: 'Pending',
      receipt: receiptBase64,
      submittedAt: new Date().toISOString()
    }

    setExpenses(prev => [newExpense, ...prev])
    addAuditLog('CREATE', 'Expense', `Submitted ${currency} ${amount} for ${expCategory}`)
    setShowSuccessDialog(true)

    if (addNotification) {
      addNotification(
        `${currentUser?.name || 'Teammate'} submitted an expense claim of ${currency} ${amount} for "${expCategory}"`, 
        'expenses', 
        { title: 'Expense Claim Submitted', category: 'expense', targetRoles: ['Admin', 'HR'] }
      )
    }

    setAmount('')
    setDescription('')
    setDate('')
    setReceiptBase64(null)
    setCustomCategory('')
    if (category === 'Add New...') setCategory('Travel')
  }

  const handleApprove = (id) => {
    const targetExp = expenses.find(exp => exp.id === id)
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: 'Approved', approvedBy: currentUser?.role || 'Admin', actionDate: new Date().toISOString() } : exp))
    addToast('Expense approved.', 'success')
    addAuditLog('UPDATE', 'Expense', `Approved expense ${id}`)

    if (addNotification && targetExp) {
      addNotification(
        `Your expense claim for "${targetExp.category || 'Expense'}" (${targetExp.currency || ''} ${targetExp.amount}) was approved`, 
        'expenses', 
        { title: 'Expense Approved', category: 'expense', targetEmployeeIds: [targetExp.employeeId] }
      )
    }
  }

  const handleReject = () => {
    const targetExp = expenses.find(exp => exp.id === rejectReasonModal.id)
    setExpenses(prev => prev.map(exp => exp.id === rejectReasonModal.id ? { ...exp, status: 'Rejected', rejectReason: rejectReasonModal.reason, rejectedBy: currentUser?.role || 'Admin', actionDate: new Date().toISOString() } : exp))
    addToast('Expense rejected.', 'success')
    addAuditLog('UPDATE', 'Expense', `Rejected expense ${rejectReasonModal.id}`)

    if (addNotification && targetExp) {
      addNotification(
        `Your expense claim for "${targetExp.category || 'Expense'}" was rejected`, 
        'expenses', 
        { title: 'Expense Rejected', category: 'expense', targetEmployeeIds: [targetExp.employeeId] }
      )
    }

    setRejectReasonModal({ open: false, id: null, reason: '' })
  }

  const handleBulkApprove = () => {
    const targetIds = [...selectedExpenses]
    setExpenses(prev => prev.map(exp => targetIds.includes(exp.id) ? { ...exp, status: 'Approved', approvedBy: currentUser?.role || 'Admin', actionDate: new Date().toISOString() } : exp))
    setSelectedExpenses([])
    addToast(`${targetIds.length} expenses approved.`, 'success')
    addAuditLog('UPDATE', 'Expense', `Bulk approved ${targetIds.length} expenses`)

    if (addNotification) {
      targetIds.forEach(id => {
        const exp = expenses.find(e => e.id === id)
        if (exp) {
          addNotification(
            `Your expense claim for "${exp.category || 'Expense'}" (${exp.currency || ''} ${exp.amount}) was approved`, 
            'expenses', 
            { title: 'Expense Approved', category: 'expense', targetEmployeeIds: [exp.employeeId] }
          )
        }
      })
    }
  }

  const handleToggleSelect = (id) => {
    setSelectedExpenses(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleMarkReimbursed = (id) => {
    const ref = prompt("Enter bank transaction reference:")
    if (ref) {
      const targetExp = expenses.find(exp => exp.id === id)
      setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: 'Reimbursed', transactionRef: ref, reimbursedBy: currentUser?.role || 'Admin', actionDate: new Date().toISOString() } : exp))
      addToast('Expense marked as reimbursed.', 'success')
      addAuditLog('UPDATE', 'Expense', `Reimbursed expense ${id} (Ref: ${ref})`)

      if (addNotification && targetExp) {
        addNotification(
          `Your expense claim for "${targetExp.category || 'Expense'}" (${targetExp.currency || ''} ${targetExp.amount}) has been reimbursed`, 
          'expenses', 
          { title: 'Expense Reimbursed', category: 'expense', targetEmployeeIds: [targetExp.employeeId] }
        )
      }
    }
  }

  const exportCSV = () => {
    const approved = expenses.filter(e => e.status === 'Approved')
    if (approved.length === 0) {
      addToast('No approved expenses to export.', 'warning')
      return
    }
    const headers = ['ID', 'Employee ID', 'Category', 'Amount', 'Currency', 'USD Value', 'Date', 'Description', 'Status']
    const csvContent = [
      headers.join(','),
      ...approved.map(e => `${e.id},${e.employeeId},${e.category},${e.amount},${e.currency},${e.usdAmount},${e.date},"${e.description}",${e.status}`)
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "approved_expenses.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('Exported CSV successfully.', 'success')
  }

  // Derived Data
  const pendingQueue = expenses.filter(e => e.status === 'Pending')
  const approvedQueue = expenses.filter(e => e.status === 'Approved')
  // Expense Approvers or Admins can see all expenses in the queue. Regular Teammates see only their own.
  const canApprove = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('approve_expenses')
  const canReimburse = currentUser?.role === 'Admin' || currentUser?.permissions?.includes('approve_expenses')
  
  const myClaimsQueue = canApprove ? expenses : expenses.filter(e => e.employeeId === (currentUser?.employeeId || currentUser?.id || 'SYS-ADMIN'))
  const historyQueue = expenses.filter(e => e.status !== 'Pending')

  const pendingLiability = pendingQueue.reduce((acc, curr) => acc + (curr.usdAmount || (curr.amount * exchangeRates[curr.currency])), 0)
  const approvedLiability = approvedQueue.reduce((acc, curr) => acc + (curr.usdAmount || (curr.amount * exchangeRates[curr.currency])), 0)

  const categoryTotals = useMemo(() => {
    const totals = {}
    expenses.filter(e => e.status !== 'Rejected').forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + (exp.usdAmount || (exp.amount * exchangeRates[exp.currency]))
    })
    return Object.entries(totals).map(([name, value]) => ({ name, value }))
  }, [expenses])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  const policies = settings.expensePolicies || {}



  return (
    <div className="animate-fade-in flex flex-col gap-4 sm:gap-6 lg:gap-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="wallet" className="text-foreground" size={20}/>
          Expenses
        </h1>
      </div>
      <div className="border-t border-border border-headline" />

      {/* Navigation Tabs */}
      <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
        <div role="tablist" aria-label="Expense management sections" className="menu-bar">
          <Button
            role="tab"
            aria-selected={activeTab === 'submit'}
            variant={activeTab === 'submit' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 relative justify-center ${activeTab !== 'submit' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveTab('submit')}
          >
            <Icon name="add" size={16}/> Claim
          </Button>
          {!(canApprove || canReimburse) && (
            <Button
              role="tab"
              aria-selected={activeTab === 'my-claims'}
              variant={activeTab === 'my-claims' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-4 relative justify-center ${activeTab !== 'my-claims' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
              onClick={() => setActiveTab('my-claims')}
            >
              <Icon name="list" size={16}/> My Claims
            </Button>
          )}
          {canApprove && (
            <Button
              role="tab"
              aria-selected={activeTab === 'approve'}
              variant={activeTab === 'approve' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-4 relative justify-center ${activeTab !== 'approve' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
              onClick={() => setActiveTab('approve')}
            >
              <Icon name="schedule" size={16}/> Approvals
              {pendingQueue.length > 0 && <Badge variant="destructive" className="ml-1 px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">{pendingQueue.length}</Badge>}
            </Button>
          )}
          {canReimburse && (
            <Button
              role="tab"
              aria-selected={activeTab === 'finance'}
              variant={activeTab === 'finance' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-4 relative justify-center ${activeTab !== 'finance' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
              onClick={() => setActiveTab('finance')}
            >
              <Icon name="pie_chart" size={16}/> Finance
            </Button>
          )}
          {(canApprove || canReimburse) && (
            <Button
              role="tab"
              aria-selected={activeTab === 'history'}
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-4 relative justify-center ${activeTab !== 'history' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Icon name="history" size={16}/> History
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'submit' && (
        <div className="max-w-2xl mx-auto w-full">
          {/* Input Form */}
          <Card className="flex-1">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-xl mb-6 flex items-center gap-2 text-foreground">
                <Icon name="wallet" className="text-foreground" size={20}/>
                Expense Details
              </h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Select label="Category" value={category} onChange={setCategory}>
                      {expenseCategories.map(c => <SelectItem key={c} id={c}>{c}</SelectItem>)}
                      <SelectItem id="Add New...">+ Add New...</SelectItem>
                    </Select>
                    {category === 'Add New...' && (
                      <Input 
                        placeholder="Enter custom category" 
                        value={customCategory} 
                        onChange={e => setCustomCategory(e.target.value)} 
                        className="mt-2"
                        required 
                        aria-label="Custom category"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <DatePicker label="Date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                </div>

                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="flex-[2] flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Amount</label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" aria-label="Expense amount" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Select label="Currency" value={currency} onChange={setCurrency}>
                      {currencies.map(c => <SelectItem key={c} id={c}>{c}</SelectItem>)}
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Briefly describe the expense..." rows={3} aria-label="Expense description" className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs sm:text-sm font-medium shadow-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Receipt (Image/PDF)</label>
                  <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleReceiptUpload} className="hidden" />
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className="p-6 sm:p-8 rounded-xl border-2 border-dashed border-border bg-muted/30 text-center cursor-pointer flex flex-col items-center gap-2 transition-colors hover:border-primary hover:bg-muted/50"
                  >
                    <Icon name="upload" className="text-muted-foreground" size={24}/>
                    <span className="text-sm text-muted-foreground">{receiptBase64 ? 'Receipt uploaded. Click to change.' : 'Click to upload receipt'}</span>
                  </div>
                </div>

                <Button type="submit" size="lg" className="mt-3 justify-center w-full">
                  Submit for Approval
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'approve' && canApprove && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-foreground">Approval Queue</h3>
            {selectedExpenses.length > 0 && (
              <Button variant="default" size="sm" onClick={handleBulkApprove}>
                <Icon name="check" size={16}/> Bulk Approve ({selectedExpenses.length})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border w-fit mb-2">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary" aria-label="Select all" onChange={(e) => setSelectedExpenses(e.target.checked ? pendingQueue.map(q => q.id) : [])} checked={selectedExpenses.length === pendingQueue.length && pendingQueue.length > 0} />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Select All Pending</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingQueue.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">No pending expenses.</div>
            ) : (
              pendingQueue.map(exp => {
                const emp = employees.find(e => e.id === exp.employeeId)
                const isOverLimit = policies[exp.category] && (exp.usdAmount || (exp.amount * exchangeRates[exp.currency])) > policies[exp.category]
                const isSelected = selectedExpenses.includes(exp.id)

                return (
                  <Card key={exp.id} className={`relative overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''} ${isOverLimit ? 'border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : ''}`}>
                    <div className="h-2 w-full bg-primary absolute top-0 left-0" />
                    <div className="p-4 pt-5 flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary mt-1" aria-label="Select expense" checked={isSelected} onChange={() => handleToggleSelect(exp.id)} />
                          <Avatar className="w-10 h-10 shrink-0 ring-1 ring-border">
                            {emp?.avatar ? <AvatarImage src={emp.avatar} alt={emp?.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={20}/></AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-base leading-tight">{emp?.name}</span>
                            <span className="text-xs text-muted-foreground">{exp.id}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={isOverLimit ? 'border-destructive text-destructive' : 'bg-muted/50'}>
                          {exp.category}
                        </Badge>
                      </div>

                      {/* Body */}
                      <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg text-sm border border-border/50">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Amount</span>
                          <span className={`font-sans text-fluid-lg font-bold ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}>{exp.currency} {exp.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Date</span>
                          <span className="font-sans text-sm mt-1">{exp.date}</span>
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          "{exp.description}"
                        </div>
                        {isOverLimit && (
                          <div className="col-span-2 flex items-center gap-1.5 text-destructive text-xs font-medium bg-destructive/10 p-2 rounded border border-destructive/20 mt-1">
                            <Icon name="warning" size={14}/> Exceeds {exp.category} limit of ${policies[exp.category]}
                          </div>
                        )}
                        {exp.receipt && (
                          <div className="col-span-2 mt-2">
                            <img src={exp.receipt} alt="Receipt" className="w-full h-24 object-cover rounded-md border border-border" />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => setRejectReasonModal({ open: true, id: exp.id, reason: '' })}>
                          <Icon name="close" className="mr-2 h-4 w-4" size={16}/> Reject
                        </Button>
                        <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none" onClick={() => handleApprove(exp.id)}>
                          <Icon name="check" className="h-4 w-4" size={16}/> Approve
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'finance' && canReimburse && (
        <div className="flex flex-col gap-6">
          {/* Finance Metrics */}
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            <Card>
              <CardContent className="p-6 flex flex-col justify-center">
                <h3 className="text-sm mb-2 text-muted-foreground">Pending Liability</h3>
                <div className="text-fluid-display font-bold flex items-center gap-2 text-amber-500">
                  <Icon name="attach_money" size={32}/>
                  {pendingLiability.toFixed(2)}
                </div>
                <p className="text-fluid-xs mt-2 text-muted-foreground">Total pending reimbursements (in USD)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6 lg:p-8">
                <h3 className="text-base mb-4 text-foreground font-semibold">Expenses by Category</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {categoryTotals.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Approved & Waiting for Reimbursement Table */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-foreground">Ready for Reimbursement</h3>
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              <Icon name="download" size={16}/> Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {approvedQueue.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">No approved expenses waiting for reimbursement.</div>
            ) : (
              approvedQueue.map(exp => {
                const emp = employees.find(e => e.id === exp.employeeId)
                return (
                  <Card key={exp.id} className="relative overflow-hidden border-border/80 hover:border-primary/50 transition-colors">
                    <div className="h-2 w-full bg-primary absolute top-0 left-0" />
                    <div className="p-4 pt-5 flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 shrink-0 ring-1 ring-border">
                            {emp?.avatar ? <AvatarImage src={emp.avatar} alt={emp?.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={20}/></AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-base leading-tight">{emp?.name}</span>
                            <span className="text-xs text-muted-foreground">{exp.id}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          Approved
                        </Badge>
                      </div>

                      {/* Body */}
                      <div className="flex justify-between items-end bg-muted/20 p-3 rounded-lg text-sm border border-border/50">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{exp.category}</span>
                          <span className="font-sans text-fluid-xl font-bold mt-0.5 text-foreground">{exp.currency} {exp.amount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Actions Track */}
                      {(exp.approvedBy || exp.rejectedBy || exp.reimbursedBy) && (
                        <div className="pt-1 flex flex-col gap-1 text-[11px] text-muted-foreground font-medium">
                          {exp.approvedBy && <span>Approved by {exp.approvedBy}</span>}
                          {exp.rejectedBy && <span className="text-destructive">Rejected by {exp.rejectedBy}</span>}
                          {exp.reimbursedBy && <span className="text-blue-500">Reimbursed by {exp.reimbursedBy} {exp.transactionRef ? `(Ref: ${exp.transactionRef})` : ''}</span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-1">
                        <Button variant="default" className="w-full" onClick={() => handleMarkReimbursed(exp.id)}>
                          <Icon name="attach_money" className="mr-2 h-4 w-4" size={16}/> Mark as Reimbursed
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'my-claims' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2"><Icon name="list" className="text-foreground" size={20}/> My Expense History</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {myClaimsQueue.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">No claims submitted yet.</div>
            ) : (
              myClaimsQueue.map(exp => {
                const isOverLimit = policies[exp.category] && (exp.usdAmount || (exp.amount * exchangeRates[exp.currency])) > policies[exp.category]
                return (
                  <Card key={exp.id} className={`relative overflow-hidden border-border/80 hover:border-primary/50 transition-colors ${isOverLimit ? 'border-destructive/50' : ''}`}>
                    <div className="h-2 w-full bg-primary absolute top-0 left-0" />
                    <div className="p-4 pt-5 flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base leading-tight">{exp.category}</span>
                          <span className="text-xs text-muted-foreground">{exp.id}</span>
                        </div>
                        <Badge variant="outline" className={exp.status === 'Approved' ? 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20' : exp.status === 'Rejected' ? 'bg-black/15 dark:bg-white/20 text-foreground border-black/20 dark:border-white/25' : exp.status === 'Reimbursed' ? 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20' : 'bg-muted/50 text-foreground'}>
                          {exp.status}
                        </Badge>
                      </div>

                      {/* Body */}
                      <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg text-sm border border-border/50">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Amount</span>
                          <span className="font-sans text-fluid-lg font-bold text-foreground">{exp.currency} {exp.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Date</span>
                          <span className="font-sans text-sm mt-1">{exp.date}</span>
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          "{exp.description}"
                        </div>
                        {exp.rejectReason && (
                           <div className="col-span-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
                             <strong>Rejection Reason:</strong> {exp.rejectReason}
                           </div>
                        )}
                      </div>
                      
                      {/* Actions Track */}
                      {(exp.approvedBy || exp.rejectedBy || exp.reimbursedBy) && (
                        <div className="pt-1 flex flex-col gap-1 text-[11px] text-muted-foreground font-medium">
                          {exp.approvedBy && <span>Approved by {exp.approvedBy}</span>}
                          {exp.rejectedBy && <span>Rejected by {exp.rejectedBy}</span>}
                          {exp.reimbursedBy && <span>Reimbursed by {exp.reimbursedBy} {exp.transactionRef ? `(Ref: ${exp.transactionRef})` : ''}</span>}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'history' && (canApprove || canReimburse) && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2"><Icon name="history" className="text-foreground" size={20}/> Company Expense History</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {historyQueue.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">No historical expenses found.</div>
            ) : (
              historyQueue.map(exp => {
                const emp = employees.find(e => e.id === exp.employeeId)
                return (
                  <Card key={exp.id} className="relative overflow-hidden border-border/80 hover:border-primary/50 transition-colors">
                    <div className="h-2 w-full bg-primary absolute top-0 left-0" />
                    <div className="p-4 pt-5 flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 shrink-0 ring-1 ring-border">
                            {emp?.avatar ? <AvatarImage src={emp.avatar} alt={emp?.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={20}/></AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-base leading-tight">{emp?.name}</span>
                            <span className="text-xs text-muted-foreground">{exp.id}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={exp.status === 'Approved' ? 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20' : exp.status === 'Rejected' ? 'bg-black/15 dark:bg-white/20 text-foreground border-black/20 dark:border-white/25' : exp.status === 'Reimbursed' ? 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20' : 'bg-muted/50 text-foreground'}>
                          {exp.status}
                        </Badge>
                      </div>

                      {/* Body */}
                      <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg text-sm border border-border/50">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{exp.category}</span>
                          <span className="font-sans text-fluid-xl font-bold mt-0.5 text-foreground">{exp.currency} {exp.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Date</span>
                          <span className="font-sans text-sm mt-1">{exp.date}</span>
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          "{exp.description}"
                        </div>
                        {exp.rejectReason && (
                           <div className="col-span-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
                             <strong>Rejection Reason:</strong> {exp.rejectReason}
                           </div>
                        )}
                      </div>

                      {/* Actions Track */}
                      {(exp.approvedBy || exp.rejectedBy || exp.reimbursedBy) && (
                        <div className="pt-1 flex flex-col gap-1 text-[11px] text-muted-foreground font-medium">
                          {exp.approvedBy && <span>Approved by {exp.approvedBy}</span>}
                          {exp.rejectedBy && <span className="text-destructive">Rejected by {exp.rejectedBy}</span>}
                          {exp.reimbursedBy && <span className="text-blue-500">Reimbursed by {exp.reimbursedBy} {exp.transactionRef ? `(Ref: ${exp.transactionRef})` : ''}</span>}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      <Dialog open={rejectReasonModal.open} onOpenChange={(open) => { if (!open) setRejectReasonModal({ open: false, id: null, reason: '' }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <textarea
            value={rejectReasonModal.reason}
            onChange={e => setRejectReasonModal(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Provide a reason for rejection..."
            rows={4}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs sm:text-sm font-medium shadow-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectReasonModal({ open: false, id: null, reason: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <Icon name="check" className="text-emerald-600 dark:text-emerald-400" size={24}/>
            </div>
            <DialogTitle className="text-xl">Expense Submitted!</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-muted-foreground text-sm">
            Your expense claim has been successfully submitted and is now pending manager approval.
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 sm:space-x-0">
            <Button variant="outline" className="w-full sm:flex-1" onClick={() => {
              setShowSuccessDialog(false);
              if (canApprove) setActiveTab('approve');
            }}>
              Close
            </Button>
            <Button variant="default" className="w-full sm:flex-1" onClick={() => setShowSuccessDialog(false)}>
              Submit Another
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AdSlot />
    </div>
  )
}
