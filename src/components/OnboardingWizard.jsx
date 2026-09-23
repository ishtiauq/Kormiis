import { useMemo, useRef, useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { provisionEmployeeAccount, TEMP_EMPLOYEE_PASSWORD, completeWorkspaceOnboarding } from '../services/auth.js'
import { fetchTableFromFirestore, writeToTable } from '../services/bridge.js'
import defaultAvatar from '../Assets/default-avatar.svg'

const STEP_LABELS = ['Company', 'Team', 'Done']

const isGmail = (email) => /@(gmail|googlemail)\.com$/i.test((email || '').trim())

const parseRows = async (file) => {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames.find(s => /employee|template|data/i.test(s)) || wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: false })

  const getVal = (row, ...keys) => {
    for (const k of keys) {
      const matched = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      if (matched && row[matched] !== undefined && row[matched] !== '') return String(row[matched]).trim()
    }
    return ''
  }

  return rows.map((rawRow, i) => {
    const name = getVal(rawRow, 'fullname', 'name', 'employeename')
    const email = getVal(rawRow, 'workemail', 'email')
    const phone = getVal(rawRow, 'phonenumber', 'phone', 'mobile', 'contact')
    const id = getVal(rawRow, 'employeeid', 'id', 'empid') || `EMP-${Date.now().toString().slice(-4)}${i + 1}`
    const department = getVal(rawRow, 'department', 'dept') || 'General'
    const designation = getVal(rawRow, 'roledesignation', 'role', 'designation', 'jobtitle') || 'Teammate'
    const joiningDate = getVal(rawRow, 'joiningdate', 'doj')
    const errors = []
    if (!name) errors.push('Name required')
    if (!email && !phone) errors.push('Email or phone required')
    if (email && !email.includes('@')) errors.push('Invalid email')
    return { id, name, email, phone, department, designation, joiningDate, errors }
  })
}

export default function OnboardingWizard({ user, addToast, onComplete }) {
  const adminUid = user?.companyUid || user?.uid
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)

  // Step 1
  const [companyName, setCompanyName] = useState(user?.companyName || '')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')

  // Step 2
  const fileInputRef = useRef(null)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState([])

  const validRows = useMemo(() => rows.filter(r => r.errors.length === 0), [rows])
  const invalidCount = rows.length - validRows.length

  const handleFile = async (file) => {
    if (!file) return
    try {
      const parsed = await parseRows(file)
      setRows(parsed)
      setFileName(file.name)
      if (!parsed.length) addToast?.('That spreadsheet has no data rows.', 'warning')
    } catch (err) {
      addToast?.('Failed to read file: ' + err.message, 'danger')
    }
  }

  const handleProvision = async () => {
    if (!validRows.length) {
      addToast?.('No valid rows to import.', 'warning')
      return
    }
    setImporting(true)
    setProgress({ done: 0, total: validRows.length })
    const collected = []

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      try {
        const prov = await provisionEmployeeAccount({
          email: row.email,
          phone: row.phone,
          password: TEMP_EMPLOYEE_PASSWORD,
          name: row.name,
          role: 'Teammate',
          companyUid: adminUid,
          employeeId: row.id,
          department: row.department,
          avatar: '',
        })
        collected.push({
          id: row.id,
          name: row.name,
          role: 'Teammate',
          designation: row.designation,
          permissions: [],
          reportsTo: '',
          department: row.department,
          status: 'Active',
          email: row.email,
          phone: row.phone,
          uid: prov.uid || '',
          avatar: defaultAvatar,
          joiningDate: row.joiningDate || '',
        })
      } catch (err) {
        addToast?.(`Row ${i + 1} (${row.name}): ${err.message}`, 'danger')
      }
      setProgress({ done: i + 1, total: validRows.length })
    }

    // Persist the roster so the imported team appears in the directory.
    if (collected.length) {
      try {
        const existing = (await fetchTableFromFirestore(adminUid, 'employees')) || []
        const existingIds = new Set(existing.map(e => e.id))
        const merged = [...existing, ...collected.filter(e => !existingIds.has(e.id))]
        await writeToTable(adminUid, 'employees', merged)
      } catch (err) {
        addToast?.('Team logins created, but saving the directory failed: ' + err.message, 'danger')
      }
    }

    setResults(collected)
    setImporting(false)
    setStep(2)
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      await completeWorkspaceOnboarding(adminUid, {
        company: { name: companyName.trim() || user?.companyName || 'My Workspace', website: website.trim(), industry: industry.trim() },
      })
    } catch (err) {
      console.warn('onboarding finish:', err)
    }
    setFinishing(false)
    onComplete?.()
  }

  const downloadCredentials = () => {
    const header = 'Name,Employee ID,Login Email,Login Phone,Temporary Password,Google Ready\n'
    const body = results.map(r => [
      `"${r.name}"`, r.id, r.email || '', r.phone || '', TEMP_EMPLOYEE_PASSWORD, isGmail(r.email) ? 'Yes' : 'No',
    ].join(',')).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kormiis-employee-credentials.csv'
    a.click()
    URL.revokeObjectURL(url)
    addToast?.('Credentials CSV downloaded.', 'success')
  }

  const copyAll = () => {
    const text = results.map(r => `${r.name} | ${r.email || r.phone} | ${TEMP_EMPLOYEE_PASSWORD}`).join('\n')
    navigator.clipboard.writeText(text)
    addToast?.('Credentials copied to clipboard.', 'success')
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="glass-kormiis w-full max-w-[760px] rounded-3xl p-6 sm:p-8 my-auto">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Icon name="check" size={14} /> : <span>{i + 1}</span>}
                <span>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Company */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-fluid-xl font-bold m-0">Welcome to Kormiis</h2>
              <p className="text-fluid-sm text-muted-foreground mt-1">Confirm your workspace details. You can change these later in Settings.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name</label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Studio" className="h-11 rounded-2xl" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industry</label>
                <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Software" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website</label>
                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="h-11 rounded-2xl" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={handleFinish} disabled={finishing} className="text-fluid-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer">
                Skip setup
              </button>
              <Button onClick={() => setStep(1)} className="h-11 px-6 rounded-full font-bold">Continue</Button>
            </div>
          </div>
        )}

        {/* Step 2 — Team */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-fluid-xl font-bold m-0">Add your team</h2>
              <p className="text-fluid-sm text-muted-foreground mt-1">
                Upload an Excel/CSV with columns: <span className="font-semibold text-foreground">Name, Work Email, Phone Number, Employee ID, Department, Designation</span>.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
              className="rounded-3xl border-2 border-dashed border-border hover:border-primary/50 transition-all p-8 text-center cursor-pointer bg-muted/20"
            >
              <Icon name="upload_file" size={36} className="text-primary mb-2" />
              <p className="text-fluid-sm font-semibold m-0">{fileName || 'Drop your Excel/CSV here, or click to browse'}</p>
              <p className="text-fluid-xs text-muted-foreground m-0 mt-1">.xlsx, .xls, .csv supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(f) }}
              />
            </div>

            {rows.length > 0 && (
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                  <span className="text-fluid-xs font-semibold">{validRows.length} ready · {invalidCount} skipped</span>
                  <button type="button" onClick={() => { setRows([]); setFileName('') }} className="text-fluid-xs text-muted-foreground hover:text-destructive cursor-pointer">Clear</button>
                </div>
                <div className="max-h-[240px] overflow-y-auto">
                  <table className="w-full text-fluid-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="text-muted-foreground">
                        <th className="text-left px-4 py-2 font-semibold">Name</th>
                        <th className="text-left px-4 py-2 font-semibold">Email / Phone</th>
                        <th className="text-left px-4 py-2 font-semibold">Dept</th>
                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-border/60">
                          <td className="px-4 py-2">{r.name || '—'}</td>
                          <td className="px-4 py-2">{r.email || r.phone || '—'}</td>
                          <td className="px-4 py-2">{r.department}</td>
                          <td className="px-4 py-2">
                            {r.errors.length ? <span className="text-destructive">{r.errors.join(', ')}</span> : <span className="text-emerald-600 dark:text-emerald-400">Ready</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-fluid-xs text-muted-foreground">
                  <span>Creating accounts...</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setStep(0)} disabled={importing} className="text-fluid-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer">Back</button>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleFinish} disabled={importing || finishing} className="text-fluid-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer">Skip</button>
                <Button onClick={handleProvision} disabled={importing || !validRows.length} className="h-11 px-6 rounded-full font-bold">
                  {importing ? <Icon name="progress_activity" size={16} className="animate-spin" /> : `Create ${validRows.length || ''} Account${validRows.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Icon name="check_circle" size={26} className="text-emerald-500" />
              </div>
              <h2 className="text-fluid-xl font-bold m-0">{results.length} account{results.length === 1 ? '' : 's'} ready</h2>
              <p className="text-fluid-sm text-muted-foreground m-0">
                Share these credentials. Everyone can sign in with their email <span className="font-semibold text-foreground">or</span> phone and the password below, or tap “Continue with Google”.
              </p>
            </div>

            {results.length > 0 && (
              <div className="rounded-2xl border border-border overflow-hidden max-h-[280px] overflow-y-auto">
                <table className="w-full text-fluid-xs">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Login</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Password</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Google</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-4 py-2.5 font-medium">{r.name}</td>
                        <td className="px-4 py-2.5">{r.email || r.phone}</td>
                        <td className="px-4 py-2.5 font-mono font-bold">{TEMP_EMPLOYEE_PASSWORD}</td>
                        <td className="px-4 py-2.5">{isGmail(r.email) ? '🟢 Ready' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {results.length > 0 && (
                <>
                  <Button variant="outline" onClick={downloadCredentials} className="h-11 px-5 rounded-full font-bold">
                    <Icon name="download" size={16} className="mr-2" /> Download CSV
                  </Button>
                  <Button variant="outline" onClick={copyAll} className="h-11 px-5 rounded-full font-bold">
                    <Icon name="content_copy" size={16} className="mr-2" /> Copy all
                  </Button>
                </>
              )}
              <Button onClick={handleFinish} disabled={finishing} className="h-11 px-6 rounded-full font-bold ml-auto">
                {finishing ? <Icon name="progress_activity" size={16} className="animate-spin" /> : 'Go to Dashboard'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
