import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { DashboardWidget } from '../Dashboard.jsx'

export const AssetsWidget = memo(({ assets = [], setCurrentView, ...wProps }) => {
  const totalCount = assets?.length || 0
  const maintenanceCount = assets?.filter(a => a.status === 'Under Repair' || a.status === 'Maintenance' || a.status === 'In Maintenance')?.length || 0
  const assignedCount = assets?.filter(a => a.status === 'Assigned')?.length || 0

  return (
    <DashboardWidget
      id="assets-widget"
      title="Asset Inventory"
      icon={<Icon name="devices_other" className="text-teal-500 shrink-0" size={22}/>}
      {...wProps}
      action={
        <button onClick={() => setCurrentView('assets')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-teal-500 hover:text-teal-600 cursor-pointer">
          Manage
        </button>
      }
    >
      <div className="flex flex-col h-full justify-between gap-3.5">
        <div className="flex items-center justify-between p-3.5 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total Assets</span>
            <span className="text-fluid-xl font-black text-foreground tabular-nums">{totalCount}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3.5 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Maintenance</span>
            <span className="text-base font-bold text-foreground tabular-nums">{maintenanceCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Assigned</span>
            <span className="text-base font-bold text-foreground tabular-nums">{assignedCount}</span>
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
})

AssetsWidget.displayName = 'AssetsWidget'