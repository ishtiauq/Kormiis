import { useShiftSwaps } from '../../hooks/useShiftSwaps.js'
import { formatDateShort } from '../../services/date.js'
import { Check, X, Repeat } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ShiftSwaps({ employees, shiftSwaps, setShiftSwaps, roster, setRoster, addToast }) {
  const { pendingSwaps, approveSwap, rejectSwap } = useShiftSwaps(shiftSwaps, setShiftSwaps, roster, setRoster, addToast)

  if (pendingSwaps.length === 0) return null

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        <h3 className="text-base font-bold m-0 text-foreground">Pending Shift Swaps ({pendingSwaps.length})</h3>
        {pendingSwaps.map(swap => {
          const r = employees.find(e => e.id === swap.requesterId)
          const t = employees.find(e => e.id === swap.targetId)
          return (
            <div key={swap.id} className="flex justify-between items-center flex-wrap gap-3 p-4 rounded-xl border border-border bg-card">
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs font-medium text-muted-foreground mb-1">{formatDateShort(swap.date)}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{r?.name}</span>
                  <Repeat size={14} className="opacity-60 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{t?.name}</span>
                </div>
                {swap.reason && <div className="text-xs text-muted-foreground mt-1">Reason: {swap.reason}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approveSwap(swap.id)}>
                  <Check size={13} /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:text-destructive" onClick={() => rejectSwap(swap.id)}>
                  <X size={13} /> Reject
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
