import { useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

export default function LeavePoliciesEditor({ settings, setSettings, addToast, addLog }) {
  const defaultPolicies = { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 }
  const [leavePolicies, setLeavePolicies] = useState(settings?.leavePolicies || defaultPolicies)
  const [newLeaveName, setNewLeaveName] = useState('')
  const [newLeaveDays, setNewLeaveDays] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [leaveToDelete, setLeaveToDelete] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings?.leavePolicies) {
      setLeavePolicies(settings.leavePolicies)
    }
  }, [settings?.leavePolicies])

  const handleDayChange = (type, value) => {
    const parsed = Math.max(0, parseInt(value, 10) || 0)
    setLeavePolicies(prev => ({ ...prev, [type]: parsed }))
  }

  const handleAddPolicy = () => {
    const trimmed = newLeaveName.trim()
    if (!trimmed) return
    const days = Math.max(0, parseInt(newLeaveDays, 10) || 0)
    setLeavePolicies(prev => ({ ...prev, [trimmed]: days }))
    setNewLeaveName('')
    setNewLeaveDays('')
    setShowAddModal(false)
    if (addToast) addToast(`Added ${trimmed} leave policy. Click Save to persist.`, 'info')
  }

  const handleDeletePolicy = (type) => {
    setLeavePolicies(prev => {
      const next = { ...prev }
      delete next[type]
      return next
    })
    setLeaveToDelete(null)
    if (addToast) addToast(`Removed ${type} leave policy. Click Save to persist.`, 'info')
  }

  const handleSavePolicies = () => {
    if (!setSettings) return
    setIsSaving(true)
    setSettings(prev => ({
      ...prev,
      leavePolicies: { ...leavePolicies }
    }))
    addLog?.('Leave Policies Updated', `Updated leave types and annual quotas`, 'success')
    setTimeout(() => {
      setIsSaving(false)
      if (addToast) addToast('Leave quotas saved successfully!', 'success')
    }, 200)
  }

  return (
    <Card className="glass-kormiis border border-border/80 dark:border-white/12 shadow-xl rounded-3xl overflow-hidden animate-fade-in">
      <CardHeader className="p-6 pb-4 border-b border-border/40 dark:border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon name="tune" size={22}/>
          </div>
          <div>
            <CardTitle className="text-fluid-lg font-bold">Leave Types & Annual Quotas</CardTitle>
            <CardDescription className="text-fluid-xs text-muted-foreground">
              Configure standard paid and unpaid annual leave allocations per team member.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button 
            variant="outline" 
            onClick={() => setShowAddModal(true)} 
            className="h-11 px-4 rounded-2xl font-bold gap-1.5 border-border/80 dark:border-white/12"
          >
            <Icon name="add" size={16}/> Add Leave Type
          </Button>

          <Button 
            onClick={handleSavePolicies} 
            disabled={isSaving} 
            className="liquid-glass-btn h-11 px-5 rounded-2xl font-bold shadow-md gap-2"
          >
            <Icon name="save" size={16}/>
            {isSaving ? 'Saving...' : 'Save Quotas'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Object.keys(leavePolicies).map((type) => (
            <div 
              key={type} 
              className="flex flex-col justify-between gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 dark:border-white/10 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">{type}</span>
                {['Annual', 'Sick', 'Casual', 'Unpaid'].includes(type) ? (
                  <Badge variant="outline" className="text-[10px] bg-muted/30">System</Badge>
                ) : (
                  <button 
                    onClick={() => setLeaveToDelete(type)} 
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete leave policy"
                  >
                    <Icon name="delete" size={16}/>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min="0" 
                  max="365"
                  value={leavePolicies[type]} 
                  onChange={e => handleDayChange(type, e.target.value)} 
                  className="h-11 rounded-2xl font-bold tabular-nums text-foreground bg-card dark:bg-[#12131c]/60"
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Days / Year</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Add Leave Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md bg-card dark:bg-[#12131c]/95 rounded-3xl p-6 border border-border/80 dark:border-white/12 shadow-2xl backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-fluid-lg font-bold">Add New Leave Policy</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leave Policy Name</label>
              <Input 
                placeholder="e.g. Maternity / Paternity Leave" 
                value={newLeaveName} 
                onChange={(e) => setNewLeaveName(e.target.value)} 
                className="h-11 rounded-2xl font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Annual Allocation (Days)</label>
              <Input 
                type="number" 
                min="0" 
                max="365" 
                placeholder="e.g. 90" 
                value={newLeaveDays} 
                onChange={(e) => setNewLeaveDays(e.target.value)} 
                className="h-11 rounded-2xl font-bold tabular-nums"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 rounded-2xl font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="h-11 rounded-2xl font-bold shadow-md" onClick={handleAddPolicy} disabled={!newLeaveName.trim()}>Add Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!leaveToDelete} onOpenChange={(open) => !open && setLeaveToDelete(null)}>
        <AlertDialogContent className="rounded-3xl p-6 bg-card dark:bg-[#12131c]/95 border border-border/80 dark:border-white/12 shadow-2xl backdrop-blur-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-fluid-lg font-bold">Delete Leave Policy?</AlertDialogTitle>
            <AlertDialogDescription className="text-fluid-xs text-muted-foreground">
              Are you sure you want to remove <strong>{leaveToDelete}</strong>? Existing leave balances may need manual reconciliation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-2xl font-bold" onClick={() => setLeaveToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="h-11 rounded-2xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90" 
              onClick={() => handleDeletePolicy(leaveToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
