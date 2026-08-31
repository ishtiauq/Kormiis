import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

export default function LeaveBalanceCard({ employees, balances }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        <h3 className="text-base font-bold m-0 text-foreground">Leave Balances</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Sick</TableHead>
                <TableHead className="text-center">Casual</TableHead>
                <TableHead className="text-center">Annual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => {
                const b = balances[emp.id] || {}
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium text-sm text-foreground">{emp.name}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{b.sick?.used || 0}/{b.sick?.limit || 14}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{b.casual?.used || 0}/{b.casual?.limit || 10}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{b.annual?.used || 0}/{b.annual?.limit || 20}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
