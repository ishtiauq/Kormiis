import { useOvertime } from '../../hooks/useOvertime.js'
import { formatDateShort } from '../../services/date.js'
import { generateOvertimeMessage, queueWhatsAppMessages } from '../../services/whatsappService.js'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

export default function OvertimeClaims({ employees, overtimeClaims, setOvertimeClaims, addToast, settings }) {
  const { pendingOvertime, historyOvertime, approveOvertime, rejectOvertime } = useOvertime(overtimeClaims, setOvertimeClaims, addToast)

  const notifyOvertimeWhatsApp = (claim, status) => {
    const emp = employees.find(e => e.id === claim.employeeId)
    if (!settings?.whatsapp?.enabled || !settings?.whatsapp?.notifyOvertime || !emp?.phone) return
    const message = generateOvertimeMessage({
      employeeName: emp.name,
      companyName: settings?.company?.name || 'Kormiis HR',
      date: formatDateShort(claim.date),
      hours: claim.hours,
      status,
      reason: claim.reason
    })
    queueWhatsAppMessages({
      items: [{ phone: emp.phone, employeeName: emp.name, event: 'overtime', message }]
    }).catch(() => {})
  }

  const handleApprove = (c) => {
    approveOvertime(c.id)
    notifyOvertimeWhatsApp(c, 'Approved')
  }

  const handleReject = (c) => {
    rejectOvertime(c.id)
    notifyOvertimeWhatsApp(c, 'Rejected')
  }

  const STATUS = {
    Approved: { bg: '#28a745', color: '#fff' },
    Rejected: { bg: '#dc3545', color: '#fff' },
    Pending: { bg: '#ffc107', color: '#121212' },
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-5">
        <h3 className="text-base font-bold m-0 text-foreground">
          Overtime Approvals {pendingOvertime.length > 0 && <span className="font-normal text-muted-foreground">({pendingOvertime.length})</span>}
        </h3>

        {pendingOvertime.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="schedule" className="opacity-30 mx-auto mb-3" size={32}/>
            <p className="m-0">No pending overtime claims.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingOvertime.map(c => {
              const emp = employees.find(e => e.id === c.employeeId)
              return (
                <div key={c.id} className="flex justify-between items-center flex-wrap gap-3 p-4 rounded-xl border border-border bg-card">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-semibold text-foreground">{emp?.name}</div>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatDateShort(c.date)}</span>
                      <span className="text-xs font-bold" style={{ color: '#b8860b' }}>{c.hours}h OT</span>
                    </div>
                    {c.reason && <div className="text-xs text-muted-foreground mt-0.5">{c.reason}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(c)}>
                      <Icon name="check" size={13}/> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:text-destructive" onClick={() => handleReject(c)}>
                      <Icon name="close" size={13}/> Reject
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {historyOvertime.length > 0 && (
          <>
            <h3 className="text-base font-bold m-0 text-foreground">History</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Team Member</TableHead>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="w-[80px]">Hours</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyOvertime.slice().reverse().map(c => {
                    const emp = employees.find(e => e.id === c.employeeId)
                    const s = STATUS[c.status] || STATUS.Pending
                    return (
                      <TableRow key={c.id}>
                        <TableCell><span className="text-xs text-foreground">{emp?.name}</span></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{formatDateShort(c.date)}</span></TableCell>
                        <TableCell><span className="text-xs text-foreground">{c.hours}h</span></TableCell>
                        <TableCell><Badge style={{ background: s.bg, color: s.color }}>{c.status}</Badge></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
