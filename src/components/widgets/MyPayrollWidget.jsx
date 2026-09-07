import { memo, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'

export const MyPayrollWidget = memo(({
  currentUser,
  payroll,
  expenses = [],
  settings,
  setCurrentView,
  addToast,
  cardClass = '',
  ...wProps
}) => {
  const currency = settings?.currency || '৳'
  const empId = currentUser?.employeeId || currentUser?.id

  // Extract all payslips belonging to this employee
  const myPayslips = useMemo(() => {
    if (!payroll || typeof payroll !== 'object') return []
    if (Array.isArray(payroll.history)) {
      return payroll.history
        .filter(p => p && (p.employeeId === empId || p.employeeName === currentUser?.name))
        .sort((a, b) => new Date(b.date || b.paymentDate || b.period || 0) - new Date(a.date || a.paymentDate || a.period || 0))
    }
    const list = []
    Object.entries(payroll).forEach(([monthKey, records]) => {
      const arr = Array.isArray(records) 
        ? records 
        : (Array.isArray(records?.records) ? records.records : (Array.isArray(records?.entries) ? records.entries : []))
      arr.forEach(rec => {
        if (rec && (rec.employeeId === empId || rec.employeeName === currentUser?.name)) {
          list.push({ ...rec, date: rec.paymentDate || rec.date || monthKey, month: monthKey })
        }
      })
    })
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [payroll, empId, currentUser?.name])

  // Latest payslip (most recent)
  const latestSlip = myPayslips[0] || null

  // Fallback values from user profile if no payroll record has been finalized yet
  const grossSalary = Number(latestSlip?.gross || latestSlip?.grossSalary || currentUser?.salary || 0)
  const totalDeductions = Number(latestSlip?.deductions || 0)
  const netSalary = latestSlip?.net !== undefined 
    ? Number(latestSlip.net) 
    : (latestSlip?.netSalary !== undefined ? Number(latestSlip.netSalary) : (grossSalary - totalDeductions))
  const paymentStatus = latestSlip?.status || (latestSlip ? 'Paid' : 'Pending')

  // Expense claims summary
  const myPendingExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return 0
    return expenses.filter(e => 
      e && (e.employeeId === empId || e.submittedBy === empId || e.claimant === currentUser?.name) && 
      e.status === 'Pending'
    ).length
  }, [expenses, empId, currentUser?.name])

  // Compute dynamic salary breakdown according to global settings structure
  const structure = settings?.salaryStructure || [
    { id: 'basic', name: 'Basic Salary', percentage: 50, type: 'earning' },
    { id: 'hra', name: 'House Rent (HRA)', percentage: 25, type: 'earning' },
    { id: 'medical', name: 'Medical Allowance', percentage: 10, type: 'earning' },
    { id: 'conveyance', name: 'Conveyance', percentage: 10, type: 'earning' },
    { id: 'pf', name: 'Provident Fund (PF)', percentage: 5, type: 'deduction' }
  ]

  const breakdownComponents = useMemo(() => {
    if (grossSalary <= 0) return []
    return structure.map(item => {
      const amount = Math.round(grossSalary * (Number(item.percentage || 0) / 100))
      return {
        id: item.id || item.name,
        name: item.name,
        type: item.type, // 'earning' | 'deduction'
        percentage: item.percentage,
        amount
      }
    })
  }, [structure, grossSalary])

  // PDF Download Handler
  const handleDownloadPDF = async (e) => {
    e?.stopPropagation()
    if (!latestSlip && !currentUser?.salary) {
      addToast?.('No payslip available to download yet.', 'info')
      return
    }

    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      const companyName = settings?.company?.name || 'Kormiis'
      const companyLogo = settings?.company?.logo
      const pdfCurrency = settings?.currency || '৳'
      const slipDate = latestSlip?.date || latestSlip?.month || new Date().toISOString().slice(0, 7)

      let startY = 20
      if (companyLogo) {
        try {
          let format = 'PNG'
          if (companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')) format = 'JPEG'
          else if (companyLogo.startsWith('data:image/webp')) format = 'WEBP'
          doc.addImage(companyLogo, format, 14, 14, 18, 18)
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(20, 20, 20)
          doc.text(companyName.toUpperCase(), 36, 21)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(`OFFICIAL PAYSLIP • ${slipDate}`, 36, 28)
          startY = 38
        } catch {
          doc.setFontSize(18)
          doc.setFont('helvetica', 'bold')
          doc.text(`${companyName.toUpperCase()} — PAYSLIP`, 14, 22)
          startY = 32
        }
      } else {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(`${companyName.toUpperCase()} — PAYSLIP`, 14, 22)
        startY = 32
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 40, 40)
      doc.text(`Employee Name: ${currentUser.name}`, 14, startY)
      doc.text(`Designation: ${currentUser.designation || currentUser.role || 'Team Member'}`, 14, startY + 6)
      doc.text(`Period / Date: ${slipDate}`, 14, startY + 12)

      const tableRows = [
        ['Gross Salary', `${pdfCurrency} ${grossSalary.toFixed(2)}`],
        ...breakdownComponents.map(c => [
          `${c.name} (${c.percentage}%)`,
          `${c.type === 'deduction' ? '-' : ''}${pdfCurrency} ${c.amount.toFixed(2)}`
        ]),
        ['Net Disbursed Salary', `${pdfCurrency} ${netSalary.toFixed(2)}`]
      ]

      autoTable(doc, {
        startY: startY + 18,
        head: [['Component', 'Amount']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      })

      doc.save(`Payslip_${currentUser.name}_${slipDate}.pdf`)
      addToast?.('Payslip PDF downloaded successfully', 'success')
    } catch (err) {
      console.error(err)
      addToast?.('Failed to generate PDF', 'error')
    }
  }

  return (
    <DashboardWidget
      id="w5-employee"
      title="Payroll"
      icon={<Icon name="account_balance" className="text-emerald-500 shrink-0" size={22} />}
      cardClass={cardClass}
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setCurrentView && setCurrentView('payslips')}
            className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
          >
            All Slips
          </button>
        </div>
      }
      contentClass="flex flex-col justify-between pt-1 min-h-0"
      {...wProps}
    >
      <div className="flex flex-col gap-3 py-1">
        {/* 1. Primary Take-Home Pay Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {latestSlip ? `Net Salary (${latestSlip.date || latestSlip.month})` : 'Net Monthly Salary'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-fluid-xl sm:text-fluid-2xl font-black tabular-nums font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
                {currency}{netSalary.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
            <Badge
              variant={paymentStatus === 'Paid' ? 'default' : 'secondary'}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                paymentStatus === 'Paid'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
              }`}
            >
              {paymentStatus}
            </Badge>

            {/* Quick PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Download latest payslip as PDF"
            >
              <Icon name="download" size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>PDF Slip</span>
            </button>
          </div>
        </div>

        {/* 2. Salary Breakdown (Component percentages & amounts configured in settings) */}
        <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
          <div className="flex items-center justify-between pb-1 px-0.5 border-b border-black/5 dark:border-white/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Salary Breakdown</span>
            <span className="text-[10px] font-bold text-foreground font-mono">Gross: {currency}{grossSalary.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {breakdownComponents.length > 0 ? (
              breakdownComponents.slice(0, 4).map(comp => (
                <div key={comp.id} className="flex flex-col p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-semibold text-muted-foreground truncate">{comp.name}</span>
                  <span className={`text-xs font-bold font-mono tabular-nums ${comp.type === 'deduction' ? 'text-destructive' : 'text-foreground'}`}>
                    {comp.type === 'deduction' ? '-' : ''}{currency}{comp.amount.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="flex flex-col p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-semibold text-muted-foreground">Basic (50%)</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                    {currency}{(grossSalary * 0.5).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-semibold text-muted-foreground">Allowances</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                    {currency}{(grossSalary * 0.45).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-semibold text-muted-foreground">Deductions</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-destructive">
                    -{currency}{(grossSalary * 0.05).toLocaleString()}
                  </span>
                </div>
              </>
            )}

            {/* Expense Claim Status Pill */}
            <div 
              onClick={() => setCurrentView && setCurrentView('expenses')}
              className="flex flex-col p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-[10px] font-semibold text-muted-foreground truncate">Expenses</span>
              <span className="text-xs font-bold text-foreground truncate">
                {myPendingExpenses > 0 ? `${myPendingExpenses} Pending` : 'All Settled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
})

MyPayrollWidget.displayName = 'MyPayrollWidget'

