import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const z = (v) => v < 10 ? `0${v}` : `${v}`

export function exportDailyAttendancePDF(employees, logs, selectedDate) {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.text('Kormiis - Daily Attendance Report', 14, 22)
  
  doc.setFontSize(11)
  doc.setTextColor(100)
  const dateObj = new Date(selectedDate + 'T12:00:00')
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Date: ${dateString}`, 14, 30)

  const tableColumn = ["Employee Name", "Role", "Check In", "Check Out", "Total Hours", "Status"]
  const tableRows = []

  employees.forEach(emp => {
    const log = logs[emp.id] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
    const rowData = [
      emp.name,
      emp.role || 'Employee',
      log.checkIn,
      log.checkOut,
      `${log.hours}h`,
      log.status
    ]
    tableRows.push(rowData)
  })

  autoTable(doc, {
    startY: 35,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [254, 53, 1] }, // Kormiis primary orange
    styles: { fontSize: 10, cellPadding: 3 },
  })

  doc.save(`Attendance_${selectedDate}.pdf`)
}

export function exportMonthlyAttendancePDF(employees, attendance, calMonth, calYear) {
  const doc = new jsPDF()
  
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  // Title
  doc.setFontSize(18)
  doc.text('Kormiis - Monthly Attendance Summary', 14, 22)
  
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Month: ${monthName}`, 14, 30)

  const tableColumn = ["Employee Name", "Role", "Present", "Absent", "Leave", "Total Hours"]
  const tableRows = []

  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  employees.forEach(emp => {
    let present = 0
    let absent = 0
    let leave = 0
    let totalHours = 0

    // Loop through all days in the month
    for (let day = 1; day <= calDaysInMonth; day++) {
      const dateStr = `${calYear}-${z(calMonth + 1)}-${z(day)}`
      const dailyLogs = attendance?.dailyLogs?.[dateStr] || {}
      const log = dailyLogs[emp.id]
      
      if (log) {
        if (log.status === 'Present' || log.status === 'Late' || log.status === 'Half Day') present++
        else if (log.status === 'Absent') absent++
        else if (log.status === 'On Leave') leave++
        
        totalHours += parseFloat(log.hours || 0)
      } else {
        // By default, if no log exists, we might consider it absent if it's a weekday, but for summary we'll just count recorded absences or ignore it.
        // Let's count them as absent if they have no log, to match default daily view behavior.
        // (Optional: You can skip weekends here if you have a holiday/weekend list)
        const dateObj = new Date(calYear, calMonth, day)
        const dayOfWeek = dateObj.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // ignoring weekends for absent default
          absent++
        }
      }
    }

    const rowData = [
      emp.name,
      emp.role || 'Employee',
      present.toString(),
      absent.toString(),
      leave.toString(),
      `${totalHours.toFixed(1)}h`
    ]
    tableRows.push(rowData)
  })

  autoTable(doc, {
    startY: 35,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [254, 53, 1] }, // Kormiis primary orange
    styles: { fontSize: 10, cellPadding: 3 },
  })

  doc.save(`Monthly_Attendance_${monthName.replace(' ', '_')}.pdf`)
}
