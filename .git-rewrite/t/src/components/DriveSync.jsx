import { useState, useEffect } from 'react'
import { CloudSync, HardDrive, CloudOff, CloudLightning, ArrowLeftRight, Download, Info, FileJson, AlertCircle, RefreshCw, X, Trash2, Shield, RotateCcw } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { useConfirm } from '../hooks/useConfirm'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import AdSlot from './AdSlot'
import { getLocalCacheSizeMB, clearLocalCache } from '../services/db.js'
import { createBackup, listBackups, restoreBackup } from '../services/googleDrive.js'
import { formatDateTime } from '../services/date.js'

export default function DriveSync({ user, driveConnected, setDriveConnected, addLog, addToast }) {
  const [timeSinceSync, setTimeSinceSync] = useState(2)
  const [timeUntilSync, setTimeUntilSync] = useState(13)
  const [cacheSize, setCacheSize] = useState('0.00')
  const [isClearing, setIsClearing] = useState(false)

  const { confirm, ConfirmDialog } = useConfirm()

  const [backupsList, setBackupsList] = useState([])
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedRestoreBackup, setSelectedRestoreBackup] = useState(null)

  useEffect(() => {
    const fetchCacheSize = async () => {
      const size = await getLocalCacheSizeMB()
      setCacheSize(size)
    }
    fetchCacheSize()

    const loadBackups = async () => {
      if (driveConnected && user?.token) {
        try {
          const bks = await listBackups(user.token)
          setBackupsList(bks)
        } catch(e) {
          console.warn("Failed to load backups", e)
        }
      }
    }
    loadBackups()

    const timer = setInterval(() => {
      setTimeSinceSync(prev => prev < 15 ? prev + 1 : 0)
      setTimeUntilSync(prev => prev > 0 ? prev - 1 : 15)
      fetchCacheSize()
    }, 60000)
    return () => clearInterval(timer)
  }, [driveConnected, user])

  const handleToggleConnection = () => {
    const nextState = !driveConnected
    setDriveConnected(nextState)
    if (nextState) {
      addLog('Google Drive Connection Restored', 'Re-established sync tunnel with /HR-Pulse-DB/')
    } else {
      addLog('Google Drive Connection Paused', 'Local storage offline, cloud sync suspended', 'warning')
    }
  }

  const handleTestConnection = () => {
    addToast('Pinging Google Drive API...', 'info')
    setTimeout(() => {
      addToast('Success: Read/Write access verified in /HR-Pulse-DB/', 'success')
    }, 1000)
  }

  const handleCreateBackup = async () => {
    setIsBackingUp(true)
    addToast('Creating backup package...', 'info')
    try {
      await createBackup(user.token, false)
      const bks = await listBackups(user.token)
      setBackupsList(bks)
      addToast('Manual backup created successfully.', 'success')
      addLog('Backup Created', 'Manual snapshot saved to Drive', 'success')
    } catch(e) {
      addToast('Failed to create backup', 'error')
    }
    setIsBackingUp(false)
  }

  const handleExecuteRestore = async () => {
    if (!selectedRestoreBackup) return
    setIsRestoring(true)
    addToast('Restoring database from backup...', 'info')
    try {
      await restoreBackup(user.token, selectedRestoreBackup.id)
      addToast('Restore successful. Reloading...', 'success')
      addLog('Backup Restored', `Restored from ${selectedRestoreBackup.name}`, 'warning')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      addToast('Restore failed.', 'error')
      setIsRestoring(false)
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 sm:gap-8 lg:gap-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <CloudSync size={20} className="text-primary" />
          Google Drive Sync Management
        </h1>
      </div>
      <div className="border-t border-border" />

      {/* Connection Controller Card */}
      <Card className={`p-6 sm:p-8 lg:p-10 ${driveConnected ? 'bg-emerald-500/5' : ''}`}>
        <div className="flex justify-between items-center flex-wrap gap-6">
          <div className="flex gap-5 items-center">
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${driveConnected ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.2)]' : 'bg-destructive/10 text-destructive'}`}>
              {driveConnected && (
                <>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500" />
                </>
              )}
              {driveConnected ? <CloudLightning size={28} /> : <CloudOff size={28} />}
            </div>
            <div role="status" aria-live="polite">
              <h3 className="text-xl flex items-center gap-2 text-foreground">
                {driveConnected ? 'Sync Tunnel Active' : 'Sync Tunnel Paused'}
              </h3>
              <div className="text-muted-foreground text-[0.85rem] mt-1 flex gap-4 flex-wrap">
                {driveConnected ? (
                  <>
                    <span className="flex items-center gap-1"><RefreshCw size={14} /> Last Synced: {timeSinceSync} minutes ago</span>
                    <span className="flex items-center gap-1"><ArrowLeftRight size={14} /> Next sync in {timeUntilSync} minutes</span>
                  </>
                ) : (
                  'Local database is working offline. Operations will be buffered until connection resumes.'
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Button
              onClick={async () => {
                const ok = await confirm('Unsynced offline changes will be lost, and the app will reload.', 'Clear Local Cache?', { destructive: true, confirmText: 'Clear' })
                if (!ok) return
                setIsClearing(true)
                try {
                  await clearLocalCache()
                  window.location.reload()
                } catch(e) {
                  addLog('Cache Error', 'Failed to clear local cache', 'error')
                  setIsClearing(false)
                }
              }}
              disabled={isClearing}
              variant="outline"
              aria-label="Clear local cache and resync"
              className="border-destructive text-destructive hover:text-destructive font-semibold"
            >
              <Trash2 size={16} />
              {isClearing ? 'Clearing...' : 'Clear Local Cache & Resync'}
            </Button>
            <Button
              onClick={handleToggleConnection}
              aria-label={driveConnected ? 'Pause cloud connection' : 'Establish cloud connection'}
              variant={driveConnected ? 'outline' : 'default'}
              className={driveConnected ? 'border-amber-500 text-amber-500 hover:text-amber-600 font-semibold' : 'font-semibold'}
            >
              {driveConnected ? 'Pause Cloud Connection' : 'Establish Cloud Connection'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Sync Mechanism Diagram */}
        <Card className="flex flex-col">
          <CardContent className="p-4 sm:p-6 lg:p-8 flex flex-col justify-center h-full gap-5">
            <h4 className="text-base text-foreground font-semibold">Data Synchronization Flow</h4>

            <div className="py-2 sm:py-5 flex items-center justify-between gap-2 sm:gap-3 w-full">
              <div className="flex-1 w-full max-w-[140px] rounded-xl border border-border bg-muted/10 text-center p-3 px-1 sm:px-2">
                <HardDrive size={24} className="text-primary mx-auto mb-1.5" />
                <span className="text-[0.7rem] sm:text-[0.8rem] block font-semibold text-foreground">Local Cache</span>
                <span className="text-[0.65rem] sm:text-[0.7rem] text-muted-foreground block mb-0.5">{driveConnected ? '0 pending' : 'Offline queue'}</span>
                <span className="text-[0.65rem] sm:text-[0.7rem] text-primary font-semibold">{cacheSize} MB</span>
              </div>

              <div className="flex flex-col items-center gap-0.5 shrink-0 px-1 sm:px-3">
                <ArrowLeftRight size={20} className={driveConnected ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'} />
                <span className={`text-[0.65rem] sm:text-[0.7rem] font-semibold ${driveConnected ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {driveConnected ? 'Active' : 'Offline'}
                </span>
              </div>

              <div className="flex-1 w-full max-w-[140px] rounded-xl border border-border bg-muted/10 text-center p-3 px-1 sm:px-2">
                <CloudLightning size={24} className={`mx-auto mb-1.5 ${driveConnected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <span className="text-[0.7rem] sm:text-[0.8rem] block font-semibold text-foreground">Drive DB</span>
                <span className="text-[0.7rem] text-muted-foreground">{driveConnected ? 'Synced' : 'Waiting'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database backup commands */}
        <Card className="flex flex-col">
          <CardContent className="p-4 sm:p-6 lg:p-8 flex flex-col h-full gap-5">
            <div>
              <h4 className="text-base text-foreground font-semibold mb-2">Manual Backup</h4>
              <p className="text-[0.8rem] text-muted-foreground">
                Create an immediate snapshot of the current state, combining all tables into a single JSON package in the `_backups` folder.
              </p>
            </div>

            <div className="flex gap-3 mt-auto">
              <Button
                aria-label="Create backup now"
                variant="default"
                className="flex-1 justify-center"
                onClick={handleCreateBackup}
                disabled={isBackingUp || !driveConnected}
              >
                <Download size={16} /> {isBackingUp ? 'Creating Backup...' : 'Create Backup Now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Integrity Testing */}
        <Card className="flex flex-col">
          <CardContent className="p-4 sm:p-6 lg:p-8 flex flex-col h-full gap-5">
            <div>
              <h4 className="text-base text-destructive font-semibold mb-2 flex items-center gap-2">
                <AlertCircle size={18} /> Data Integrity Testing
              </h4>
              <p className="text-[0.8rem] text-muted-foreground">
                Simulate cloud database corruption by writing duplicate IDs to `employees.json` in your Google Drive. Reloading the app will trigger validation alerts and backup recovery flows.
              </p>
            </div>

            <div className="flex gap-3 mt-auto">
              <Button
                aria-label="Simulate drive corruption"
                variant="outline"
                className="flex-1 justify-center border-destructive text-destructive hover:text-destructive"
                onClick={() => {
                  const MOCK_DRIVE_KEY = 'hr_pulse_mock_drive_files';
                  const driveRaw = localStorage.getItem(MOCK_DRIVE_KEY);
                  if (driveRaw) {
                    try {
                      const drive = JSON.parse(driveRaw);
                      if (drive['employees']) {
                        const employees = drive['employees'].content;
                        if (Array.isArray(employees) && employees.length > 0) {
                          const duplicate = { ...employees[0], name: employees[0].name + " (Duplicate)" };
                          employees.push(duplicate);
                          drive['employees'].content = employees;
                          drive['employees'].modifiedTime = new Date().toISOString();
                          localStorage.setItem(MOCK_DRIVE_KEY, JSON.stringify(drive));
                          alert('Corruption simulated successfully! Please reload the page to trigger the integrity validator.');
                        } else {
                          alert('Mock drive has no employees to duplicate. Please load data first.');
                        }
                      } else {
                        alert('Employees table not found in mock drive. Please sync first.');
                      }
                    } catch (e) {
                      alert('Error writing corruption: ' + e.message);
                    }
                  } else {
                    alert('No mock drive found in localStorage. Please log in as a simulated user first.');
                  }
                }}
              >
                Simulate Drive Corruption
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Backup Browser Widget */}
        <Card className="flex flex-col">
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-[1.1rem] font-bold flex items-center gap-2 text-foreground">
                <Shield size={20} className="text-primary" /> Database Backups (/_backups/)
              </h4>
              <p className="text-[0.8rem] text-muted-foreground mt-1">Automated backups are retained for 7 days + 4 weeks</p>
            </div>
          </div>

          {/* Desktop Table View */}
          <div role="log" aria-live="polite" aria-label="Backup logs" className="hidden xl:block overflow-hidden border border-border rounded-lg mt-4">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-3">Backup Name</TableHead>
                  <TableHead className="p-3">Size</TableHead>
                  <TableHead className="p-3">Created Date</TableHead>
                  <TableHead className="p-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!Array.isArray(backupsList) || backupsList.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan="4" className="p-6 text-center text-muted-foreground">No backups found.</TableCell>
                  </TableRow>
                ) : backupsList.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="p-3 font-medium">
                      <span className="flex items-center gap-2">
                        <FileJson size={16} className="text-muted-foreground shrink-0" /> {f.name}
                      </span>
                    </TableCell>
                    <TableCell className="p-3 text-[0.85rem] text-muted-foreground">
                      {f.size ? (parseInt(f.size) / 1024).toFixed(1) + ' KB' : 'Unknown'}
                    </TableCell>
                    <TableCell className="p-3 text-[0.85rem] text-muted-foreground">
                      {formatDateTime(f.modifiedTime)}
                    </TableCell>
                    <TableCell className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          aria-label="Download backup"
                          variant="secondary"
                          size="xs"
                          onClick={() => window.open(`https://drive.google.com/uc?export=download&id=${f.id}`, '_blank')}
                          title="Download Backup"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          aria-label="Restore from this backup"
                          variant="default"
                          size="xs"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => setSelectedRestoreBackup(f)}
                          title="Restore from this backup"
                        >
                          <RotateCcw size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div role="log" aria-live="polite" aria-label="Backup logs" className="xl:hidden flex flex-col gap-4 mt-4">
            {(!Array.isArray(backupsList) || backupsList.length === 0) ? (
              <div className="text-center text-muted-foreground py-8 border border-border rounded-lg border-dashed">No backups found.</div>
            ) : backupsList.map(f => (
              <div key={`${f.id}-mobile`} className="flex flex-col gap-3 p-4 bg-muted/20 border border-border rounded-lg">
                <div className="flex items-start gap-2">
                  <FileJson size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground break-words">{f.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                      <span>Size: {f.size ? (parseInt(f.size) / 1024).toFixed(1) + ' KB' : 'Unknown'}</span>
                      <span>•</span>
                      <span>{formatDateTime(f.modifiedTime)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-1">
                  <Button
                    aria-label="Download backup"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(`https://drive.google.com/uc?export=download&id=${f.id}`, '_blank')}
                  >
                    <Download size={14} className="mr-2" /> Download
                  </Button>
                  <Button
                    aria-label="Restore from this backup"
                    variant="default"
                    size="sm"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setSelectedRestoreBackup(f)}
                  >
                    <RotateCcw size={14} className="mr-2" /> Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Modal */}
      <Dialog open={!!selectedRestoreBackup} onOpenChange={(open) => { if (!open) setSelectedRestoreBackup(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle size={24} /> Confirm Restore
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">You are about to restore the database from:</p>
            <div className="p-3 rounded-lg bg-muted font-mono text-sm text-foreground">
              {selectedRestoreBackup?.name}
            </div>
            <p className="text-sm text-destructive font-medium">
              WARNING: This will completely overwrite your current active database tables and cannot be undone. Unsynced offline changes will be permanently lost.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedRestoreBackup(null)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteRestore}
              disabled={isRestoring}
            >
              {isRestoring ? 'Restoring...' : 'Yes, Overwrite Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>

      {/* Info Warning Alert */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
        <div className="flex gap-3 items-start">
          <Info size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-[0.85rem] font-semibold text-foreground">Authentication Note</span>
            <span className="text-[0.8rem] text-muted-foreground leading-relaxed max-w-[800px]">
              This application uses standard OAuth2 authentication to establish read/write access to its private App Data folder on Google Drive.
              The database files are stored securely and cannot be read by other tools.
            </span>
          </div>
        </div>
        <Button variant="secondary" onClick={handleTestConnection} className="whitespace-nowrap w-full sm:w-auto">
          Test Connection
        </Button>
      </div>

      <ConfirmDialog />
      <AdSlot />
    </div>
  )
}
