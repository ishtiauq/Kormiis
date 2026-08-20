import Icon from "@/components/ui/Icon.jsx"
import AttendancePage from './attendance/AttendancePage.jsx'

const leavesTabs = [
  { id: 'leave', label: 'Leave Requests', icon: <Icon name="calendar_month" size={15}/> },
  { id: 'policies', label: 'Leave Types & Quotas', icon: <Icon name="tune" size={15}/> },
]

export default function Leaves(props) {
  return <AttendancePage {...props} headline="Leaves" icon="event_busy" tabs={leavesTabs} defaultTab="leave" />
}