import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
export default function Topbar({ 
  isDarkMode, 
  toggleSidebar, 
  themeMode, 
  toggleTheme, 
  handleSync, 
  isSyncing, 
  dataIntegrityIssues = [], 
  showCorruptionModal, 
  setShowCorruptionModal, 
  handleAutoRepairDatabase, 
  setShowNotifications, 
  markNotificationsRead, 
  unreadCount, 
  showNotifications, 
  notifications = [], 
  clearNotifications, 
  onProfileClick, 
  handleLogout, 
  showThemeToggle = true, 
  user, 
  setCurrentView,
  onOpenSearch
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const buttonRef = useRef(null)
  const [modalPos, setModalPos] = useState({ top: 0, right: 0 })
  const [notificationTab, setNotificationTab] = useState('all')
  const filteredNotifications = notificationTab === 'unread' ? notifications.filter(n => !n.read) : notifications
  const isDark = isDarkMode ?? (themeMode === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')))

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (showNotifications && !isMobile && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setModalPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right
      })
    }
  }, [showNotifications, isMobile])

  return (
    <>
{/* Mobile: Liquid Glass Top Bar */}
      {isMobile ? (
        <header aria-label="Top bar" className="topbar topbar-bar pointer-events-auto w-full h-14 px-4 flex items-center justify-between glass-apple text-foreground transition-all duration-300">
          <div className="flex items-center shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (setCurrentView) setCurrentView('dashboard');
              }}
              className="flex items-center cursor-pointer transition-opacity hover:opacity-80 active:scale-95 outline-none no-underline border-none bg-transparent p-0 m-0 shadow-none"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}
              title="Kormiis Dashboard"
            >
              <img
                src={isDark ? kormiisWhiteLogo : kormiisLogo}
                alt="Kormiis Logo"
                className="h-7 sm:h-8 w-auto max-w-[120px] object-contain shrink-0 drop-shadow-sm transition-opacity"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              />
            </a>
          </div>

          {/* Right: Actions Group (Theme, Notification, Profile) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showThemeToggle && (
              <button
                onClick={toggleTheme}
                title={`Theme: ${themeMode}`}
                aria-label="Toggle light/dark theme"
                className="rounded-full size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                {themeMode === 'light' ? <Icon name="light_mode" size={18} /> : <Icon name="dark_mode" size={18} />}
              </button>
            )}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => {
                  setShowNotifications(prev => !prev);
                  if (markNotificationsRead) markNotificationsRead();
                }}
                title="Notifications"
                aria-label="Notifications"
                className="rounded-full size-9 text-foreground apple-glass-btn relative shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                id="notification-trigger"
              >
                <Icon name="notifications_active" size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                  </span>
                )}
              </button>
            </div>
            {user && (
              <button
                onClick={onProfileClick || (() => setCurrentView && setCurrentView('profile'))}
                title={user?.name ? `${user.name} (My Profile)` : "My Profile"}
                aria-label="Open Profile"
                className="rounded-full size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                <Icon name="person" size={19} />
              </button>
            )}
          </div>
        </header>
      ) : (
        <header aria-label="Top bar" className="topbar pointer-events-auto w-[98%] min-[400px]:w-[94%] sm:w-[85%] max-w-3xl mx-auto h-14 sm:h-16 px-3 sm:px-4 md:px-5 flex items-center justify-between rounded-full glass-apple text-foreground transition-all duration-300">
          
          {/* Left: Brand Logo & Quick Search */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (setCurrentView) setCurrentView('dashboard');
              }}
              className="flex items-center cursor-pointer transition-opacity hover:opacity-80 active:scale-95 outline-none no-underline border-none bg-transparent p-0 m-0 shadow-none"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}
              title="Kormiis Dashboard"
            >
              <img
                src={isDark ? kormiisWhiteLogo : kormiisLogo}
                alt="Kormiis Logo"
                className="h-7 sm:h-8 md:h-9 w-auto max-w-[120px] sm:max-w-[140px] object-contain shrink-0 drop-shadow-sm transition-opacity"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              />
            </a>

            {/* Data Integrity / Auto-Repair Alert (if discrepancies exist) */}
            {dataIntegrityIssues && dataIntegrityIssues.length > 0 && (
              <button
                onClick={() => setShowCorruptionModal && setShowCorruptionModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all cursor-pointer animate-pulse"
                title={`${dataIntegrityIssues.length} data discrepancies detected`}
              >
                <Icon name="warning" size={14} />
                <span className="hidden sm:inline">{dataIntegrityIssues.length}</span>
              </button>
            )}
          </div>

          {/* Right: Actions Group (Theme, Notification, Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showThemeToggle && (
              <button
                onClick={toggleTheme}
                title={`Switch Theme (Current: ${themeMode})`}
                aria-label="Toggle light/dark theme"
                className="rounded-full size-9 sm:size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                {themeMode === 'light' ? <Icon name="light_mode" size={18} /> : <Icon name="dark_mode" size={18} />}
              </button>
            )}

            {/* Notifications Trigger */}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => { 
                  setShowNotifications(prev => !prev); 
                  if (markNotificationsRead) markNotificationsRead();
                }}
                title="Notifications"
                aria-label="Notifications"
                className="rounded-full size-9 sm:size-9 text-foreground apple-glass-btn relative shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                id="notification-trigger"
              >
                <Icon name="notifications_active" size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                  </span>
                )}
              </button>
            </div>

            {/* User Profile Trigger Button */}
            {user && (
              <button
                onClick={onProfileClick || (() => setCurrentView && setCurrentView('profile'))}
                title={user?.name ? `${user.name} (My Profile)` : "My Profile"}
                aria-label="Open Profile"
                className="rounded-full size-9 sm:size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                <Icon name="person" size={19} />
              </button>
            )}
          </div>
        </header>
      )}

      {/* Mobile Notifications Dialog */}
      {showNotifications && isMobile && (
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="p-4 sm:p-6 pb-3">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                    <Icon name="notifications" size={18} />
                  </div>
                  <DialogTitle className="text-fluid-lg font-bold tracking-tight text-foreground m-0">Notifications</DialogTitle>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {filteredNotifications.length} Total
                </Badge>
              </div>
              <div className="flex gap-2 mt-3.5">
                <button 
                  onClick={() => setNotificationTab('all')}
                  className={`h-7.5 text-xs font-semibold rounded-full px-3.5 transition-all cursor-pointer ${
                    notificationTab === 'all' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'apple-glass-btn text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setNotificationTab('unread')}
                  className={`h-7.5 text-xs font-semibold rounded-full px-3.5 transition-all cursor-pointer ${
                    notificationTab === 'unread' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'apple-glass-btn text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-3 flex flex-col gap-1.5" style={{ scrollbarWidth: 'thin' }}>
              {filteredNotifications.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                  <Icon name="notifications_off" size={32} className="text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground m-0">No new notifications</p>
                </div>
              ) : (
                filteredNotifications.map(n => (
                  <div 
                    role="listitem" 
                    key={n.id} 
                    onClick={() => {
                      if (n.view && setCurrentView) {
                        setCurrentView(n.view);
                      }
                      if (markNotificationsRead) markNotificationsRead(n.id);
                      setShowNotifications(false);
                    }}
                    className={`p-3 px-3.5 rounded-2xl transition-all cursor-pointer border relative select-none ${
                      n.read 
                        ? 'hover:bg-white/20 dark:hover:bg-white/[0.06] border-transparent opacity-75 text-foreground/80' 
                        : 'bg-primary/10 hover:bg-primary/15 border-primary/25 shadow-xs text-foreground font-medium backdrop-blur-md'
                    }`}
                  >
                    {!n.read && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                      </span>
                    )}
                    <p className={`text-fluid-sm m-0 leading-snug text-foreground ${!n.read ? 'pl-3 font-semibold' : 'font-medium'}`}>{n.text}</p>
                    <span className={`text-[11px] block mt-1 text-muted-foreground ${!n.read ? 'pl-3' : ''}`}>{n.time}</span>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="p-3 px-6 bg-white/[0.04] dark:bg-black/20 pb-3 flex justify-between items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); if(clearNotifications) clearNotifications(); }} 
                className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
                className="liquid-glass-btn h-8 px-4 rounded-full text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Desktop Notifications Portal */}
      {showNotifications && !isMobile && createPortal(
        <>
          {/* Click-away overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed flex flex-col overflow-hidden rounded-3xl glass-popover text-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 p-0 z-50 border border-white/30 dark:border-white/12"
            style={{ top: `${modalPos.top}px`, right: `${modalPos.right}px`, width: '380px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 pb-3 flex flex-col gap-3 border-b border-border/80 dark:border-white/10 relative z-20">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2.5">
                  <div className="size-7.5 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                    <Icon name="notifications" size={17} />
                  </div>
                  <h2 className="text-fluid-lg font-bold tracking-tight text-foreground m-0 leading-none">Notifications</h2>
                </div>
                <Badge variant="secondary" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  {filteredNotifications.length} Total
                </Badge>
              </div>
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={() => setNotificationTab('all')}
                  className={`h-7.5 text-xs font-semibold rounded-full px-3.5 transition-all cursor-pointer ${
                    notificationTab === 'all' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'apple-glass-btn text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setNotificationTab('unread')}
                  className={`h-7.5 text-xs font-semibold rounded-full px-3.5 transition-all cursor-pointer ${
                    notificationTab === 'unread' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'apple-glass-btn text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[360px] overflow-y-auto p-3 flex flex-col gap-1.5" style={{ scrollbarWidth: 'thin' }}>
              {filteredNotifications.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
                  <Icon name="notifications_off" size={28} className="text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground m-0">No new notifications</p>
                </div>
              ) : (
                filteredNotifications.map(n => (
                  <div 
                    role="listitem" 
                    key={n.id} 
                    onClick={() => {
                      if (n.view && setCurrentView) {
                        setCurrentView(n.view);
                      }
                      if (markNotificationsRead) markNotificationsRead(n.id);
                      setShowNotifications(false);
                    }}
                    className={`p-3 px-3.5 rounded-2xl transition-all cursor-pointer border relative select-none ${
                      n.read 
                        ? 'hover:bg-white/20 dark:hover:bg-white/[0.06] border-transparent opacity-75 text-foreground/80' 
                        : 'bg-primary/10 hover:bg-primary/15 border-primary/25 shadow-xs text-foreground font-medium backdrop-blur-md'
                    }`}
                  >
                    {!n.read && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                      </span>
                    )}
                    <p className={`text-fluid-sm m-0 leading-snug text-foreground ${!n.read ? 'pl-3 font-semibold' : 'font-medium'}`}>{n.text}</p>
                    <span className={`text-[11px] block mt-1 text-muted-foreground ${!n.read ? 'pl-3' : ''}`}>{n.time}</span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 px-5 border-t border-border/80 dark:border-white/10 flex justify-between items-center bg-white/[0.04] dark:bg-black/20 rounded-b-3xl relative z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); if(clearNotifications) clearNotifications(); }} 
                className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
                className="liquid-glass-btn h-7.5 px-3.5 rounded-full text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Corruption / Data Integrity Modal */}
      {showCorruptionModal !== undefined && (
        <Dialog open={showCorruptionModal} onOpenChange={setShowCorruptionModal}>
          <DialogContent className="max-w-md bg-card border-destructive/20 shadow-2xl p-0 overflow-hidden sm:rounded-[24px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600 z-10" />
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 text-destructive shrink-0">
                  <Icon name="warning" size={22} />
                </div>
                Data Integrity Issues
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-2">
              <p className="text-fluid-sm text-muted-foreground leading-relaxed mb-4">
                We found {dataIntegrityIssues?.length || 0} discrepancies in your data. Clicking <strong>Auto-Repair</strong> will automatically clean up orphaned records, fix incorrect values, and rebuild your local cache to match the cloud database.
              </p>
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 mb-4">
                {(dataIntegrityIssues || []).map((issue, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-foreground">
                    <Icon name="error_outline" size={16} className="text-destructive shrink-0 mt-0.5" />
                    <span className="leading-tight font-medium text-xs sm:text-sm">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="p-4 px-6 bg-muted/10 pb-6 flex justify-end gap-3 mt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setShowCorruptionModal(false)} className="rounded-full font-semibold">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => { if(handleAutoRepairDatabase) handleAutoRepairDatabase(); }} 
                disabled={isSyncing}
                className="rounded-full shadow-lg shadow-destructive/20 font-bold px-6"
              >
                {isSyncing ? 'Repairing...' : 'Auto-Repair Database'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
