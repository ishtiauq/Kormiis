import { useState } from 'react'
import { useLeaves } from '../../hooks/useLeaves.js'
import { formatDateShort } from '../../services/date.js'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { generateLeaveStatusMessage, queueWhatsAppMessages, openWhatsAppDirect } from '../../services/whatsappService.js'

export default function LeaveRequests({ employees, attendance, setAttendance, addToast, addNotification, settings }) {
  const { pendingLeaves, approveLeave, rejectLeave, pendingCount } = useLeaves(attendance, setAttendance, addToast, addNotification)

  const [pendingAction, setPendingAction] = useState(null) // { id, action: 'approve' | 'reject', empName }

  const handleConfirmAction = async () => {
    if (pendingAction) {
      const targetLeave = (attendance?.leaves || []).find(l => l.id === pendingAction.id)
      const emp = employees.find(e => e.id === targetLeave?.employeeId)

      if (pendingAction.action === 'approve') {
        approveLeave(pendingAction.id)
      } else {
        rejectLeave(pendingAction.id)
      }

      // Auto-queue WhatsApp update if enabled (free 24h-window mode)
      if (settings?.whatsapp?.enabled && settings?.whatsapp?.notifyLeaves && emp?.phone && targetLeave) {
        const message = generateLeaveStatusMessage({
          employeeName: emp.name,
          companyName: settings?.company?.name || 'Kormiis HR',
          leaveType: targetLeave.leaveType || 'Leave',
          startDate: formatDateShort(targetLeave.startDate),
          endDate: formatDateShort(targetLeave.endDate),
          status: pendingAction.action === 'approve' ? 'Approved' : 'Rejected',
          reason: targetLeave.reason
        })

        queueWhatsAppMessages({
          items: [{
            phone: emp.phone,
            employeeName: emp.name,
            event: 'leave',
            message
          }]
        }).then(res => {
          if (res.success && addToast) addToast(`WhatsApp update queued for ${emp.name}!`, 'success')
        }).catch(() => {})
      }

      setPendingAction(null)
    }
  }

  const handleDirectWhatsAppClick = (l) => {
    const emp = employees.find(e => e.id === l.employeeId)
    if (!emp?.phone) {
      if (addToast) addToast(`No phone number recorded for ${emp?.name || 'this employee'}.`, 'warning')
      return
    }
    const message = generateLeaveStatusMessage({
      employeeName: emp.name,
      companyName: settings?.company?.name || 'Kormiis HR',
      leaveType: l.leaveType || 'Leave',
      startDate: formatDateShort(l.startDate),
      endDate: formatDateShort(l.endDate),
      status: l.status || 'Pending',
      reason: l.reason
    })
    openWhatsAppDirect(emp.phone, message)
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
        <h3 className="text-base font-bold m-0 text-foreground">
          Pending Requests {pendingCount > 0 && <span className="font-normal text-muted-foreground">({pendingCount})</span>}
        </h3>
        {pendingLeaves.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="calendar_month" className="opacity-30 mx-auto mb-3" size={32}/>
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
                      <TableCell><span className="text-xs text-muted-foreground">{formatDateShort(l.startDate)} - {formatDateShort(l.endDate)}</span></TableCell>
                      <TableCell className="text-center"><span className="text-sm font-semibold text-foreground">{l.days || '-'}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground block max-w-[200px] break-words">{l.reason || '-'}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end items-center">
                          <Button size="sm" variant="default" onClick={() => setPendingAction({ id: l.id, action: 'approve', empName: emp?.name || l.employeeId })}>
                            <Icon name="check" className="mr-1" size={13}/> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:text-destructive" onClick={() => setPendingAction({ id: l.id, action: 'reject', empName: emp?.name || l.employeeId })}>
                            <Icon name="close" className="mr-1" size={13}/> Reject
                          </Button>
                          {emp?.phone && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="px-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" 
                              title="Chat / Notify on WhatsApp"
                              onClick={() => handleDirectWhatsAppClick(l)}
                            >
                              <Icon name="chat" size={14}/>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Icon name="warning" className="h-5 w-5 text-amber-500" size={20}/>
              {pendingAction?.action === 'approve' ? 'Approve' : 'Reject'} Leave Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {pendingAction?.action} the leave request for <strong>{pendingAction?.empName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              variant={pendingAction?.action === 'approve' ? 'default' : 'destructive'}
              className={pendingAction?.action === 'approve' ? '!bg-[#10b981] hover:!bg-[#059669] !text-white border-0 shadow-md' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
