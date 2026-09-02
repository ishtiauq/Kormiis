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

      {/* Scrollable list — never expands, scrolls within 2-slot height */}
      <div className="flex-1 min-h-0 overflow-y-auto max-h-[360px] lg:max-h-[480px] divide-y divide-border/40 dark:divide-white/6 chat-scrollbar px-2.5 sm:px-3 pb-3.5">
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
          filtered.map((emp) => (
            <div key={emp.id} className="flex items-start gap-3 py-3 first:pt-2 last:pb-1">
              <Avatar className="size-9 shrink-0 rounded-xl ring-1 ring-border/60 dark:ring-white/10">
                {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                <AvatarFallback className="bg-primary/10 text-primary rounded-xl text-[11px] font-bold">
                  {(emp.name || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-xs font-bold text-foreground break-words">{emp.name}</span>
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-[11px] text-muted-foreground min-w-0">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Icon name="call" size={12} className="shrink-0 opacity-80" />
                    {emp.phone || emp.mobileNumber ? (
                      <span className="break-all">{emp.phone || emp.mobileNumber}</span>
                    ) : (
                      <span className="italic text-muted-foreground/70">No phone added yet</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Icon name="mail" size={12} className="shrink-0 opacity-80" />
                    {emp.email ? (
                      <span className="break-all">{emp.email}</span>
                    ) : (
                      <span className="italic text-muted-foreground/70">No email added yet</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardWidget>
  )
})

EmployeeDirectoryWidget.displayName = 'EmployeeDirectoryWidget'