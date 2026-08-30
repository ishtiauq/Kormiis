import Icon from "@/components/ui/Icon.jsx"
import AttendancePage from './attendance/AttendancePage.jsx'

const attendanceTabs = [
  { id: 'daily', label: 'Daily Logs', icon: <Icon name="schedule" size={15}/> },
  { id: 'leave', label: 'Leaves', icon: <Icon name="event_busy" size={15}/> },
  { id: 'roster', label: 'Roster', icon: <Icon name="swap_vert" size={15}/> },
  { id: 'overtime', label: 'Overtime', icon: <Icon name="memory" size={15}/> },
  { id: 'geofence', label: 'Office Geofence', icon: <Icon name="pin_drop" size={15}/> },
]

export default function Attendance(props) {
  return <AttendancePage {...props} headline="Attendance & Leaves" icon="schedule" tabs={attendanceTabs} defaultTab={props.defaultTab || 'daily'} />
}