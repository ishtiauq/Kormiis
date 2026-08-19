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
      {/* Apple Liquid Glass Floating Capsule Navbar */}
      <header 
        aria-label="Top Navigation Bar" 
        className="topbar pointer-events-auto w-[calc(100%-1rem)] sm:w-[94%] md:w-[90%] max-w-4xl mx-auto h-13 sm:h-15 md:h-16 px-2.5 sm:px-4 md:px-5 flex items-center justify-between rounded-full glass-kormiis text-foreground transition-all duration-300 relative select-none shadow-xl"
      >
        {/* Left: Brand Logo Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setCurrentView && setCurrentView('dashboard')}
            className="flex items-center px-2 sm:px-2.5 py-1 rounded-full apple-glass-btn cursor-pointer transition-all active:scale-95 group"
            title="Kormiis Dashboard"
          >
            <img 
              src={isDark ? kormiisWhiteLogo : kormiisLogo} 
              alt="Kormiis Logo" 
              className="h-7 sm:h-8 md:h-9 w-auto max-w-[120px] sm:max-w-[150px] object-contain shrink-0 drop-shadow-sm group-hover:opacity-90 transition-opacity" 
            />
          </button>
        </div>

        {/* Center: Apple Spotlight Search Trigger (Hidden on very small screens, visible on md+) */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full apple-glass-btn text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer transition-all shrink-0 max-w-[240px] w-full"
            title="Search actions, pages, and employees (⌘K)"
          >
            <Icon name="search" size={16} className="text-muted-foreground" />
            <span className="truncate flex-1 text-left">Search or jump to...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-background/60 dark:bg-white/10 rounded-md border border-border/50 text-foreground/80">⌘K</kbd>
          </button>
        )}

        {/* Right: Actions Group (Live Status, Theme, Notification, Profile) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
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

          {/* Live / Offline Status Beacon */}
          {isOnline ? (
            <div 
              className="hidden min-[480px]:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase apple-glass-btn text-foreground select-none"
              title="Realtime cloud connection active"
            >
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-extrabold text-foreground">LIVE</span>
            </div>
          ) : (
            <div 
              className="hidden min-[480px]:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase text-muted-foreground apple-glass-btn select-none"
              title="Offline mode - changes stored locally"
            >
              <span className="size-2 rounded-full bg-muted-foreground/60"></span>
              <span>OFFLINE</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          {showThemeToggle && (
            <button
              onClick={toggleTheme}
              title={`Switch Theme (Current: ${themeMode})`}
              aria-label="Toggle light/dark theme"
              className="rounded-full size-8 sm:size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer"
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
              className="rounded-full size-8 sm:size-9 text-foreground apple-glass-btn relative shrink-0 flex items-center justify-center cursor-pointer"
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

          {/* User Profile Avatar Pill */}
          {user && (
            <button
              onClick={onProfileClick || (() => setCurrentView && setCurrentView('profile'))}
              title={user?.name ? `${user.name} (My Profile)` : "My Profile"}
              aria-label="Open Profile"
              className="rounded-full size-8 sm:size-9 p-0.5 overflow-hidden shrink-0 apple-glass-btn cursor-pointer flex items-center justify-center ring-1 ring-white/30 dark:ring-white/15 hover:ring-primary/50 transition-all"
            >
              <img
                src={user?.avatar || "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                alt={user?.name ? `${user.name}'s profile` : "Profile"}
                className="w-full h-full object-cover rounded-full"
              />
            </button>
          )}

        </div>
      </header>

      {/* Mobile Notifications Dialog */}
      {showNotifications && isMobile && (
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogContent className="sm:max-w-[425px] p-0">
            <DialogHeader className="p-4 px-6 border-b border-border/50 bg-muted/20 pb-3">
              <div className="flex justify-between items-center w-full">
                <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground leading-none">Notifications</DialogTitle>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {filteredNotifications.length} Total
                </Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant={notificationTab === 'all' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setNotificationTab('all')}
                  className="h-7 text-xs rounded-full px-4"
                >
                  All
                </Button>
                <Button 
                  variant={notificationTab === 'unread' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setNotificationTab('unread')}
                  className="h-7 text-xs rounded-full px-4"
                >
                  Unread
                </Button>
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No new notifications</div>
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
                    className={`p-3 px-4 rounded-xl transition-colors cursor-pointer my-1 border relative ${n.read ? 'bg-background hover:bg-muted/50 border-transparent opacity-70' : 'bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-sm'}`}
                  >
                    {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                    <p className={`text-fluid-sm m-0 leading-relaxed text-foreground ${!n.read ? 'pl-2 font-semibold' : 'font-medium'}`}>{n.text}</p>
                    <span className={`text-[11px] block mt-1.5 text-muted-foreground ${!n.read ? 'pl-2' : ''}`}>{n.time}</span>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="p-3 px-6 bg-muted/10 pb-3">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); if(clearNotifications) clearNotifications(); }} 
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
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
            className="fixed flex flex-col overflow-hidden rounded-2xl border border-border bg-background text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 p-0 z-50"
            style={{ top: `${modalPos.top}px`, right: `${modalPos.right}px`, width: '380px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-primary z-10" />
            <div className="p-4 px-6 flex flex-col gap-4 border-b border-border/50 bg-muted/20 relative z-20">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground leading-none">Notifications</h2>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {filteredNotifications.length} Total
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={notificationTab === 'all' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setNotificationTab('all')}
                  className="h-7 text-xs rounded-full px-4"
                >
                  All
                </Button>
                <Button 
                  variant={notificationTab === 'unread' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setNotificationTab('unread')}
                  className="h-7 text-xs rounded-full px-4"
                >
                  Unread
                </Button>
              </div>
            </div>
            <div className="max-h-[350px] overflow-y-auto p-2">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No new notifications</div>
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
                    className={`p-3 px-4 rounded-xl transition-colors cursor-pointer my-1 border relative ${n.read ? 'bg-background hover:bg-muted/50 border-transparent opacity-70' : 'bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-sm'}`}
                  >
                    {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                    <p className={`text-fluid-sm m-0 leading-relaxed text-foreground ${!n.read ? 'pl-2 font-semibold' : 'font-medium'}`}>{n.text}</p>
                    <span className={`text-[11px] block mt-1.5 text-muted-foreground ${!n.read ? 'pl-2' : ''}`}>{n.time}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 px-6 border-t border-border/50 mt-2 shrink-0 pb-4 bg-muted/5 relative z-20">
              <div className="flex justify-between items-center w-full">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); if(clearNotifications) clearNotifications(); }} 
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
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
