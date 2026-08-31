import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { DashboardWidget } from '../Dashboard.jsx'

export const AssetsWidget = memo(({ assets, availableAssetsCount, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="assets-widget"
    title="Asset Inventory"
    icon={<Icon name="devices_other" className="text-teal-500 shrink-0" size={28}/>}
    {...wProps}
    action={
      <button onClick={() => setCurrentView('assets')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-teal-500 hover:text-teal-600 cursor-pointer">
        Manage
      </button>
    }
  >
    <div className="flex flex-col h-full justify-between gap-3.5">
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-0.5">Total Assets</span>
          <span className="text-fluid-xl font-black text-foreground">{assets.length}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Available</span>
          <span className="text-base font-bold text-foreground">{availableAssetsCount}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Assigned</span>
          <span className="text-base font-bold text-foreground">{assets.length - availableAssetsCount}</span>
        </div>
      </div>
    </div>
  </DashboardWidget>
))

AssetsWidget.displayName = 'AssetsWidget'