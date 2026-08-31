import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardWidget } from '../Dashboard.jsx'

export const PayrollWidget = memo(({ currentPayrollMonth, paidCount, pendingCount, totalPayrollCost, settings, currentPayrollData, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="w5"
    title="Payroll Summary"
    icon={<Icon name="account_balance" className="text-emerald-500 shrink-0" size={28}/>}
    action={currentPayrollMonth && <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full text-xs font-semibold">{currentPayrollMonth}</Badge>}
    contentClass="flex flex-col justify-between pt-4"
    {...wProps}
  >
    {!currentPayrollMonth ? (
      <p className="text-center my-auto text-fluid-xs text-muted-foreground">No payroll data found</p>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none">
          <div>
            <span className="block text-xs font-medium text-muted-foreground">Paid</span>
            <span className="text-fluid-xl font-black tabular-nums text-foreground mt-0.5 block">{paidCount}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted-foreground">Pending</span>
            <span className="text-fluid-xl font-black tabular-nums text-foreground mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="col-span-2 border-t border-border/80 dark:border-white/10 pt-2 mt-1">
            <span className="block text-xs font-medium text-muted-foreground">Total Payroll</span>
            <span className="text-fluid-xl font-black tabular-nums text-foreground mt-0.5 block">{settings?.currency || '$'}{totalPayrollCost.toLocaleString()}</span>
          </div>
        </div>
        <div className="mt-3 pt-3 flex justify-between items-center border-t border-border/80 dark:border-white/10">
          <span className="text-xs font-medium text-muted-foreground">{currentPayrollData.length} Employees</span>
          <button onClick={() => setCurrentView && setCurrentView('payroll')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">View</button>
        </div>
      </>
    )}
  </DashboardWidget>
))

PayrollWidget.displayName = 'PayrollWidget'