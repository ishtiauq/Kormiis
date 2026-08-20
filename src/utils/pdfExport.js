import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const z = (v) => v < 10 ? `0${v}` : `${v}`

function addCompanyBranding(doc, settings, startY = 14) {
  const companyName = settings?.company?.name || 'Kormiis'
  const logo = settings?.company?.logo
  let currentY = startY

  if (logo) {
    try {
      let format = 'PNG'
      if (logo.startsWith('data:image/jpeg') || logo.startsWith('data:image/jpg')) format = 'JPEG'
      else if (logo.startsWith('data:image/webp')) format = 'WEBP'
      doc.addImage(logo, format, 14, currentY, 20, 20)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 20, 20)
      doc.text(companyName, 38, currentY + 8)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const contactInfo = [settings?.company?.phone, settings?.company?.email, settings?.company?.website].filter(Boolean).join(' • ')
      if (contactInfo) {
        doc.text(contactInfo, 38, currentY + 14)
      }
      return currentY + 24
    } catch (e) {
      console.warn('Could not add logo to PDF:', e)
    }
  }

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text(companyName, 14, currentY + 8)
  return currentY + 14
}

export function exportDailyAttendancePDF(employees, logs, selectedDate, settings = {}) {
  const doc = new jsPDF()
  const companyName = settings?.company?.name || 'Kormiis'
  
  const headerY = addCompanyBranding(doc, settings, 14)
  
  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text(`${companyName} — Daily Attendance Report`, 14, headerY + 4)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  const dateObj = new Date(selectedDate + 'T12:00:00')
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Report Date: ${dateString}`, 14, headerY + 11)

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
    startY: headerY + 16,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [254, 53, 1] }, // Kormiis primary orange
    styles: { fontSize: 9.5, cellPadding: 3.5 },
  })

  doc.save(`${companyName.replace(/\s+/g, '_')}_Attendance_${selectedDate}.pdf`)
}

export function exportMonthlyAttendancePDF(employees, attendance, calMonth, calYear, settings = {}) {
  const doc = new jsPDF()
  const companyName = settings?.company?.name || 'Kormiis'
  
  const headerY = addCompanyBranding(doc, settings, 14)
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text(`${companyName} — Monthly Attendance Summary`, 14, headerY + 4)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Month: ${monthName}`, 14, headerY + 11)

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
        const dateObj = new Date(calYear, calMonth, day)
        const dayOfWeek = dateObj.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
    startY: headerY + 16,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [254, 53, 1] },
    styles: { fontSize: 9.5, cellPadding: 3.5 },
  })

  doc.save(`${companyName.replace(/\s+/g, '_')}_Monthly_Attendance_${monthName.replace(/\s+/g, '_')}.pdf`)
}
