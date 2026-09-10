import { memo, useMemo, useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { DashboardWidget } from '../Dashboard.jsx'

export const EmployeeDirectoryWidget = memo(({ employees = [], setCurrentView, ...wProps }) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...employees]
      .filter(e => e.status !== 'Terminated')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .filter(e => {
        if (!query) return true
        const name = (e.name || '').toLowerCase()
        const email = (e.email || '').toLowerCase()
        const phone = (e.phone || e.mobileNumber || '').toLowerCase()
        return name.includes(query) || email.includes(query) || phone.includes(query)
      })
  }, [employees, search])

  return (
    <DashboardWidget
      id="directory"
      title="Team Directory"
      icon={<Icon name="group" className="text-foreground shrink-0" size={22}/>}
      action={
        <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-xs font-semibold border-black/10 dark:border-white/12 text-foreground bg-black/[0.04] dark:bg-white/[0.06] shrink-0">
          {employees.length} members
        </Badge>
      }
      contentClass="flex flex-col p-0 pt-1 overflow-hidden"
      {...wProps}
    >
      {/* Search */}
      <div className="relative flex items-center px-2.5 sm:px-3 pt-2 pb-2.5 w-full">
        <Icon name="search" size={18} className="absolute left-4.5 sm:left-5 text-muted-foreground z-10 pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members..."
          aria-label="Search team members"
          className="!pl-10.5 h-11 rounded-2xl w-full bg-muted/40"
        />
      </div>

      {/* Scrollable list container */}
      <div className="flex-1 min-h-0 w-full px-2.5 sm:px-3 pt-1 pb-3 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 chat-scrollbar px-0.5 py-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
              <Icon name="group_off" size={34} className="text-muted-foreground/40" />
              <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[220px] leading-relaxed">
                {employees.length === 0 ? 'No team members enlisted yet.' : 'No team members match your search.'}
              </p>
              {employees.length === 0 && setCurrentView && (
                <button
                  onClick={() => setCurrentView('employees')}
                  className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer mt-1"
                >
                  View Team Directory
                </button>
              )}
            </div>
          ) : (
            filtered.map((emp) => {
              const phone = emp.phone || emp.mobileNumber || ''
              const email = emp.email || ''
              const subtitle = emp.designation || emp.role || emp.department || 'Team Member'

              return (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border border-black/10 dark:border-white/12 bg-black/[0.02] dark:bg-white/[0.03] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="size-9 shrink-0 rounded-2xl ring-1 ring-border/60 dark:ring-white/10">
                      {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                      <AvatarFallback className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-2xl text-[11px] font-bold">
                        {(emp.name || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground break-words leading-tight">{emp.name}</span>
                      <span className="text-[11px] font-medium text-muted-foreground break-words leading-tight mt-0.5">
                        {subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Right Quick Action Icons: Direct Call & Mail without background boxes */}
                  <div className="flex items-center gap-2 shrink-0">
                    {phone ? (
                      <a
                        href={`tel:${phone}`}
                        title={`Call ${emp.name}: ${phone}`}
                        aria-label={`Call ${emp.name}`}
                        className="p-1 flex items-center justify-center text-foreground/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer active:scale-90"
                      >
                        <Icon name="call" size={18} />
                      </a>
                    ) : (
                      <span
                        title="No phone number added"
                        className="p-1 flex items-center justify-center text-muted-foreground/30 cursor-not-allowed select-none"
                      >
                        <Icon name="call" size={18} />
                      </span>
                    )}

                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        title={`Email ${emp.name}: ${email}`}
                        aria-label={`Email ${emp.name}`}
                        className="p-1 flex items-center justify-center text-foreground/70 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer active:scale-90"
                      >
                        <Icon name="mail" size={18} />
                      </a>
                    ) : (
                      <span
                        title="No email address added"
                        className="p-1 flex items-center justify-center text-muted-foreground/30 cursor-not-allowed select-none"
                      >
                        <Icon name="mail" size={18} />
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </DashboardWidget>
  )
})

EmployeeDirectoryWidget.displayName = 'EmployeeDirectoryWidget'