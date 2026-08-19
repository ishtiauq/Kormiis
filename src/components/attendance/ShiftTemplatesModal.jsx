import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export const SHIFT_COLOR_PALETTE = ['#3b82f6', '#1e293b', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316']

export default function ShiftTemplatesModal({ open, onOpenChange, shiftTemplates = [], setShiftTemplates, addToast }) {
  const update = (id, patch) => setShiftTemplates(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))

  const addShift = () => {
    setShiftTemplates(prev => [...prev, { id: `st-${Date.now()}`, name: 'New Shift', start: '09:00', end: '17:00', break: 60, color: SHIFT_COLOR_PALETTE[prev.length % SHIFT_COLOR_PALETTE.length] }])
    if (addToast) addToast('Shift template added.', 'success')
  }

  const removeShift = (id) => {
    setShiftTemplates(prev => prev.filter(x => x.id !== id))
    if (addToast) addToast('Shift template removed.', 'info')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <DialogTitle className="flex items-center gap-2">
                <Icon name="calendar_clock" size={18} className="text-muted-foreground" /> Shift Templates
              </DialogTitle>
              <DialogDescription>Add, edit or remove the shifts used in the weekly roster.</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addShift}>
              <Icon name="add" className="mr-1.5 h-4 w-4" size={16} /> Add Shift
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-1">
          {shiftTemplates.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <Icon name="calendar_clock" size={28} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground m-0">No shift templates yet. Add one to start planning rosters.</p>
            </div>
          ) : (
            shiftTemplates.map((t, i) => (
              <div key={t.id} className="flex flex-wrap gap-3 items-end p-3.5 bg-muted/30 border border-border rounded-xl" style={{ borderLeft: `4px solid ${t.color || SHIFT_COLOR_PALETTE[i % SHIFT_COLOR_PALETTE.length]}` }}>
                <div className="flex-1 min-w-[130px] flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Shift Name</label>
                  <Input value={t.name} onChange={e => update(t.id, { name: e.target.value })} placeholder="e.g. Morning Shift" />
                </div>
                <div className="w-[104px] flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Start</label>
                  <Input type="time" value={t.start} onChange={e => update(t.id, { start: e.target.value })} />
                </div>
                <div className="w-[104px] flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">End</label>
                  <Input type="time" value={t.end} onChange={e => update(t.id, { end: e.target.value })} />
                </div>
                <div className="w-[88px] flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Break (m)</label>
                  <Input type="number" min="0" value={t.break} onChange={e => update(t.id, { break: parseInt(e.target.value) || 0 })} />
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => removeShift(t.id)} aria-label={`Delete ${t.name}`}>
                  <Icon name="delete" className="h-4 w-4" size={16} />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}