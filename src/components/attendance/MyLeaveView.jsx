import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectItem } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

export default function MyLeaveView({ currentUser, attendance, setAttendance, addToast, addLog, settings, addNotification }) {
  const myLeaves = (attendance?.leaves || []).filter(l => l.employeeId === currentUser.id)

  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 }
  const myBalance = attendance?.balances?.[currentUser.id] || defaultPolicies
  const leaveTypes = Object.keys(defaultPolicies)

  const [type, setType] = useState(leaveTypes[0] || 'Annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [receiptName, setReceiptName] = useState('')

  const handleApply = (e) => {
    e.preventDefault()
    if (!startDate || !endDate) return addToast('Please select dates', 'warning')

    const newLeave = {
      id: `leave-${Date.now()}`,
      employeeId: currentUser.id,
      leaveType: type,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      receipt,
      receiptName
    }

    setAttendance(prev => ({ ...prev, leaves: [newLeave, ...(prev.leaves || [])] }))
    addToast('Leave request submitted successfully!', 'success')
    addLog('Leave Requested', `${currentUser.name} requested ${type} leave.`, 'info')

    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested ${type} leave (${startDate} to ${endDate})`,
        'leaves',
        { title: 'New Leave Request', category: 'leave', targetRoles: ['Admin', 'HR'] }
      )
    }

    setStartDate(''); setEndDate(''); setReason(''); setReceipt(null); setReceiptName('')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(myBalance).map(([lType, days]) => (
       <Card key={lType} className="bg-muted/40 border-border/50 shadow-sm">
             <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{lType}</div>
                <div className="text-fluid-display font-black text-foreground tabular-nums">{days} <span className="text-fluid-sm text-muted-foreground">days</span></div>
             </CardContent>
           </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0 shadow-sm">
        <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon name="calendar_month" className="text-foreground shrink-0" size={24}/>
            <CardTitle className="text-base m-0 modal-title-solid">Apply for Leave</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {Object.entries(myBalance).reduce((sum, [, d]) => sum + (d || 0), 0)} days left
          </Badge>
        </div>
        <CardContent className="p-5 sm:p-6">
          <form id="apply-leave-form" onSubmit={handleApply} className="flex flex-col gap-5 max-w-[500px]">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Leave type</label>
              <Select value={type} onChange={setType} placeholder="Leave type">
                {leaveTypes.map(t => (
                  <SelectItem key={t} id={t}>{t}</SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              <DatePicker label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Reason / Handover notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Reason / Handover notes"
                rows="3"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Attach Receipt / Medical Certificate</label>
              <div className="flex items-center gap-3">
                <Button variant="outline" type="button" className="relative cursor-pointer overflow-hidden group">
                  <Icon name="upload" className="h-4 w-4 mr-2" size={16}/>
                  <span>{receiptName ? 'Change Document' : 'Upload File'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiptName(file.name);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setReceipt(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </Button>
                {receiptName && (
                  <span className="text-sm text-muted-foreground break-words max-w-[200px]">
                    {receiptName}
                  </span>
                )}
              </div>
            </div>

          </form>
        </CardContent>
        <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
          <Button type="submit" form="apply-leave-form">
            <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Request
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No leave history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  myLeaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.leaveType}</TableCell>
                      <TableCell>{l.startDate} to {l.endDate}</TableCell>
                      <TableCell className="max-w-[200px] break-words">{l.reason}</TableCell>
                      <TableCell>
                        {l.receipt ? (
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <a href={l.receipt} target="_blank" rel="noreferrer">
                              <Icon name="description" className="h-3.5 w-3.5 mr-1" size={14}/> View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'Approved' ? 'default' : l.status === 'Rejected' ? 'destructive' : 'secondary'} className={l.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : l.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}