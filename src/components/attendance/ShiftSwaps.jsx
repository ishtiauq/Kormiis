import { useShiftSwaps } from '../../hooks/useShiftSwaps.js'
import { formatDateShort } from '../../services/date.js'
import { generateShiftSwapMessage, queueWhatsAppMessages } from '../../services/whatsappService.js'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ShiftSwaps({ employees, shiftSwaps, setShiftSwaps, roster, setRoster, addToast, settings }) {
  const { pendingSwaps, approveSwap, rejectSwap } = useShiftSwaps(shiftSwaps, setShiftSwaps, roster, setRoster, addToast)

  const notifySwapWhatsApp = (swap, status) => {
    const r = employees.find(e => e.id === swap.requesterId)
    if (!settings?.whatsapp?.enabled || !settings?.whatsapp?.notifyShiftSwap || !r?.phone) return
    const message = generateShiftSwapMessage({
      employeeName: r.name,
      companyName: settings?.company?.name || 'Kormiis HR',
      date: formatDateShort(swap.date),
      status,
      reason: swap.reason
    })
    queueWhatsAppMessages({
      items: [{ phone: r.phone, employeeName: r.name, event: 'shift_swap', message }]
    }).catch(() => {})
  }

  const handleApprove = (swap) => {
    approveSwap(swap.id)
    notifySwapWhatsApp(swap, 'Approved')
  }

  const handleReject = (swap) => {
    rejectSwap(swap.id)
    notifySwapWhatsApp(swap, 'Rejected')
  }

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
                  <Icon name="repeat" className="opacity-60 text-muted-foreground" size={14}/>
                  <span className="text-sm font-semibold text-foreground">{t?.name}</span>
                </div>
                {swap.reason && <div className="text-xs text-muted-foreground mt-1">Reason: {swap.reason}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(swap)}>
                  <Icon name="check" size={13}/> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:text-destructive" onClick={() => handleReject(swap)}>
                  <Icon name="close" size={13}/> Reject
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}