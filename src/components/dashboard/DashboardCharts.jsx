import { useMemo, useState } from 'react'
import { BarChart3, Flag, PieChart, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Avatar } from './DashboardShared'
import { getUserFullName } from './dashboardUtils'

const STATUS_STYLE = {
  1: { label: 'Do zrobienia', color: '#71717a', dotClass: 'bg-zinc-500' },
  2: { label: 'W trakcie', color: '#3b82f6', dotClass: 'bg-blue-500' },
  3: { label: 'Zrobione', color: '#10b981', dotClass: 'bg-emerald-500' },
  4: { label: 'Anulowane', color: '#ef4444', dotClass: 'bg-red-500' },
}

const PRIORITY_STYLE = {
  4: { label: 'Pilny', barClass: 'bg-red-500', textClass: 'text-red-300', dotClass: 'bg-red-500' },
  3: { label: 'Wysoki', barClass: 'bg-orange-500', textClass: 'text-orange-300', dotClass: 'bg-orange-500' },
  2: { label: 'Normalny', barClass: 'bg-sky-500', textClass: 'text-sky-300', dotClass: 'bg-sky-500' },
  1: { label: 'Niski', barClass: 'bg-zinc-500', textClass: 'text-zinc-400', dotClass: 'bg-zinc-500' },
}

function normalizeStatusDistribution(raw) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item) => {
      const id = Number(item.status_id ?? item.id ?? 0)
      const meta = STATUS_STYLE[id] || {
        label: item.name || item.label || `Status #${id}`,
        color: '#a1a1aa',
        dotClass: 'bg-zinc-400',
      }
      return {
        id: id || item.name,
        label: item.name || item.label || meta.label,
        count: Number(item.count ?? item.value ?? 0),
        color: meta.color,
        dotClass: meta.dotClass,
      }
    })
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const entries = [
      { id: 1, count: Number(raw.todo ?? raw.do_zrobienia ?? raw[1] ?? 0) },
      { id: 2, count: Number(raw.in_progress ?? raw.w_trakcie ?? raw[2] ?? 0) },
      { id: 3, count: Number(raw.done ?? raw.completed ?? raw.zrobione ?? raw[3] ?? 0) },
      { id: 4, count: Number(raw.cancelled ?? raw.anulowane ?? raw[4] ?? 0) },
    ]
    return entries.map((e) => ({
      ...e,
      ...STATUS_STYLE[e.id],
    }))
  }

  return [1, 2, 3, 4].map((id) => ({
    id,
    ...STATUS_STYLE[id],
    count: 0,
  }))
}

function normalizePriorityDistribution(raw) {
  const byId = new Map()

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const id = Number(item.priority_id ?? item.id ?? 0)
      if (!id) return
      byId.set(id, {
        id,
        label: item.name || item.label || PRIORITY_STYLE[id]?.label || `Priorytet #${id}`,
        count: Number(item.count ?? item.value ?? 0),
      })
    })
  } else if (raw && typeof raw === 'object') {
    const mapping = [
      { id: 4, count: raw.urgent ?? raw.pilny ?? raw[4] ?? 0 },
      { id: 3, count: raw.high ?? raw.wysoki ?? raw[3] ?? 0 },
      { id: 2, count: raw.normal ?? raw.normalny ?? raw[2] ?? 0 },
      { id: 1, count: raw.low ?? raw.niski ?? raw[1] ?? 0 },
    ]
    mapping.forEach((m) => {
      byId.set(m.id, {
        id: m.id,
        label: PRIORITY_STYLE[m.id].label,
        count: Number(m.count ?? 0),
      })
    })
  }

  return [4, 3, 2, 1].map((id) => {
    const found = byId.get(id)
    const style = PRIORITY_STYLE[id]
    return {
      id,
      label: found?.label || style.label,
      count: found?.count ?? 0,
      barClass: style.barClass,
      textClass: style.textClass,
      dotClass: style.dotClass,
    }
  })
}

function normalizeEmployeeWorkload(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((emp) => {
    const id = emp.employee_id ?? emp.user_id ?? emp.id
    const inProgress = Number(emp.in_progress ?? emp.in_progress_count ?? 0)
    const todo = Number(emp.todo ?? emp.todo_count ?? 0)
    const overdue = Number(emp.overdue ?? emp.overdue_count ?? 0)
    const done = Number(emp.done ?? emp.completed ?? emp.done_count ?? emp.completed_count ?? 0)
    const total = Number(emp.total_active ?? emp.total ?? emp.total_assigned ?? inProgress + todo + overdue)

    return {
      id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      avatar_color: emp.avatar_color,
      name: emp.name || emp.full_name || getUserFullName(emp),
      position: emp.position_name || emp.position?.name || emp.position || '',
      inProgress,
      todo,
      overdue,
      done,
      total: Math.max(total, inProgress + todo + overdue),
    }
  })
}

export function DashboardCharts({ overview, onSelectEmployee }) {
  const [hoveredStatusId, setHoveredStatusId] = useState(null)

  const statusData = useMemo(
    () => normalizeStatusDistribution(overview?.status_distribution ?? overview?.statusDistribution),
    [overview]
  )

  const priorityData = useMemo(
    () =>
      normalizePriorityDistribution(
        overview?.priority_distribution ?? overview?.priorityDistribution
      ),
    [overview]
  )

  const workloadData = useMemo(
    () => normalizeEmployeeWorkload(overview?.employee_workload ?? overview?.employeeWorkload),
    [overview]
  )

  const totalStatusCount = useMemo(
    () => statusData.reduce((acc, item) => acc + item.count, 0),
    [statusData]
  )

  const totalPriorityCount = useMemo(
    () => priorityData.reduce((acc, item) => acc + item.count, 0),
    [priorityData]
  )

  const maxEmployeeBarTotal = useMemo(() => {
    const sums = workloadData.map((w) => w.inProgress + w.todo + w.overdue)
    return Math.max(1, ...sums)
  }, [workloadData])

  const radius = 62
  const circumference = 2 * Math.PI * radius

  const donutSegments = useMemo(() => {
    if (totalStatusCount === 0) return []
    return statusData
      .filter((s) => s.count > 0)
      .reduce(
        (acc, item) => {
          const fraction = item.count / totalStatusCount
          const dashLength = fraction * circumference
          const dashOffset = -acc.cumulative * circumference
          return {
            cumulative: acc.cumulative + fraction,
            segments: [
              ...acc.segments,
              {
                ...item,
                percentage: Math.round(fraction * 100),
                dashLength,
                dashOffset,
              },
            ],
          }
        },
        { cumulative: 0, segments: [] }
      ).segments
  }, [statusData, totalStatusCount, circumference])

  const hoveredStatus = useMemo(
    () => donutSegments.find((s) => s.id === hoveredStatusId) || null,
    [donutSegments, hoveredStatusId]
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 1. SVG Donut Chart — rozkład statusów */}
      <Card className="lg:col-span-4 border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-400" />
              Rozkład statusów zadań
            </CardTitle>
            <span className="text-xs text-zinc-500">Łącznie: {totalStatusCount}</span>
          </div>
          <CardDescription className="text-xs text-zinc-500">
            Najedź na segment lub legendę, aby podejrzeć udział
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="#27272a"
                  strokeWidth="22"
                />
                {donutSegments.map((seg) => {
                  const isActive = hoveredStatusId === seg.id
                  const isDimmed = hoveredStatusId !== null && !isActive
                  return (
                    <circle
                      key={seg.id}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isActive ? 26 : 22}
                      strokeDasharray={`${seg.dashLength} ${circumference}`}
                      strokeDashoffset={seg.dashOffset}
                      className="cursor-pointer transition-all duration-200"
                      style={{ opacity: isDimmed ? 0.35 : 1 }}
                      onMouseEnter={() => setHoveredStatusId(seg.id)}
                      onMouseLeave={() => setHoveredStatusId(null)}
                    />
                  )
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-2xl font-bold tracking-tight text-zinc-100">
                  {hoveredStatus ? hoveredStatus.count : totalStatusCount}
                </span>
                <span className="text-[11px] font-medium text-zinc-400 leading-tight mt-0.5">
                  {hoveredStatus ? `${hoveredStatus.label} (${hoveredStatus.percentage}%)` : 'Zadań'}
                </span>
              </div>
            </div>

            <div className="w-full flex-1 space-y-2">
              {statusData.map((item) => {
                const pct =
                  totalStatusCount > 0 ? Math.round((item.count / totalStatusCount) * 100) : 0
                const isHovered = hoveredStatusId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => item.count > 0 && setHoveredStatusId(item.id)}
                    onMouseLeave={() => setHoveredStatusId(null)}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      isHovered ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.dotClass}`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="font-mono text-zinc-400 shrink-0 ml-2">
                      <strong className="text-zinc-100 font-semibold">{item.count}</strong>{' '}
                      <span className="text-[11px] text-zinc-500">({pct}%)</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Priority Distribution horizontal progress bars */}
      <Card className="lg:col-span-4 border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-400" />
              Rozkład priorytetów
            </CardTitle>
            <span className="text-xs text-zinc-500">Przypisania: {totalPriorityCount}</span>
          </div>
          <CardDescription className="text-xs text-zinc-500">
            Udział priorytetów w aktywnych przypisaniach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {priorityData.map((item) => {
            const pct =
              totalPriorityCount > 0 ? Math.round((item.count / totalPriorityCount) * 100) : 0
            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`flex items-center gap-2 font-medium ${item.textClass}`}>
                    <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                    {item.label}
                  </span>
                  <span className="text-zinc-400 font-mono">
                    <strong className="text-zinc-100 font-semibold">{item.count}</strong>{' '}
                    <span className="text-zinc-500">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${item.barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}

          {totalPriorityCount === 0 && (
            <p className="text-xs text-zinc-500 text-center py-4">
              Brak danych o priorytetach przypisań.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3. Employee Workload stacked horizontal bars */}
      <Card className="lg:col-span-4 border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              Obciążenie zespołu
            </CardTitle>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                W trakcie
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                Do zrob.
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Po term.
              </span>
            </div>
          </div>
          <CardDescription className="text-xs text-zinc-500">
            Kliknij pracownika, aby przefiltrować listę zadań
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workloadData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-xs">
              <Users className="h-7 w-7 mb-2 opacity-40" />
              Brak danych o obciążeniu pracowników.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {workloadData.map((emp) => {
                const segSum = emp.inProgress + emp.todo + emp.overdue
                const inProgressPct = (emp.inProgress / maxEmployeeBarTotal) * 100
                const todoPct = (emp.todo / maxEmployeeBarTotal) * 100
                const overduePct = (emp.overdue / maxEmployeeBarTotal) * 100

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => onSelectEmployee?.(emp.id)}
                    title="Kliknij, aby otworzyć Nadzór zadań dla tego pracownika"
                    className="w-full text-left rounded-lg border border-zinc-800/80 bg-zinc-950/50 hover:bg-zinc-800/70 hover:border-zinc-700 p-2.5 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar user={emp} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
                            {emp.name}
                          </p>
                          {emp.position && (
                            <p className="text-[10px] text-zinc-500 truncate">{emp.position}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                        {emp.inProgress} / {emp.todo}
                        {emp.overdue > 0 && (
                          <span className="text-red-400 font-semibold"> / {emp.overdue}!</span>
                        )}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                      {segSum > 0 ? (
                        <>
                          {emp.inProgress > 0 && (
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${inProgressPct}%` }}
                              title={`W trakcie: ${emp.inProgress}`}
                            />
                          )}
                          {emp.todo > 0 && (
                            <div
                              className="h-full bg-zinc-500 transition-all duration-300"
                              style={{ width: `${todoPct}%` }}
                              title={`Do zrobienia: ${emp.todo}`}
                            />
                          )}
                          {emp.overdue > 0 && (
                            <div
                              className="h-full bg-red-500 transition-all duration-300"
                              style={{ width: `${overduePct}%` }}
                              title={`Po terminie: ${emp.overdue}`}
                            />
                          )}
                        </>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
