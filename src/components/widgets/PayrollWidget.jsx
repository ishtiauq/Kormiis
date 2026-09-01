import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { DashboardWidget } from '../Dashboard.jsx'

export const PayrollWidget = memo(({ currentPayrollMonth, paidCount, pendingCount, totalPayrollCost, settings, currentPayrollData, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="w5"
    title="Payroll Summary"
    icon={<Icon name="account_balance" className="text-emerald-500 shrink-0" size={22}/>}
    action={
      <button 
        onClick={() => setCurrentView && setCurrentView('payroll')} 
        className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-emerald-500 hover:text-emerald-600 cursor-pointer"
      >
        Details
      </button>
    }
    contentClass="flex flex-col justify-center"
    {...wProps}
  >
    {!currentPayrollMonth ? (
      <p className="text-center my-auto text-fluid-xs text-muted-foreground">No payroll data found</p>
    ) : (
      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08]">
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
    )}
  </DashboardWidget>
))

PayrollWidget.displayName = 'PayrollWidget'