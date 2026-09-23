import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { changeEmployeePassword, TEMP_EMPLOYEE_PASSWORD } from '../services/auth.js'

/**
 * Full-screen, non-dismissable gate shown right after a teammate signs in with
 * the shared temporary password. Forces them to set a private password before
 * they can reach the workspace.
 */
export default function ForcePasswordChange({ user, addToast, handleLogout, onComplete }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      addToast?.('Please enter your current (temporary) password.', 'warning')
      return
    }
    if (newPassword.length < 6) {
      addToast?.('New password must be at least 6 characters.', 'warning')
      return
    }
    if (newPassword === TEMP_EMPLOYEE_PASSWORD) {
      addToast?.('Please choose a password different from the temporary one.', 'warning')
      return
    }
    if (newPassword !== confirmPassword) {
      addToast?.('New passwords do not match.', 'warning')
      return
    }
    setLoading(true)
    try {
      await changeEmployeePassword(currentPassword, newPassword)
      addToast?.('Password updated. Welcome aboard!', 'success')
      onComplete?.()
    } catch (err) {
      addToast?.('Failed to update password: ' + (err.message || 'Unknown error'), 'danger')
    } finally {
      setLoading(false)
    }
  }

  const eye = (value, setValue) => (
    <button
      type="button"
      onClick={() => setValue(v => !v)}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
      tabIndex={-1}
    >
      <Icon name={value ? 'visibility_off' : 'visibility'} size={18} />
    </button>
  )

  return (
    <div className="dark force-dark-mode fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-kormiis w-full max-w-[460px] rounded-3xl p-6 sm:p-8 text-white">
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="size-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Icon name="lock_reset" size={24} className="text-primary" />
          </div>
          <h2 className="text-fluid-xl font-bold m-0">Set your password</h2>
          <p className="text-fluid-xs text-white/70 m-0 leading-relaxed">
            Hi {user?.name || 'there'}, for security please replace the temporary password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="relative">
            <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            <Input
              type={show ? 'text' : 'password'}
              placeholder="Current (temporary) password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="h-11 !pl-11 !pr-11 rounded-2xl bg-white/[0.07] border border-white/[0.14] text-white placeholder:text-white/40 focus:border-white/30"
              autoFocus
            />
          </div>
          <div className="relative">
            <Icon name="vpn_key" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            <Input
              type={show ? 'text' : 'password'}
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="h-11 !pl-11 !pr-11 rounded-2xl bg-white/[0.07] border border-white/[0.14] text-white placeholder:text-white/40 focus:border-white/30"
            />
          </div>
          <div className="relative">
            <Icon name="check_circle" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            <Input
              type={show ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="h-11 !pl-11 !pr-11 rounded-2xl bg-white/[0.07] border border-white/[0.14] text-white placeholder:text-white/40 focus:border-white/30"
            />
            {eye(show, setShow)}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 sm:h-12 w-full rounded-full font-bold bg-primary text-primary-foreground hover:brightness-105 active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <>
                <Icon name="progress_activity" size={16} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Password & Continue</span>
            )}
          </Button>

          <button
            type="button"
            onClick={handleLogout}
            className="text-fluid-xs text-white/60 hover:text-white transition py-1 font-medium cursor-pointer"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  )
}
