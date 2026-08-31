import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { formatDateShort } from '../../services/date.js'
import { DashboardWidget } from '../Dashboard.jsx'

export const DocumentsWidget = memo(({ recentDocuments, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="documents-widget"
    title="Recent Documents"
    icon={<Icon name="description" className="text-blue-500 shrink-0" size={28}/>}
    {...wProps}
    action={
      <button onClick={() => setCurrentView('documents')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-blue-500 hover:text-blue-600 cursor-pointer">
        View All
      </button>
    }
  >
    <div className="flex flex-col h-full gap-2.5">
      {recentDocuments.length > 0 ? recentDocuments.map((doc, i) => (
        <div key={i} className="flex flex-col gap-1 p-2.5 px-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.08] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-foreground break-words pr-2">{doc.name}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full px-2 py-0.5">{doc.category || 'Doc'}</Badge>
          </div>
          <span className="text-[11px] text-muted-foreground">Updated {formatDateShort(doc.uploadDate || doc.date || new Date().toISOString())}</span>
        </div>
      )) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-fluid-sm text-muted-foreground text-center m-0">No documents found.</p>
        </div>
      )}
    </div>
  </DashboardWidget>
))

DocumentsWidget.displayName = 'DocumentsWidget'