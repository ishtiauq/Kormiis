import { useState, Fragment } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Icon from "@/components/ui/Icon.jsx"
import { formatDateShort } from '../../services/date.js'

const STATUS_STYLE = {
  Approved: 'bg-black/10 dark:bg-white/15 text-foreground border-black/15 dark:border-white/20',
  Rejected: 'bg-black/15 dark:bg-white/20 text-foreground border-black/20 dark:border-white/25',
  Pending: 'bg-black/5 dark:bg-white/10 text-foreground border-black/10 dark:border-white/15',
}

export default function LeaveBalanceCard({ employees, balances, leaves = [], settings }) {
  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 }
  const leaveTypes = Object.keys(defaultPolicies)
  const [openEmp, setOpenEmp] = useState(null)

  const toggleEmp = (id) => setOpenEmp(prev => prev === id ? null : id)

  return (
    <Card className="min-w-0">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4 min-w-0">
        <h3 className="text-base font-bold m-0 text-foreground">Leave Balances</h3>
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                {leaveTypes.map(type => (
                  <TableHead key={type} className="text-center">{type}</TableHead>
                ))}
                <TableHead className="text-right">History</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => {
                const b = balances[emp.id] || {}
                const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status !== 'Pending')
                const isOpen = openEmp === emp.id
                return (
                  <Fragment key={emp.id}>
                    <TableRow onClick={() => toggleEmp(emp.id)} className="cursor-pointer hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-sm text-foreground">{emp.name}</TableCell>
                      {leaveTypes.map(type => {
                         const val = b[type] || b[type.toLowerCase()] // handle legacy lower-case
                         const used = typeof val === 'object' ? val.used : (typeof val === 'number' ? val : 0)
                         const limit = (typeof val === 'object' ? val.limit : defaultPolicies[type])
                         const remaining = typeof val === 'number' ? val : (limit - (typeof val === 'object' ? val.used : 0))

                         return (
                           <TableCell key={type} className="text-center text-sm text-muted-foreground">{remaining} <span className="text-xs opacity-50">rem</span></TableCell>
                         )
                      })}
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16}/>
                          {empLeaves.length} {empLeaves.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key="history-row">
                        <TableCell colSpan={leaveTypes.length + 2} className="p-3 bg-muted/20">
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
                            {empLeaves.length === 0 ? (
                              <div className="text-sm text-muted-foreground py-2">No leave history for {emp.name}.</div>
                            ) : (
                              <div className="rounded-lg border border-border bg-background overflow-hidden">
          <Table className="min-w-[640px]">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[120px]">Type</TableHead>
                                      <TableHead className="w-[200px]">Dates</TableHead>
                                      <TableHead className="w-[60px]">Days</TableHead>
                                      <TableHead>Reason</TableHead>
                                      <TableHead className="w-[100px]">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {empLeaves.slice().reverse().map(l => (
                                      <TableRow key={l.id}>
                                        <TableCell><span className="text-xs text-foreground">{l.leaveType}</span></TableCell>
                                        <TableCell><span className="text-xs text-muted-foreground">{formatDateShort(l.startDate)} - {formatDateShort(l.endDate)}</span></TableCell>
                                        <TableCell><span className="text-sm font-semibold text-foreground">{l.days || '-'}</span></TableCell>
                                        <TableCell><span className="text-xs text-muted-foreground block max-w-[200px] break-words">{l.reason || '-'}</span></TableCell>
                                        <TableCell><Badge variant="outline" className={STATUS_STYLE[l.status] || STATUS_STYLE.Pending}>{l.status}</Badge></TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
