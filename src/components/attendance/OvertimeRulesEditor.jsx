import Icon from "@/components/ui/Icon.jsx"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function OvertimeRulesEditor({ overtimeRules = { multiplierWeekday: 1.5, multiplierWeekend: 2.0 }, setOvertimeRules }) {
  const update = (field, value) => setOvertimeRules(prev => ({ ...prev, [field]: value }))

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold m-0 text-foreground flex items-center gap-2">
            <Icon name="monitoring" size={18} className="text-muted-foreground" /> Overtime Rules
          </h3>
          <p className="text-sm text-muted-foreground m-0">Set the pay multipliers applied when calculating overtime claims.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Weekday Multiplier</label>
            <Input type="number" step="0.1" value={overtimeRules.multiplierWeekday} onChange={e => update('multiplierWeekday', parseFloat(e.target.value) || 1)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Weekend/Holiday Multiplier</label>
            <Input type="number" step="0.1" value={overtimeRules.multiplierWeekend} onChange={e => update('multiplierWeekend', parseFloat(e.target.value) || 1)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}