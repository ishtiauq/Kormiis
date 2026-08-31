import { useLeaves } from '../../hooks/useLeaves.js'
import { formatDateShort } from '../../services/date.js'
import { Check, X, CalendarDays } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

export default function LeaveRequests({ employees, attendance, setAttendance, addToast }) {
  const { leaves, pendingLeaves, historyLeaves, balances, approveLeave, rejectLeave, pendingCount } = useLeaves(attendance, setAttendance, addToast)

  const STATUS = {
    Approved: { bg: '#28a745', color: '#fff' },
    Rejected: { bg: '#dc3545', color: '#fff' },
    Pending: { bg: '#ffc107', color: '#121212' },
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
        <h3 className="text-base font-bold m-0 text-foreground">
          Pending Requests {pendingCount > 0 && <span className="font-normal text-muted-foreground">({pendingCount})</span>}
        </h3>
        {pendingLeaves.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays size={32} className="opacity-30 mx-auto mb-3" />
            <p className="m-0">No pending leave requests.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Employee</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[180px]">Dates</TableHead>
                  <TableHead className="text-center w-[60px]">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right w-[200px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLeaves.map(l => {
                  const emp = employees.find(e => e.id === l.employeeId)
                  return (
                    <TableRow key={l.id}>
                      <TableCell><span className="text-sm text-foreground">{emp?.name || l.employeeId}</span></TableCell>
                      <TableCell><span className="text-sm text-foreground">{l.leaveType}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{formatDateShort(l.startDate)} — {formatDateShort(l.endDate)}</span></TableCell>
                      <TableCell className="text-center"><span className="text-sm font-semibold text-foreground">{l.days || '—'}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground block max-w-[200px] break-words">{l.reason || '—'}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="default" onClick={() => approveLeave(l.id)}>
                            <Check size={13} /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:text-destructive" onClick={() => rejectLeave(l.id)}>
                            <X size={13} /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {historyLeaves.length > 0 && (
          <>
            <h3 className="text-base font-bold m-0 text-foreground">History</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Employee</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[200px]">Dates</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLeaves.slice().reverse().map(l => {
                    const emp = employees.find(e => e.id === l.employeeId)
                    const s = STATUS[l.status] || STATUS.Pending
                    return (
                      <TableRow key={l.id}>
                        <TableCell><span className="text-xs text-foreground">{emp?.name || l.employeeId}</span></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{l.leaveType}</span></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{formatDateShort(l.startDate)} — {formatDateShort(l.endDate)}</span></TableCell>
                        <TableCell><Badge style={{ background: s.bg, color: s.color }}>{l.status}</Badge></TableCell>
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
