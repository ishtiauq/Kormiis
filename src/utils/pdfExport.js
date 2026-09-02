const z = (v) => v < 10 ? `0${v}` : `${v}`

/**
 * Resolves settings from argument or localStorage fallback.
 */
function resolveSettings(settings) {
  if (settings && (settings.company || settings.companyName || Object.keys(settings).length > 0)) {
    return settings
  }
  try {
    const raw = localStorage.getItem('kormiis_settings')
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Could not read settings from localStorage:', e)
  }
  return {}
}

/**
 * Adds official company letterhead & branding header to the jsPDF instance.
 * Returns the Y coordinate for the next section.
 */
function addCompanyBranding(doc, rawSettings, startY = 14) {
  const settings = resolveSettings(rawSettings)
  const company = settings?.company || {}
  
  const companyName = company.name || settings?.companyName || 'Kormiis Ltd.'
  const companyLogo = company.logo || settings?.logo || ''
  const companyEmail = company.email || settings?.companyEmail || ''
  const companyPhone = company.phone || settings?.companyPhone || ''
  const companyWebsite = company.website || settings?.companyWebsite || ''
  const companyAddress = company.address || settings?.companyAddress || ''

  const contactItems = [companyPhone, companyEmail, companyWebsite, companyAddress].filter(Boolean)
  const contactLine = contactItems.join(' • ')

  let currentY = startY
  let textStartX = 14

  if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image')) {
    try {
      let format = 'PNG'
      if (companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')) format = 'JPEG'
      else if (companyLogo.startsWith('data:image/webp')) format = 'WEBP'
      
      doc.addImage(companyLogo, format, 14, currentY, 18, 18)
      textStartX = 36
    } catch (e) {
      console.warn('Could not render logo in PDF, falling back to text:', e)
      textStartX = 14
    }
  }

  // Company Name
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 24, 33)
  doc.text(companyName.toUpperCase(), textStartX, currentY + 6)

  // Company Contact Details
  if (contactLine) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(contactLine, textStartX, currentY + 12)
  }

  // Subtitle / System Tag
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(254, 53, 1) // Kormiis Brand Accent
  doc.text('OFFICIAL HR & ATTENDANCE RECORD', textStartX, currentY + 17)

  // Accent Horizontal Separator Line
  const separatorY = currentY + 22
  doc.setDrawColor(254, 53, 1)
  doc.setLineWidth(0.6)
  doc.line(14, separatorY, 196, separatorY)

  return separatorY + 6
}

export async function exportDailyAttendancePDF(employees = [], logs = {}, selectedDate, settings = {}) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  
  const resolvedSettings = resolveSettings(settings)
  const companyName = resolvedSettings?.company?.name || resolvedSettings?.companyName || 'Kormiis'
  
  const headerY = addCompanyBranding(doc, resolvedSettings, 14)
  
  // Title & Metadata
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Daily Attendance Report', 14, headerY + 4)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  const dateObj = new Date(selectedDate + 'T12:00:00')
  const dateString = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Report Date: ${dateString}`, 14, headerY + 10)

  // Calculate Daily Stats
  let inOfficeCount = 0
  let remoteCount = 0
  let onFieldCount = 0
  let leaveCount = 0
  let offDutyCount = 0

  const tableColumn = ["Employee Name", "Role / Designation", "Check In", "Check Out", "Total Hours", "Status"]
  const tableRows = []

  employees.forEach(emp => {
    const log = logs[emp.id] || { status: 'Off Duty', checkIn: '--', checkOut: '--', hours: '0.0' }
    let rawStatus = log.status || 'Off Duty'
    if (rawStatus === 'Present' || rawStatus === 'Late') rawStatus = 'In Office'
    if (rawStatus === 'WFH') rawStatus = 'Remote'
    if (rawStatus === 'Absent') rawStatus = 'Off Duty'

    if (rawStatus === 'In Office') inOfficeCount++
    else if (rawStatus === 'Remote') remoteCount++
    else if (rawStatus === 'On-Field') onFieldCount++
    else if (rawStatus === 'On Leave' || rawStatus === 'Half Day') leaveCount++
    else offDutyCount++

    const rowData = [
      emp.name || emp.employeeName || 'Unnamed',
      emp.role || emp.designation || 'Employee',
      log.checkIn || '--',
      log.checkOut || '--',
      `${log.hours || '0.0'}h`,
      rawStatus
    ]
    tableRows.push(rowData)
  })

  // Summary Pill / Stats
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text(`Total: ${employees.length}  |  In Office: ${inOfficeCount}  |  Remote: ${remoteCount}  |  On-Field: ${onFieldCount}  |  Leave: ${leaveCount}  |  Off Duty: ${offDutyCount}`, 14, headerY + 16)

  autoTable(doc, {
    startY: headerY + 20,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { 
      fillColor: [254, 53, 1], // Brand Orange
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: { 
      fontSize: 8.5, 
      cellPadding: 3,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        `${companyName} • Confidential • Generated on ${new Date().toLocaleString()} • Page ${data.pageNumber} of ${pageCount}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      )
    }
  })

  doc.save(`${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Daily_Attendance_${selectedDate}.pdf`)
}

export async function exportMonthlyAttendancePDF(employees = [], attendance = {}, calMonth, calYear, settings = {}) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  
  const resolvedSettings = resolveSettings(settings)
  const companyName = resolvedSettings?.company?.name || resolvedSettings?.companyName || 'Kormiis'
  
  const headerY = addCompanyBranding(doc, resolvedSettings, 14)
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  // Title & Metadata
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Monthly Attendance Summary', 14, headerY + 4)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Billing / Payroll Period: ${monthName}`, 14, headerY + 10)

  const tableColumn = ["Employee Name", "Role / Designation", "In Office", "Remote", "On-Field", "Leave", "Off Duty", "Total Hours"]
  const tableRows = []

  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  let totalCompanyHours = 0

  employees.forEach(emp => {
    let inOffice = 0
    let remote = 0
    let onField = 0
    let leave = 0
    let offDuty = 0
    let totalHours = 0

    for (let day = 1; day <= calDaysInMonth; day++) {
      const dateStr = `${calYear}-${z(calMonth + 1)}-${z(day)}`
      const dailyLogs = attendance?.dailyLogs?.[dateStr] || {}
      const log = dailyLogs[emp.id]
      
      if (log) {
        const s = String(log.status || '').trim()
        if (s === 'In Office' || s === 'Present' || s === 'Late') inOffice++
        else if (s === 'Remote' || s === 'WFH') remote++
        else if (s === 'On-Field' || s === 'Field' || s === 'Outdoor') onField++
        else if (s === 'On Leave') leave++
        else offDuty++
        
        totalHours += parseFloat(log.hours || 0)
      } else {
        const dateObj = new Date(calYear, calMonth, day)
        const dayOfWeek = dateObj.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          offDuty++
        }
      }
    }

    totalCompanyHours += totalHours

    const rowData = [
      emp.name || emp.employeeName || 'Unnamed',
      emp.role || emp.designation || 'Employee',
      inOffice.toString(),
      remote.toString(),
      onField.toString(),
      leave.toString(),
      offDuty.toString(),
      `${totalHours.toFixed(1)}h`
    ]
    tableRows.push(rowData)
  })

  // Summary KPI header text
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text(`Active Employees: ${employees.length}  |  Total Tracked Hours: ${totalCompanyHours.toFixed(1)} hrs`, 14, headerY + 16)

  autoTable(doc, {
    startY: headerY + 20,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { 
      fillColor: [254, 53, 1], // Brand Orange
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: { 
      fontSize: 8.5, 
      cellPadding: 3,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        `${companyName} • Confidential Monthly Report • Generated on ${new Date().toLocaleString()} • Page ${data.pageNumber} of ${pageCount}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      )
    }
  })

  doc.save(`${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Monthly_Attendance_${monthName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
