import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Icon from "@/components/ui/Icon.jsx"

export default function DailyChecklistWidget({ notes = [], setNotes, ownerId = '', setCurrentView, cardClass = '' }) {
  // Find the most recently updated note that is marked as a daily checklist and is a list type
  const dailyChecklists = notes.filter(n => (n.ownerId === ownerId || !n.ownerId) && n.type === 'list' && n.isDailyChecklist)
  // Sort by updatedAt descending
  dailyChecklists.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  
  const checklistNote = dailyChecklists.length > 0 ? dailyChecklists[0] : null
  const totalItems = checklistNote?.items?.length || 0
  const completedItems = checklistNote?.items?.filter(i => i.done)?.length || 0
  const progressRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const handleToggleItem = (itemId) => {
    if (!checklistNote) return
    const updatedItems = checklistNote.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    const updatedNote = { ...checklistNote, items: updatedItems, updatedAt: new Date().toISOString() }
    
    // Update the global notes array
    const newNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n)
    if (setNotes) setNotes(newNotes)
  }

  return (
    <Card className={`flex flex-col p-0 h-full dashboard-widget ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-foreground">
            <Icon name="task_alt" className="text-primary shrink-0" size={22}/>
          </div>
          <CardTitle className="text-fluid font-bold tracking-tight text-foreground m-0 leading-snug break-words">
            {checklistNote?.title || "Daily Checklist"}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <Badge 
              variant="outline" 
              className={`text-xs font-bold rounded-full px-2.5 py-0.5 border ${
                completedItems === totalItems 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
            >
              {completedItems}/{totalItems}
            </Badge>
          )}
          <button 
            onClick={() => setCurrentView && setCurrentView('notes')} 
            className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer"
          >
            Notes
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 sm:p-5 flex flex-col justify-between pt-0">
        {!checklistNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <Icon name="fact_check" className="text-muted-foreground/30 mb-3" size={40}/>
            <p className="text-fluid-sm text-muted-foreground font-medium mb-1">No Daily Checklist</p>
            <p className="text-fluid-xs text-muted-foreground/70 max-w-[220px] m-0">Create a checklist note and mark it as 'Daily Checklist' to pin it here.</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-6">
            This checklist is empty.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 py-1">
            {checklistNote.items.map(item => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-2.5 px-3 rounded-2xl liquid-widget-item cursor-pointer group active:scale-[0.99]"
                onClick={() => handleToggleItem(item.id)}
              >
                <div className={`flex-shrink-0 size-5 rounded-xl border flex items-center justify-center transition-all duration-200 ${item.done ? 'bg-primary border-primary text-white shadow-xs scale-105' : 'border-foreground/30 text-transparent group-hover:border-primary/60 bg-white/40 dark:bg-white/[0.04]'}`}>
                  <Icon name="check" className={item.done ? 'opacity-100' : 'opacity-0'} size={14}/>
                </div>
                <span className={`text-sm leading-snug flex-1 transition-all duration-200 ${item.done ? 'text-muted-foreground line-through opacity-70' : 'text-foreground font-medium'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalItems > 0 && (
          <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>Progress</span>
              <span className="font-bold text-foreground tabular-nums">{progressRate}%</span>
            </div>
            <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-1.5 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-primary to-amber-500 h-full rounded-full transition-all duration-500 shadow-xs" 
                style={{ width: `${progressRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
