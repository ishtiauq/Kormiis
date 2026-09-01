import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { formatDateShort } from '../../services/date.js'
import { DashboardWidget } from '../Dashboard.jsx'

export const DocumentsWidget = memo(({ recentDocuments, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="documents-widget"
    title="Recent Documents"
    icon={<Icon name="description" className="text-blue-500 shrink-0" size={16}/>}
    {...wProps}
    action={
      <button onClick={() => setCurrentView('documents')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-blue-500 hover:text-blue-600 cursor-pointer">
        View All
      </button>
    }
  >
    <div className="flex flex-col h-full gap-2.5">
      {recentDocuments.length > 0 ? recentDocuments.map((doc, i) => (
        <div key={i} className="flex flex-col gap-1 p-2.5 px-3 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-foreground break-words pr-2">{doc.name}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full px-2 py-0.5">{doc.category || 'Doc'}</Badge>
          </div>
          <span className="text-[11px] text-muted-foreground">Updated {formatDateShort(doc.uploadDate || doc.date || new Date().toISOString())}</span>
        </div>
      )) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
          <Icon name="description" size={34} className="text-blue-500/40 dark:text-blue-500/50 mb-2 shrink-0" />
          <p className="m-0 text-fluid-sm font-medium text-muted-foreground max-w-[200px] leading-relaxed">No recent documents</p>
        </div>
      )}
    </div>
  </DashboardWidget>
))

DocumentsWidget.displayName = 'DocumentsWidget'