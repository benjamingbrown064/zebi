'use client'

import { cachedFetch, invalidateCache } from '@/lib/client-cache'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ObjectiveCard, { CreateObjectiveCard } from '@/components/ObjectiveCard'
import ObjectiveForm from '@/components/ObjectiveForm'
import VoiceEntityModal from '@/components/voice-entity/VoiceEntityModal'

interface Objective {
  id: string
  title: string
  description?: string | null
  companyId?: string | null
  spaceName?: string | null
  goalId?: string | null
  goalName?: string | null
  objectiveType: string
  metricType: string
  currentValue: number
  targetValue: number
  unit?: string | null
  startDate: string
  deadline: string
  status: string
  progressPercent: number
  priority: number
  activeBlockers: number
  nextMilestone?: {
    title: string
    targetValue: number
    targetDate: string
    daysUntil: number
  }
  aiWork?: string
  humanWork?: string
  taskCount: number
  projectCount: number
}

interface Space { id: string; name: string }
interface Goal  { id: string; name: string }

interface ObjectivesClientProps {
  initialObjectives: Objective[]
  spaces: Space[]
  goals: Goal[]
  workspaceId: string
}

const PAGE_SIZE = 25

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon,
  inverted,
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
  inverted?: boolean
}) {
  const base = inverted
    ? 'bg-[#1A1C1C] text-white'
    : 'bg-white border border-[#E5E5E5] text-[#1A1C1C]'
  const labelColor = inverted ? 'text-[#A3A3A3]' : 'text-[#A3A3A3]'

  return (
    <div className={`${base} rounded p-5 flex flex-col justify-between`} style={{ minHeight: 100 }}>
      <div className="flex items-start justify-between">
        <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${labelColor}`}>{label}</p>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <p className={`text-[42px] font-bold leading-none mt-2 ${inverted ? 'text-white' : 'text-[#1A1C1C]'}`}>
        {String(value).padStart(2, '0')}
      </p>
    </div>
  )
}

// ─── Indicator dot ────────────────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
}

// ─── Status/Owner filter dropdown ─────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E5] rounded text-[12px] font-semibold text-[#474747] hover:border-[#C6C6C6] transition-colors"
      >
        {label}
        {value !== 'all' && (
          <span className="text-[#1A1C1C]">: {selected?.label}</span>
        )}
        <svg className="w-3.5 h-3.5 text-[#A3A3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-[#E5E5E5] rounded shadow-lg z-40 py-1 overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
                value === o.value
                  ? 'bg-[#F3F3F3] text-[#1A1C1C] font-semibold'
                  : 'text-[#474747] hover:bg-[#F9F9F9]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── View toggle ──────────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[#1A1C1C]' : 'text-[#A3A3A3]'}>
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[#1A1C1C]' : 'text-[#A3A3A3]'}>
      <line x1="5" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="2" cy="4" r="1" fill="currentColor"/>
      <circle cx="2" cy="8" r="1" fill="currentColor"/>
      <circle cx="2" cy="12" r="1" fill="currentColor"/>
    </svg>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────

function ObjectiveListRow({ obj, onClick }: { obj: Objective; onClick: () => void }) {
  const cfg: Record<string, string> = {
    on_track: '#1A1C1C', at_risk: '#1A1C1C', blocked: '#1A1C1C',
    completed: '#A3A3A3', active: '#1A1C1C', draft: '#A3A3A3',
  }
  const pct = Math.round(Math.min(Math.max(Number(obj.currentValue) / Number(obj.targetValue) * 100, 0), 100))

  const statusLabel: Record<string, string> = {
    on_track: 'ON TRACK', at_risk: 'AT RISK', blocked: 'BLOCKED',
    completed: 'COMPLETED', active: 'ACTIVE', draft: 'DRAFT',
  }

  const deadline = new Date(obj.deadline)
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000)

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-5 px-5 py-4 bg-white hover:bg-[#FAFAFA] cursor-pointer transition-colors border-b border-[#F3F3F3] last:border-b-0"
    >
      {/* Status badge */}
      <span className="flex-shrink-0 text-[10px] font-bold tracking-[0.1em] border border-[#1A1C1C] text-[#1A1C1C] px-2 py-0.5 rounded-[2px] w-[90px] text-center">
        {statusLabel[obj.status] ?? obj.status.toUpperCase()}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1A1C1C] truncate">{obj.title}</p>
        {obj.spaceName && (
          <p className="text-[12px] text-[#A3A3A3] mt-0.5">{obj.spaceName}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="hidden md:flex items-center gap-3 w-[140px] flex-shrink-0">
        <div className="flex-1 h-[3px] bg-[#E8E8E8] rounded-full overflow-hidden">
          <div className="h-full bg-[#1A1C1C] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[12px] font-semibold text-[#1A1C1C] w-9 text-right">{pct}%</span>
      </div>

      {/* Deadline */}
      <div className="hidden lg:block flex-shrink-0 text-right w-[100px]">
        <p className="text-[11px] text-[#A3A3A3] font-semibold uppercase tracking-wide mb-0.5">Deadline</p>
        <p className={`text-[12px] font-bold ${daysLeft < 0 ? 'text-[#1A1C1C]' : 'text-[#1A1C1C]'}`}>
          {deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
        </p>
      </div>

      {/* Chevron */}
      <svg className="w-4 h-4 text-[#C6C6C6] group-hover:text-[#474747] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ObjectivesClient({
  initialObjectives,
  spaces,
  goals,
  workspaceId,
}: ObjectivesClientProps) {
  const router = useRouter()
  const [objectives, setObjectives] = useState<Objective[]>(initialObjectives)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialObjectives.length === PAGE_SIZE)
  const [page, setPage] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [spaceFilter,  setSpaceFilter]  = useState('all')

  const observerTarget = useRef<HTMLDivElement>(null)

  // Infinite scroll
  const loadMoreObjectives = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/objectives?workspaceId=${workspaceId}&limit=${PAGE_SIZE}&offset=${nextPage * PAGE_SIZE}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const fetched: Objective[] = data.objectives || []
      if (!fetched.length) { setHasMore(false); return }
      setObjectives(prev => [...prev, ...fetched])
      setPage(nextPage)
      setHasMore(fetched.length === PAGE_SIZE)
    } catch {
      // silent
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, hasMore, workspaceId])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMoreObjectives() },
      { threshold: 1.0 }
    )
    const el = observerTarget.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [hasMore, loadingMore, loadMoreObjectives])

  // Filtering + sorting
  const filtered = objectives.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (spaceFilter  !== 'all' && o.companyId !== spaceFilter)  return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  // Stat counts
  const counts = {
    total:     objectives.length,
    on_track:  objectives.filter(o => o.status === 'on_track').length,
    at_risk:   objectives.filter(o => o.status === 'at_risk').length,
    blocked:   objectives.filter(o => o.status === 'blocked').length,
    completed: objectives.filter(o => o.status === 'completed').length,
  }

  const handleCreateObjective = async (data: any) => {
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, workspaceId, createdBy: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74', autoBreakdown: true }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      router.refresh()
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'on_track',  label: 'On Track' },
    { value: 'at_risk',   label: 'At Risk' },
    { value: 'blocked',   label: 'Blocked' },
    { value: 'completed', label: 'Completed' },
    { value: 'active',    label: 'Active' },
    { value: 'draft',     label: 'Draft' },
  ]

  const spaceOptions = [
    { value: 'all', label: 'All Spaces' },
    ...spaces.map(s => ({ value: s.id, label: s.name })),
  ]

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar workspaceName="My Workspace" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      <div>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-16">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-[28px] font-bold text-[#1A1C1C]">Objectives</h1>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white text-[13px] font-semibold rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Objective
            </button>
          </div>

          {/* ── Stat tiles ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
            <StatTile label="Total Ledger" value={counts.total} />
            <StatTile label="On Track" value={counts.on_track} icon={<Dot color="#1A1C1C" />} />
            <StatTile label="At Risk" value={counts.at_risk} icon={<Dot color="#A3A3A3" />} />
            <StatTile label="Blocked" value={counts.blocked} icon={<Dot color="#474747" />} />
            <StatTile label="Completed" value={counts.completed} icon={<Dot color="#C6C6C6" />} />
          </div>

          {/* ── Section header + filters ── */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
              <div>
                <h2 className="text-[22px] font-bold text-[#1A1C1C]">Active Strategic Objectives</h2>
                <p className="text-[13px] text-[#A3A3A3] mt-1">
                  The master list of organisational priorities. Refine by status, space, or deadline.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Filters */}
                <FilterDropdown
                  label="STATUS"
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
                {spaces.length > 0 && (
                  <FilterDropdown
                    label="SPACE"
                    options={spaceOptions}
                    value={spaceFilter}
                    onChange={setSpaceFilter}
                  />
                )}

                {/* View toggle */}
                <div className="flex items-center bg-white border border-[#E5E5E5] rounded p-0.5 ml-1">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-[#F3F3F3]' : 'hover:bg-[#F9F9F9]'}`}
                    title="Grid view"
                  >
                    <GridIcon active={view === 'grid'} />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-[#F3F3F3]' : 'hover:bg-[#F9F9F9]'}`}
                    title="List view"
                  >
                    <ListIcon active={view === 'list'} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          {sorted.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CreateObjectiveCard onClick={() => setIsFormOpen(true)} />
            </div>
          ) : view === 'grid' ? (
            /* ── GRID ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(o => (
                <ObjectiveCard
                  key={o.id}
                  id={o.id}
                  title={o.title}
                  spaceName={o.spaceName || undefined}
                  companyId={o.companyId || undefined}
                  currentValue={Number(o.currentValue)}
                  targetValue={Number(o.targetValue)}
                  unit={o.unit || undefined}
                  deadline={new Date(o.deadline)}
                  status={o.status}
                  progressPercent={Number(o.currentValue) / Number(o.targetValue) * 100}
                  activeBlockers={o.activeBlockers}
                />
              ))}
              {/* Create placeholder */}
              <CreateObjectiveCard onClick={() => setIsFormOpen(true)} />
            </div>
          ) : (
            /* ── LIST ── */
            <div>
              {/* Column headers */}
              <div className="hidden md:flex items-center gap-5 px-5 mb-2">
                <div className="w-[90px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3]">Status</div>
                <div className="flex-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3]">Objective</div>
                <div className="hidden md:block w-[140px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3]">Progress</div>
                <div className="hidden lg:block w-[100px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3] text-right">Deadline</div>
                <div className="w-4" />
              </div>
              <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
                {sorted.map(o => (
                  <ObjectiveListRow
                    key={o.id}
                    obj={o}
                    onClick={() => router.push(`/objectives/${o.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={observerTarget} className="flex items-center justify-center py-10">
              {loadingMore && (
                <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
              )}
            </div>
          )}

        </div>
      </div>

      {isFormOpen && (
        <ObjectiveForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleCreateObjective}
          workspaceId={workspaceId}
          spaces={spaces}
          goals={goals}
        />
      )}

      <VoiceEntityModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        entityType="objective"
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
