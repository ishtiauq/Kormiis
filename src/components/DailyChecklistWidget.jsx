import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Icon from "@/components/ui/Icon.jsx"

export default function DailyChecklistWidget({ notes = [], setNotes, ownerId = '', cardClass = '' }) {
  // Find the most recently updated note that is marked as a daily checklist and is a list type
  const dailyChecklists = notes.filter(n => (n.ownerId === ownerId || !n.ownerId) && n.type === 'list' && n.isDailyChecklist)
  // Sort by updatedAt descending
  dailyChecklists.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  
  const checklistNote = dailyChecklists.length > 0 ? dailyChecklists[0] : null

  const handleToggleItem = (itemId) => {
    if (!checklistNote) return
    const updatedItems = checklistNote.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    const updatedNote = { ...checklistNote, items: updatedItems, updatedAt: new Date().toISOString() }
    
    // Update the global notes array
    const newNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n)
    if (setNotes) setNotes(newNotes)
  }

  return (
    <Card className={`flex flex-col p-0 h-full ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0">
        <div className="flex items-center gap-3">
          <Icon name="task_alt" className="text-primary shrink-0" size={26}/>
          <CardTitle className="text-fluid-lg font-bold text-foreground m-0">
            {checklistNote?.title || "Daily Checklist"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 sm:p-5 flex flex-col pt-0">
        {!checklistNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <Icon name="fact_check" className="text-muted-foreground/30 mb-3" size={44}/>
            <p className="text-fluid-sm text-muted-foreground font-medium mb-1">No Daily Checklist</p>
            <p className="text-fluid-xs text-muted-foreground/70 max-w-[200px] m-0">Create a Checklist Note and mark it as 'Daily Checklist' to see it here.</p>
          </div>
        ) : checklistNote.items?.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            This checklist is empty.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {checklistNote.items.map(item => (
              <div 
                key={item.id} 
                className="flex items-start gap-3 p-2.5 px-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.08] cursor-pointer transition-all group active:scale-[0.99] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none"
                onClick={() => handleToggleItem(item.id)}
              >
                <div className={`mt-0.5 flex-shrink-0 size-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${item.done ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-105' : 'border-foreground/30 text-transparent group-hover:border-primary/50'}`}>
                  <Icon name="check" className={item.done ? 'opacity-100' : 'opacity-0'} size={14}/>
                </div>
                <span className={`text-sm leading-relaxed transition-all duration-200 ${item.done ? 'text-muted-foreground line-through opacity-70' : 'text-foreground font-medium'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
