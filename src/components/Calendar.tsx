import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Event {
  id: number
  title: string
  date: Date
  color: string
  type: "meeting" | "deadline" | "event" | "reminder"
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12 AM"
  if (i < 12) return `${i} AM`
  if (i === 12) return "12 PM"
  return `${i - 12} PM`
})

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
}

function getEventsForDate(events: Event[], date: Date) {
  return events.filter(e => isSameDay(e.date, date))
}

function Legend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground">Event Types:</span>
      <div className="flex items-center gap-4">
        {[
          { color: "bg-blue-500",   label: "Meeting"  },
          { color: "bg-red-500",    label: "Deadline" },
          { color: "bg-purple-500", label: "Event"    },
          { color: "bg-green-500",  label: "Reminder" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2.5 h-2.5 ${color} rounded`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MONTH VIEW ──────────────────────────────────────────────────────────────
function MonthView({ events }: { events: Event[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = useMemo(() => new Date(year, month, 1).getDay(), [year, month])
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number | null; date: Date | null }> = []
    for (let i = 0; i < firstDayOfMonth; i++) days.push({ day: null, date: null })
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, date: new Date(year, month, i) })
    return days
  }, [firstDayOfMonth, daysInMonth, year, month])

  const isToday = (date: Date) => isSameDay(date, new Date())
  const isSelected = (date: Date) => selectedDate ? isSameDay(date, selectedDate) : false

  const selectedDateEvents = useMemo(() =>
    selectedDate ? getEventsForDate(events, selectedDate) : [],
    [selectedDate, events])

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-semibold">{MONTHS[month]} {year}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8"
              onClick={() => { const t = new Date(); setCurrentDate(t); setSelectedDate(t) }}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentDate(new Date(year, month - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setCurrentDate(new Date(year, month + 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 bg-muted/20 border-b border-border">
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-3 border-r border-border last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (!day.date || !day.day) {
              return <div key={index} className="relative min-h-[120px] p-2 border-b border-r border-border last:border-r-0 bg-muted/10" />
            }
            const dayEvents = getEventsForDate(events, day.date)
            const todayDate = isToday(day.date)
            const selectedDate_ = isSelected(day.date)
            return (
              <button key={index}
                onClick={() => setSelectedDate(day.date)}
                className={`relative min-h-[120px] p-2 border-b border-r border-border last:border-r-0 text-left align-top transition-colors bg-background hover:bg-accent/50
                  ${todayDate ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}
                  ${selectedDate_ ? "bg-primary/5 ring-2 ring-inset ring-primary/30" : ""}`}>
                <span className={`absolute top-2 right-2 text-sm font-medium
                  ${todayDate ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold" : ""}`}>
                  {day.day}
                </span>
                <div className="space-y-1 mt-8">
                  {dayEvents.slice(0, 3).map(event => (
                    <div key={event.id}
                      className={`text-[10px] leading-tight ${event.color} text-white px-1.5 py-0.5 rounded truncate font-medium`}
                      title={event.title}>
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground font-medium pl-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : "Select a date"}
            </h3>
            {selectedDate && (
              <Button size="sm" variant="outline" className="h-8">
                <Plus className="size-3 mr-1" />Add Event
              </Button>
            )}
          </div>
          <Legend />
        </div>
        {selectedDate && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDateEvents.length > 0 ? selectedDateEvents.map(event => (
                <div key={event.id} className="group p-4 border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-background">
                  <div className="flex items-start gap-3">
                    <div className={`w-1 self-stretch ${event.color} rounded-full flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">{event.title}</h4>
                      <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        <span className={`w-2 h-2 ${event.color} rounded-full`} />{event.type}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p className="text-sm mb-3">No events scheduled for this date</p>
                  <Button size="sm" variant="outline"><Plus className="size-3 mr-1" />Add Event</Button>
                </div>
              )}
            </div>
          </div>
        )}
        {!selectedDate && (
          <div className="text-center py-16 text-muted-foreground"><p className="text-sm">Click on a date to view events</p></div>
        )}
      </div>
    </div>
  )
}

// ─── WEEK VIEW ───────────────────────────────────────────────────────────────
function WeekView({ events }: { events: Event[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const weekStart = useMemo(() => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentDate])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }), [weekStart])

  const goToPrevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d) }
  const goToNextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d) }

  const weekLabel = useMemo(() => {
    const end = weekDays[6]
    const s = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${s} – ${e}`
  }, [weekStart, weekDays])

  const today = new Date()
  const currentHour = today.getHours()

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-semibold">{weekLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevWeek}><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <div className="min-w-[640px]">
            {/* Day column headers */}
            <div className="grid border-b border-border bg-muted/20 sticky top-0 z-10" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <div className="border-r border-border" />
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                return (
                  <div key={i} className={`text-center py-3 border-r border-border last:border-r-0 ${isToday ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}>
                    <div className="text-xs font-semibold text-muted-foreground">{DAYS[day.getDay()]}</div>
                    <div className={`text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* All-day row */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <div className="border-r border-border flex items-center justify-center py-1">
                <span className="text-[10px] text-muted-foreground select-none">All day</span>
              </div>
              {weekDays.map((day, i) => {
                const dayEvents = getEventsForDate(events, day)
                const isToday = isSameDay(day, today)
                return (
                  <div key={i} className={`min-h-[36px] p-1 border-r border-border last:border-r-0 space-y-0.5 ${isToday ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`}>
                    {dayEvents.map(event => (
                      <div key={event.id}
                        className={`text-[10px] leading-tight ${event.color} text-white px-1.5 py-0.5 rounded truncate font-medium`}
                        title={event.title}>
                        {event.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            {/* Hour rows */}
            {HOURS.map((label, hour) => (
              <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="border-r border-border text-[10px] text-muted-foreground text-right pr-2 pt-1.5 select-none leading-none">{label}</div>
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, today)
                  const isCurrentHour = isToday && currentHour === hour
                  return (
                    <div key={i} className={`h-14 border-r border-border last:border-r-0 relative
                      ${isToday ? "bg-blue-50/20 dark:bg-blue-950/10" : ""}
                      ${isCurrentHour ? "bg-blue-100/40 dark:bg-blue-900/20" : ""}`}>
                      {isCurrentHour && (
                        <div className="absolute left-0 right-0 top-0 flex items-center pointer-events-none">
                          <div className="w-2 h-2 rounded-full bg-primary -ml-1 shrink-0 z-10" />
                          <div className="flex-1 border-t-2 border-primary" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg px-6 py-3 flex items-center">
        <Legend />
      </div>
    </div>
  )
}

// ─── DAY VIEW ────────────────────────────────────────────────────────────────
function DayView({ events }: { events: Event[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const goToPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d) }
  const goToNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d) }

  const dayLabel = currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  const isToday = isSameDay(currentDate, new Date())
  const dayEvents = useMemo(() => getEventsForDate(events, currentDate), [currentDate, events])
  const currentHour = new Date().getHours()

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="bg-card border border-border rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {dayLabel}
            {isToday && <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Today</span>}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrev}><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNext}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <div className="min-w-[300px]">
            {dayEvents.length > 0 && (
              <div className="flex border-b border-border">
                <div className="w-16 shrink-0 border-r border-border text-[10px] text-muted-foreground text-right pr-2 flex items-center justify-end py-2 select-none">
                  All day
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {dayEvents.map(event => (
                    <div key={event.id}
                      className={`text-xs leading-tight ${event.color} text-white px-2 py-1 rounded font-medium flex items-center gap-2`}>
                      <span>{event.title}</span>
                      <span className="opacity-75 capitalize text-[10px]">· {event.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {HOURS.map((label, hour) => {
              const isCurrentHour = isToday && currentHour === hour
              return (
                <div key={hour} className="flex border-b border-border last:border-b-0">
                  <div className={`w-16 shrink-0 border-r border-border text-[10px] text-right pr-2 pt-2 select-none leading-none
                    ${isCurrentHour ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {label}
                  </div>
                  <div className={`flex-1 h-14 relative ${isCurrentHour ? "bg-blue-50/40 dark:bg-blue-900/20" : ""}`}>
                    {isCurrentHour && (
                      <div className="absolute left-0 right-0 top-0 flex items-center pointer-events-none">
                        <div className="w-2 h-2 rounded-full bg-primary -ml-1 shrink-0 z-10" />
                        <div className="flex-1 border-t-2 border-primary" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg px-6 py-3 flex items-center">
        <Legend />
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function Calendar({ view = "month" }: { view?: "month" | "week" | "day" }) {
  const events = SAMPLE_EVENTS
  if (view === "week") return <WeekView events={events} />
  if (view === "day")  return <DayView  events={events} />
  return <MonthView events={events} />
}

const SAMPLE_EVENTS: Event[] = [
  { id: 1,  title: "Team Meeting",        date: new Date(2026, 1, 18), color: "bg-blue-500",   type: "meeting"  },
  { id: 2,  title: "Project Deadline",    date: new Date(2026, 1, 20), color: "bg-red-500",    type: "deadline" },
  { id: 3,  title: "Birthday Party",      date: new Date(2026, 1, 22), color: "bg-purple-500", type: "event"    },
  { id: 4,  title: "Doctor Appointment",  date: new Date(2026, 1, 25), color: "bg-green-500",  type: "reminder" },
  { id: 5,  title: "Conference Call",     date: new Date(2026, 1, 17), color: "bg-blue-500",   type: "meeting"  },
  { id: 6,  title: "Client Presentation", date: new Date(2026, 1, 17), color: "bg-blue-500",   type: "meeting"  },
  { id: 7,  title: "Code Review",         date: new Date(2026, 1, 19), color: "bg-blue-500",   type: "meeting"  },
  { id: 8,  title: "Sprint Planning",     date: new Date(2026, 1, 23), color: "bg-blue-500",   type: "meeting"  },
  { id: 9,  title: "Report Submission",   date: new Date(2026, 1, 21), color: "bg-red-500",    type: "deadline" },
  { id: 10, title: "Workshop",            date: new Date(2026, 1, 24), color: "bg-purple-500", type: "event"    },
  { id: 11, title: "Lunch with Team",     date: new Date(2026, 1, 20), color: "bg-purple-500", type: "event"    },
  { id: 12, title: "Follow-up Email",     date: new Date(2026, 1, 18), color: "bg-green-500",  type: "reminder" },
]


