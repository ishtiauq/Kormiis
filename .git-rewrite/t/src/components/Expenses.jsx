import { useState, useRef, useMemo } from 'react'
import { Receipt, Plus, Upload, Check, X as XIcon, Clock, DollarSign, Filter, Search, Download, AlertTriangle, PieChart as PieChartIcon, User } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Select, SelectItem } from "@/components/ui/select"
import AdSlot from './AdSlot'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Expenses({ employees, expenses, setExpenses, settings, addLog, addToast, addAuditLog, simulatedRole }) {
  const [activeTab, setActiveTab] = useState('submit')

  // Employee Submission States
  const [category, setCategory] = useState('Travel')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [receiptBase64, setReceiptBase64] = useState(null)

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

    const newExpense = {
      id: `EXP-${Date.now()}`,
      employeeId: 'EMP-101',
      category,
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
    addAuditLog('CREATE', 'Expense', `Submitted ${currency} ${amount} for ${category}`)
    addToast('Expense submitted for approval.', 'success')

    setAmount('')
    setDescription('')
    setDate('')
    setReceiptBase64(null)
  }

  const handleApprove = (id) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: 'Approved' } : exp))
    addToast('Expense approved.', 'success')
    addAuditLog('UPDATE', 'Expense', `Approved expense ${id}`)
  }

  const handleReject = () => {
    setExpenses(prev => prev.map(exp => exp.id === rejectReasonModal.id ? { ...exp, status: 'Rejected', rejectReason: rejectReasonModal.reason } : exp))
    addToast('Expense rejected.', 'success')
    addAuditLog('UPDATE', 'Expense', `Rejected expense ${rejectReasonModal.id}`)
    setRejectReasonModal({ open: false, id: null, reason: '' })
  }

  const handleBulkApprove = () => {
    setExpenses(prev => prev.map(exp => selectedExpenses.includes(exp.id) ? { ...exp, status: 'Approved' } : exp))
    setSelectedExpenses([])
    addToast(`${selectedExpenses.length} expenses approved.`, 'success')
    addAuditLog('UPDATE', 'Expense', `Bulk approved ${selectedExpenses.length} expenses`)
  }

  const handleToggleSelect = (id) => {
    setSelectedExpenses(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleMarkReimbursed = (id) => {
    const ref = prompt("Enter bank transaction reference:")
    if (ref) {
      setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: 'Reimbursed', transactionRef: ref } : exp))
      addToast('Expense marked as reimbursed.', 'success')
      addAuditLog('UPDATE', 'Expense', `Reimbursed expense ${id} (Ref: ${ref})`)
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

  const canApprove = ['Admin', 'HR Manager'].includes(simulatedRole)
  const canReimburse = ['Admin', 'Payroll Manager'].includes(simulatedRole)

  return (
    <div className="animate-fade-in flex flex-col gap-4 sm:gap-6 lg:gap-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Receipt size={20} className="text-primary" />
          Expenses
        </h1>
        <div className="flex gap-3">
          <Button variant={activeTab === 'submit' ? 'default' : 'secondary'} size="sm" aria-label="Submit expense" onClick={() => setActiveTab('submit')}>
            <Plus size={16} /> Submit
          </Button>
          {canApprove && (
            <Button variant={activeTab === 'approve' ? 'default' : 'secondary'} size="sm" aria-label="Approvals" onClick={() => setActiveTab('approve')}>
              <Clock size={16} /> Approvals
              {pendingQueue.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingQueue.length}</Badge>
              )}
            </Button>
          )}
          {canReimburse && (
            <Button variant={activeTab === 'finance' ? 'default' : 'secondary'} size="sm" aria-label="Finance" onClick={() => setActiveTab('finance')}>
              <PieChartIcon size={16} /> Finance
            </Button>
          )}
        </div>
      </div>
      <div className="border-t border-border" />

      {/* Tabs Content */}
      {activeTab === 'submit' && (
        <Card className="max-w-[600px]">
          <CardContent className="p-8">
            <h3 className="text-xl mb-6 flex items-center gap-2 text-foreground">
              <Receipt size={20} className="text-primary" />
              New Expense Claim
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <Select label="Category" value={category} onChange={setCategory}>
                    {expenseCategories.map(c => <SelectItem key={c} id={c}>{c}</SelectItem>)}
                  </Select>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Date</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required aria-label="Expense date" />
                </div>
              </div>

              <div className="flex gap-4">
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
                  {receiptBase64 ? (
                    <img src={receiptBase64} alt="Receipt" className="max-h-[100px] rounded-lg object-contain" />
                  ) : (
                    <>
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload receipt</span>
                    </>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-3 justify-center">
                Submit for Approval
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'approve' && canApprove && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-foreground">Approval Queue</h3>
            {selectedExpenses.length > 0 && (
              <Button variant="default" size="sm" onClick={handleBulkApprove}>
                <Check size={16} /> Bulk Approve ({selectedExpenses.length})
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-4"><input type="checkbox" aria-label="Select all" onChange={(e) => setSelectedExpenses(e.target.checked ? pendingQueue.map(q => q.id) : [])} checked={selectedExpenses.length === pendingQueue.length && pendingQueue.length > 0} /></TableHead>
                      <TableHead className="p-4">Employee</TableHead>
                      <TableHead className="p-4">Details</TableHead>
                      <TableHead className="p-4">Amount</TableHead>
                      <TableHead className="p-4">Receipt</TableHead>
                      <TableHead className="p-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingQueue.length === 0 ? (
                      <TableRow><TableCell colSpan="6" className="p-8 text-center text-muted-foreground">No pending expenses.</TableCell></TableRow>
                    ) : (
                      pendingQueue.map(exp => {
                        const emp = employees.find(e => e.id === exp.employeeId)
                        const isOverLimit = policies[exp.category] && (exp.usdAmount || (exp.amount * exchangeRates[exp.currency])) > policies[exp.category]

                        return (
                          <TableRow key={exp.id}>
                            <TableCell className="p-4"><input type="checkbox" checked={selectedExpenses.includes(exp.id)} onChange={() => handleToggleSelect(exp.id)} /></TableCell>
                            <TableCell className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 shrink-0">
                                  {emp?.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                                  <AvatarFallback className="bg-primary/10 text-primary"><User size={16} /></AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-sm text-foreground">{emp?.name}</div>
                                  <div className="text-xs text-muted-foreground">{exp.id}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-4">
                              <div className="font-semibold text-[0.9rem] text-foreground">{exp.category}</div>
                              <div className="text-[0.8rem] text-muted-foreground">{exp.date} • {exp.description}</div>
                            </TableCell>
                            <TableCell className="p-4">
                              <div className="font-bold text-[0.95rem] text-foreground">{exp.currency} {exp.amount.toFixed(2)}</div>
                              {isOverLimit && (
                                <div className="flex items-center gap-1 text-amber-500 text-[0.75rem] mt-1">
                                  <AlertTriangle size={12} /> Over limit (${policies[exp.category]})
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="p-4">
                              {exp.receipt ? (
                                <img src={exp.receipt} alt="Receipt" className="w-10 h-10 rounded-md object-cover border border-border" />
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell className="p-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="icon-xs" aria-label="Approve" onClick={() => handleApprove(exp.id)} className="text-emerald-500 hover:text-emerald-600" title="Approve">
                                  <Check size={16} />
                                </Button>
                                <Button variant="ghost" size="icon-xs" aria-label="Reject" onClick={() => setRejectReasonModal({ open: true, id: exp.id, reason: '' })} className="text-destructive hover:text-destructive" title="Reject">
                                  <XIcon size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'finance' && canReimburse && (
        <div className="flex flex-col gap-6">
          {/* Finance Metrics */}
          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            <Card>
              <CardContent className="p-6 flex flex-col justify-center">
                <h3 className="text-sm mb-2 text-muted-foreground">Pending Liability</h3>
                <div className="text-4xl font-bold flex items-center gap-2 text-amber-500">
                  <DollarSign size={32} />
                  {pendingLiability.toFixed(2)}
                </div>
                <p className="text-xs mt-2 text-muted-foreground">Total pending reimbursements (in USD)</p>
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
              <Download size={16} /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-4">Employee</TableHead>
                      <TableHead className="p-4">Category</TableHead>
                      <TableHead className="p-4">Amount</TableHead>
                      <TableHead className="p-4">Status</TableHead>
                      <TableHead className="p-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedQueue.length === 0 ? (
                      <TableRow><TableCell colSpan="5" className="p-8 text-center text-muted-foreground">No approved expenses waiting for reimbursement.</TableCell></TableRow>
                    ) : (
                      approvedQueue.map(exp => {
                        const emp = employees.find(e => e.id === exp.employeeId)
                        return (
                          <TableRow key={exp.id}>
                            <TableCell className="p-4">
                              <div className="font-semibold text-sm text-foreground">{emp?.name}</div>
                              <div className="text-xs text-muted-foreground">{exp.id}</div>
                            </TableCell>
                            <TableCell className="p-4 text-sm text-foreground">{exp.category}</TableCell>
                            <TableCell className="p-4 font-semibold text-foreground">{exp.currency} {exp.amount.toFixed(2)}</TableCell>
                            <TableCell className="p-4">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-0">Approved</Badge>
                            </TableCell>
                            <TableCell className="p-4 text-right">
                              <Button variant="default" size="sm" className="text-xs" onClick={() => handleMarkReimbursed(exp.id)}>
                                Mark Reimbursed
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
      <AdSlot />
    </div>
  )
}
