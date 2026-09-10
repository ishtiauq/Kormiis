import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import ProfileView from './ProfileView.jsx'
import { isPushSupported, getPushPermission, requestPushPermission, registerPushSubscription } from '../services/pushNotifications.js'

function Accordion({ icon, title, subtitle, open, onToggle, children }) {
  return (
    <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
      open
        ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20'
        : 'border-border/80 dark:border-white/10 hover:border-primary/30'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Icon name={icon} className="text-primary shrink-0" size={32}/>
          <div className="min-w-0">
            <h3 className="font-bold text-fluid text-foreground tracking-tight">{title}</h3>
            {subtitle && <p className="text-fluid-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <Icon
          name="expand_more"
          size={24}
          className={`transition-transform duration-300 shrink-0 ${open ? 'rotate-180 text-foreground' : 'rotate-0 text-muted-foreground'}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 animate-in fade-in-50 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

export default function EmployeeSettings(props) {
  const {
    currentUser,
    themeMode,
    isDarkMode,
    toggleTheme,
    addToast,
  } = props

  // By default, no accordion is open until user clicks/opens
  const [openSections, setOpenSections] = useState({})
  const [pushPermission, setPushPermission] = useState(() => getPushPermission())
  const [isEnablingPush, setIsEnablingPush] = useState(false)

  const resolvedIsDark = isDarkMode ?? (themeMode === 'dark')
  const companyUid = currentUser?.adminUid || currentUser?.companyUid || currentUser?.uid || null

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const handleEnablePush = async () => {
    if (!isPushSupported()) {
      addToast?.('Notifications are not supported on this browser.', 'error')
      return
    }
    setIsEnablingPush(true)
    try {
      const result = await requestPushPermission()
      setPushPermission(result)
      if (result === 'granted') {
        await registerPushSubscription(currentUser, companyUid)
        addToast?.('Browser notifications enabled.', 'success')
      } else if (result === 'denied') {
        addToast?.('Notifications are blocked. Allow them in your browser settings.', 'error')
      } else {
        addToast?.('Notification permission was not granted.', 'info')
      }
    } finally {
      setIsEnablingPush(false)
    }
  }

  const pushStatusLabel = {
    granted: 'Enabled on this device',
    denied: 'Blocked in browser settings',
    default: 'Not enabled yet',
    unsupported: 'Not supported on this browser',
  }[pushPermission] || 'Unknown'

  return (
    <div className="animate-fade-in flex flex-col gap-2.5 sm:gap-3 w-full pb-14 max-w-[920px] mx-auto">

      {/* Profile */}
      <Accordion
        icon="person"
        title="Profile"
        subtitle="Your name, email, phone and personal contact details"
        open={openSections.profile}
        onToggle={() => toggleSection('profile')}
      >
        <ProfileView {...props} initialSection="personal" hideNav />
      </Accordion>

      {/* Security & Login */}
      <Accordion
        icon="shield"
        title="Security & Login"
        subtitle="Password, Google Calendar and account controls"
        open={openSections.security}
        onToggle={() => toggleSection('security')}
      >
        <ProfileView {...props} initialSection="security" hideNav hideHero />
      </Accordion>

      {/* Appearance */}
      <Accordion
        icon="palette"
        title="Appearance"
        subtitle="Choose how the app looks on this device"
        open={openSections.appearance}
        onToggle={() => toggleSection('appearance')}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
          {[
            { id: 'light', label: 'Light', icon: 'light_mode' },
            { id: 'dark', label: 'Dark', icon: 'dark_mode' },
          ].map(opt => {
            const active = (opt.id === 'dark') === resolvedIsDark
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const wantDark = opt.id === 'dark'
                  if (wantDark !== resolvedIsDark) toggleTheme?.()
                }}
                className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border transition-all cursor-pointer ${
                  active
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border/60 dark:border-white/10 text-muted-foreground hover:bg-white/30 dark:hover:bg-white/5'
                }`}
              >
                <Icon name={opt.icon} size={26} className={active ? 'text-primary' : ''} />
                <span className="text-sm font-semibold">{opt.label}</span>
                {active && <Icon name="check_circle" size={14} className="text-primary" />}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* Notifications */}
      <Accordion
        icon="notifications"
        title="Notifications"
        subtitle="Browser alerts for announcements, tasks and approvals"
        open={openSections.notifications}
        onToggle={() => toggleSection('notifications')}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-2xl flex items-center justify-center border ${
              pushPermission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted/30 border-border/60 text-muted-foreground'
            }`}>
              <Icon name={pushPermission === 'granted' ? 'notifications_active' : 'notifications_off'} size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground">{pushStatusLabel}</p>
            </div>
          </div>

          {pushPermission !== 'granted' && (
            <Button
              onClick={handleEnablePush}
              disabled={isEnablingPush || pushPermission === 'unsupported'}
              className="rounded-2xl liquid-glass-btn h-11 px-5 font-semibold shrink-0"
            >
              <Icon name="notifications_active" size={16} />
              {isEnablingPush ? 'Enabling...' : 'Enable Notifications'}
            </Button>
          )}
        </div>
      </Accordion>
    </div>
  )
}
