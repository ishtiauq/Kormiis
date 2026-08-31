import TooltipPopover from '../TooltipPopover.jsx'
import { X, Shield, User as UserIcon, BadgeCheck, Building2, LogOut, ArrowLeftRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog"

export default function Sidebar({
  visibleNavItems, isCollapsed, isDarkMode, currentView, setCurrentView,
  mobileMenuOpen, toggleSidebar, user, simulatedRole,
  showRoleModal, setShowRoleModal, handleLogout,
  setIsCollapsed, setSimulatedRole, setMobileMenuOpen
}) {
  return (
    <>
      {/* Mobile fullscreen overlay backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      <aside 
        aria-label="Sidebar navigation" 
        className={`
          flex flex-col shrink-0 relative z-50 bg-sidebar text-sidebar-foreground
          transition-all duration-300 ease-in-out overflow-hidden
          ${mobileMenuOpen 
            ? 'fixed inset-0 w-full max-w-full border-r-0 shadow-2xl h-full rounded-none' 
            : 'hidden md:flex my-6 md:my-8 lg:my-10 ml-4 md:ml-6 lg:ml-8 rounded-2xl shadow-lg border border-sidebar-border h-[calc(100vh-3rem)] md:h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)]'}
        `}
        style={{
          width: isCollapsed && !mobileMenuOpen ? '64px' : (mobileMenuOpen ? '100%' : 'max-content'),
        }}
      >
      
        {/* HEADER SECTION */}
        <div className="shrink-0 p-3 pb-2 flex flex-col">
          {/* Mobile: close button row */}
          {mobileMenuOpen && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-bold text-sidebar-foreground/80">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="size-9 flex items-center justify-center rounded-xl bg-sidebar-accent/50 text-sidebar-foreground border border-sidebar-border hover:bg-sidebar-accent transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Desktop: collapse toggle */}
          {!mobileMenuOpen && (
            <TooltipPopover label="Expand Sidebar" isCollapsed={isCollapsed} isDarkMode={isDarkMode}>
              <button 
                id="sidebar-toggle" 
                aria-label="Toggle sidebar" 
                className="collapse-btn flex items-center rounded-xl cursor-pointer shrink-0 relative overflow-hidden w-full h-10 bg-sidebar-accent/50 text-sidebar-foreground border border-sidebar-border hover:bg-sidebar-accent transition-all duration-200 px-3"
                onClick={toggleSidebar} 
                style={{
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: isCollapsed ? '0' : '10px'
                }}
              >
                <span className="flex items-center justify-center size-5 shrink-0 transition-transform duration-300" style={{
                  transform: isCollapsed ? 'rotate(180deg)' : 'none'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </span>
                <span className="text-xs font-bold leading-5 whitespace-nowrap tracking-tight transition-[opacity,max-width] duration-300 overflow-hidden" style={{
                  opacity: isCollapsed ? 0 : 1,
                  maxWidth: isCollapsed ? 0 : '150px'
                }}>Collapse</span>
              </button>
            </TooltipPopover>
          )}
        </div>

        {/* MIDDLE SCROLLABLE NAV AREA */}
        <nav 
          aria-label="Main navigation" 
          className="sidebar-nav-scroll flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2"
        >
          {visibleNavItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <TooltipPopover key={item.id} label={item.label} isCollapsed={isCollapsed && !mobileMenuOpen} isDarkMode={isDarkMode}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={item.label}
                  className={`${isActive ? 'active bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'} flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer h-9 box-border transition-colors duration-200 relative no-underline shrink-0`}
                  data-active={isActive ? 'true' : 'false'}
                  data-label={item.label}
                  onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentView(item.id); setMobileMenuOpen(false); }}}
                >
                  {/* Icon */}
                  <div className="size-6 flex items-center justify-center rounded-lg shrink-0">
                    {item.icon}
                  </div>
                  
                  {/* Label: always visible on mobile, animated on desktop */}
                  <span className="text-sm font-medium leading-5 whitespace-nowrap transition-[opacity,max-width] duration-300 overflow-hidden" style={{
                    opacity: (mobileMenuOpen || !isCollapsed) ? 1 : 0,
                    maxWidth: (mobileMenuOpen || !isCollapsed) ? '300px' : 0,
                  }}>{item.label}</span>
                </div>
              </TooltipPopover>
            )
          })}
        </nav>

        {/* FOOTER SECTION */}
        <div className="shrink-0 p-3 pt-4 flex flex-col gap-1 border-t border-sidebar-border bg-sidebar/80">
          
          {/* USER PROFILE */}
          <div className="flex items-center gap-3 mb-2 px-2">
            <img 
              src={user?.avatar || "https://i.pravatar.cc/150?u=a042581f4e29026704d"} 
              className="rounded-full object-cover shrink-0 relative w-8 h-8 shadow-sm border border-sidebar-border/50" 
              alt={user?.name ? `${user.name}'s avatar` : "User avatar"} 
            />
            <div className="overflow-hidden whitespace-nowrap flex-1 min-w-0 transition-[opacity,max-width] duration-300 pr-2" style={{
              opacity: (mobileMenuOpen || !isCollapsed) ? 1 : 0,
              maxWidth: (mobileMenuOpen || !isCollapsed) ? '300px' : 0,
            }}>
              <p className="text-sm font-semibold m-0 text-sidebar-foreground break-words leading-tight">{user?.name || "Ishtiaq Rizve"}</p>
              <p className="text-[11px] font-medium m-0 text-sidebar-foreground/70 break-words">{simulatedRole || user?.role || "Admin"}</p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <TooltipPopover label="Switch Role" isCollapsed={isCollapsed && !mobileMenuOpen} isDarkMode={isDarkMode}>
            <button
              onClick={() => setShowRoleModal && setShowRoleModal(true)}
              className="btn-shimmer w-full flex items-center gap-3 px-3 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors cursor-pointer h-9 box-border border-none"
            >
              <div className="size-6 flex items-center justify-center shrink-0">
                <ArrowLeftRight size={16} />
              </div>
              <span className="whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300 text-left font-medium text-xs pr-2" style={{
                opacity: (mobileMenuOpen || !isCollapsed) ? 1 : 0,
                maxWidth: (mobileMenuOpen || !isCollapsed) ? '300px' : 0,
              }}>Switch Role</span>
            </button>
          </TooltipPopover>
          
          <TooltipPopover label="Logout" isCollapsed={isCollapsed && !mobileMenuOpen} isDarkMode={isDarkMode}>
            <button
              onClick={handleLogout}
              className="btn-shimmer mt-1 w-full flex items-center gap-3 px-3 rounded-md bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-colors cursor-pointer h-9 box-border border-none"
            >
              <div className="size-6 flex items-center justify-center shrink-0">
                <LogOut size={16} />
              </div>
              <span className="whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300 text-left font-medium text-xs pr-2" style={{
                opacity: (mobileMenuOpen || !isCollapsed) ? 1 : 0,
                maxWidth: (mobileMenuOpen || !isCollapsed) ? '300px' : 0,
              }}>Logout</span>
            </button>
          </TooltipPopover>
        </div>
      </aside>

      {/* Role Switch Modal */}
      <AlertDialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Switch Role</AlertDialogTitle>
              <button onClick={() => setShowRoleModal(false)} className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <AlertDialogDescription>Choose a role to simulate. Permissions and visible modules will adjust accordingly.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {[
              { id: 'Admin', label: 'Admin', icon: Shield, desc: 'Full access to all modules' },
              { id: 'HR Manager', label: 'HR Manager', icon: BadgeCheck, desc: 'Manage employees, attendance, announcements' },
              { id: 'Payroll Manager', label: 'Payroll Manager', icon: Building2, desc: 'Manage payroll, expenses, reimbursements' },
              { id: 'Employee', label: 'Employee', icon: UserIcon, desc: 'Self-service portal access' },
            ].map(role => (
              <button
                key={role.id}
                onClick={() => { setSimulatedRole(role.id); setShowRoleModal(false) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer border ${
                  simulatedRole === role.id
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/40 text-foreground border-border hover:bg-muted'
                }`}
              >
                <div className="size-9 flex items-center justify-center rounded-lg bg-background border border-border shrink-0">
                  <role.icon size={16} />
                </div>
                <div className="flex flex-col">
                  <span>{role.label}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">{role.desc}</span>
                </div>
                {simulatedRole === role.id && (
                  <span className="ml-auto text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">Active</span>
                )}
              </button>
            ))}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scoped scrollbar styles */}
      <style>{`
        .sidebar-nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s ease;
        }
        .sidebar-nav-scroll:hover {
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
        }
        .dark .sidebar-nav-scroll:hover {
          scrollbar-color: hsl(0 0% 30%) transparent;
        }

        /* Webkit scrollbar */
        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 9999px;
          transition: background 0.3s ease;
        }
        .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
        }
        .dark .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes shimmer-slide {
          0% { transform: translateX(-150%) skewX(-20deg); }
          30% { transform: translateX(150%) skewX(-20deg); }
          100% { transform: translateX(150%) skewX(-20deg); }
        }
        .btn-shimmer {
          position: relative;
          overflow: hidden;
        }
        .btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.2) 80%, transparent);
          animation: shimmer-slide 4s infinite ease-in-out;
        }
      `}</style>
    </>
  )
}
