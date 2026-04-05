'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ManagersNote from '@/components/ManagersNote'
import { useWorkspace } from '@/lib/use-workspace'
import { FaMicrophone } from 'react-icons/fa'

// ─── Types ──────────────────────────────────────────────────────────────────

interface QueueTask {
  id: string
  title: string
  priority: number
  dueAt: string | null
  taskType: string | null
  spaceName: string | null
  spaceId: string | null
  projectName: string | null
  statusName: string | null
  decisionNeeded: boolean
  ownerAgent: string | null
}

interface AgentStatus {
  agent: string
  status: 'active' | 'waiting' | 'blocked' | 'idle' | 'offline'
  lastSeenAt: string | null
  lastEvent: string | null
  currentTaskId: string | null
  currentTaskTitle: string | null
  activeCount: number
  blockedCount: number
  waitingOnBenCount: number
  decisionsNeededCount: number
  pendingHandoffsCount: number
  topTasks: { id: string; title: string; spaceName: string | null; statusName: string | null }[]
}

interface AttentionItem {
  id: string
  title: string
  priority?: number
  ownerAgent?: string | null
  decisionSummary?: string | null
  blockedReason?: string | null
  dueAt?: string | null
  updatedAt?: string
  spaceName?: string | null
}

interface NowData {
  myQueue: QueueTask[]
  agentStatus: AgentStatus[]
  needsAttention: {
    decisions: AttentionItem[]
    waitingOnBen: AttentionItem[]
    overdue: AttentionItem[]
    stale: AttentionItem[]
  }
  recentWins: { id: string; title: string; ownerAgent: string | null; completedAt: string | null; spaceName: string | null }[]
  counts: {
    totalActive: number
    totalDecisions: number
    totalWaitingOnBen: number
    totalOverdue: number
    totalStale: number
    totalPendingHandoffs: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  harvey: 'Harvey', theo: 'Theo', doug: 'Doug', casper: 'Casper',
}
const AGENT_INITIALS: Record<string, string> = {
  harvey: 'H', theo: 'T', doug: 'D', casper: 'C',
}
const AGENT_COLOURS: Record<string, string> = {
  harvey: '#2563EB', theo: '#7C3AED', doug: '#059669', casper: '#D97706',
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'IMMEDIATE', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW' }
const PRIORITY_STYLE: Record<number, string> = {
  1: 'bg-[#1A1A1A] text-white',
  2: 'border border-[#1A1A1A] text-[#1A1A1A]',
  3: 'border border-[#C6C6C6] text-[#474747]',
  4: 'border border-[#E5E5E5] text-[#A3A3A3]',
}

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (h < 1) return '<1h'
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatOverdue(iso: string | null | undefined) {
  if (!iso) return null
  const days = Math.ceil((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return null
  const h = Math.round(((Date.now() - new Date(iso).getTime()) % 86400000) / 3600000)
  return `OVERDUE BY ${days}D ${h}H`
}

// ─── Stat Bar ────────────────────────────────────────────────────────────────

function StatBar({ data }: { data: NowData }) {
  const router = useRouter()

  const stats = [
    {
      label: 'MY QUEUE',
      value: data.myQueue.length,
      sub: data.recentWins.length > 0 ? `+${data.recentWins.length} done today` : 'No items done today',
      highlight: false,
      onClick: () => {},
    },
    {
      label: 'DECISIONS NEEDED',
      value: data.needsAttention.decisions.length.toString().padStart(2, '0'),
      sub: data.needsAttention.decisions.length > 0 ? 'Requires sign-off' : 'All clear',
      highlight: false,
      onClick: () => {},
    },
    {
      label: 'OVERDUE ACTION',
      value: data.needsAttention.overdue.length.toString().padStart(2, '0'),
      sub: data.needsAttention.overdue.length > 0 ? 'Immediate Attention' : 'Nothing overdue',
      highlight: data.needsAttention.overdue.length > 0,
      onClick: () => {},
    },
    {
      label: 'ACTIVE AGENTS',
      value: data.agentStatus.filter(a => a.activeCount > 0).length,
      sub: `${data.counts.totalActive} tasks in flight`,
      highlight: false,
      onClick: () => router.push('/founder'),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#E5E5E5] rounded mb-8">
      {stats.map((s, i) => (
        <div
          key={s.label}
          onClick={s.onClick}
          className={`px-6 py-5 ${i < stats.length - 1 ? 'border-r border-[#E5E5E5]' : ''} ${s.onClick.toString() !== '() => {}' ? 'cursor-pointer hover:bg-[#F9F9F9] transition-colors' : ''}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-2">{s.label}</p>
          <p className={`text-[36px] font-bold leading-none mb-2 ${s.highlight ? 'text-[#EF4444]' : 'text-[#1A1A1A]'}`}>
            {s.value}
          </p>
          <p className={`text-[11px] font-medium ${s.highlight ? 'text-[#EF4444]' : 'text-[#A3A3A3]'}`}>
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Queue Table ─────────────────────────────────────────────────────────────

function QueueTable({ tasks, onComplete, router }: {
  tasks: QueueTask[]
  onComplete: (id: string) => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between px-6 py-5 border-b border-[#E5E5E5]">
        <div>
          <h2 className="text-[20px] font-bold text-[#1A1A1A]">My Queue</h2>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mt-0.5">
            Pending assignment and active resolution
          </p>
        </div>
        <button
          onClick={() => router.push('/tasks')}
          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-[11px] font-bold uppercase tracking-[0.08em] rounded transition-colors"
        >
          + Assign New
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[13px] text-[#A3A3A3]">Queue is clear — nothing pending</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[140px_1fr_120px_120px_60px] gap-4 px-6 py-2.5 border-b border-[#F3F3F3] bg-[#F9F9F9]">
            {['IDENTIFIER', 'SUBJECT', 'PRIORITY', 'STATUS', 'AGE'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3]">{h}</p>
            ))}
          </div>

          {/* Rows */}
          <div>
            {tasks.map((task, i) => {
              const age = task.dueAt ? timeAgo(task.dueAt) : '—'
              const p = task.priority || 3
              return (
                <div
                  key={task.id}
                  className={`group grid grid-cols-[140px_1fr_120px_120px_60px] gap-4 px-6 py-4 cursor-pointer hover:bg-[#F9F9F9] transition-colors ${i < tasks.length - 1 ? 'border-b border-[#F3F3F3]' : ''}`}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                >
                  {/* Identifier */}
                  <div className="flex items-start pt-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onComplete(task.id) }}
                      className="w-3.5 h-3.5 rounded-full border border-[#C6C6C6] hover:border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all flex-shrink-0 mt-0.5 mr-2 opacity-0 group-hover:opacity-100"
                    />
                    <span className="text-[11px] font-mono text-[#A3A3A3] truncate">
                      {task.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  {/* Subject */}
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug mb-0.5">{task.title}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A3A3A3]">
                      {task.spaceName || task.taskType || 'General'}
                    </p>
                  </div>

                  {/* Priority */}
                  <div className="flex items-start">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.06em] ${PRIORITY_STYLE[p]}`}>
                      {PRIORITY_LABEL[p]}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-start">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#474747]">
                      {task.statusName || 'In Queue'}
                    </span>
                  </div>

                  {/* Age */}
                  <div className="flex items-start justify-end">
                    <span className="text-[11px] font-mono text-[#A3A3A3]">{age}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Agent Intelligence Panel ─────────────────────────────────────────────────

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Never connected'
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hrs  < 24)  return `${hrs}h ago`
  return `${days}d ago`
}

function AgentStatusBadge({ status }: { status: AgentStatus['status'] }) {
  const cfg: Record<AgentStatus['status'], { label: string; cls: string; dot: string }> = {
    active:  { label: 'ACTIVE',   cls: 'bg-[#F0FDF4] text-[#16A34A]', dot: '#16A34A' },
    waiting: { label: 'WAITING',  cls: 'bg-[#FFFBEB] text-[#D97706]', dot: '#D97706' },
    blocked: { label: 'BLOCKED',  cls: 'bg-[#FEF2F2] text-[#EF4444]', dot: '#EF4444' },
    idle:    { label: 'IDLE',     cls: 'bg-[#F3F3F3] text-[#A3A3A3]', dot: '#C6C6C6' },
    offline: { label: 'OFFLINE',  cls: 'bg-[#F3F3F3] text-[#C6C6C6]', dot: '#E5E5E5' },
  }
  const c = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded ${c.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  )
}

function AgentIntelligence({ agents, router }: { agents: AgentStatus[]; router: ReturnType<typeof useRouter> }) {
  const maxTasks = Math.max(...agents.map(a => a.activeCount), 1)

  return (
    <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E5E5]">
        <h3 className="text-[15px] font-bold text-[#1A1A1A]">Agent Intelligence</h3>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mt-0.5">Live Operational Status</p>
      </div>

      <div className="divide-y divide-[#F3F3F3]">
        {agents.length === 0 ? (
          <p className="px-5 py-6 text-[12px] text-[#C6C6C6]">No agents configured</p>
        ) : agents.map(a => {
          const col = AGENT_COLOURS[a.agent] || '#737373'
          const pct = Math.round((a.activeCount / maxTasks) * 100)
          const isOffline = a.status === 'offline'

          return (
            <div
              key={a.agent}
              className="flex items-start gap-3 px-5 py-4 hover:bg-[#F9F9F9] cursor-pointer transition-colors"
              onClick={() => router.push(`/queue?agent=${a.agent}`)}
            >
              {/* Avatar with online dot */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-9 h-9 rounded flex items-center justify-center text-[13px] font-bold text-white"
                  style={{ backgroundColor: isOffline ? '#C6C6C6' : col }}
                >
                  {AGENT_INITIALS[a.agent] || a.agent[0].toUpperCase()}
                </div>
                {/* Online presence dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{
                    backgroundColor:
                      a.status === 'active'  ? '#16A34A' :
                      a.status === 'waiting' ? '#D97706' :
                      a.status === 'blocked' ? '#EF4444' :
                      a.status === 'idle'    ? '#A3A3A3' :
                      '#E5E5E5'
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[12px] font-bold uppercase tracking-[0.04em] ${isOffline ? 'text-[#A3A3A3]' : 'text-[#1A1A1A]'}`}>
                    {AGENT_LABELS[a.agent] || a.agent}
                  </p>
                  <AgentStatusBadge status={a.status} />
                </div>

                {/* Current task (if agent reported one) */}
                {a.currentTaskTitle && (
                  <p className="text-[11px] text-[#474747] truncate mb-1.5">
                    ↳ {a.currentTaskTitle}
                  </p>
                )}

                {/* Capacity bar */}
                <div className="h-1 bg-[#F3F3F3] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor:
                        a.status === 'blocked' ? '#EF4444' :
                        isOffline ? '#E5E5E5' : col
                    }}
                  />
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-[#A3A3A3]">
                    {a.activeCount} task{a.activeCount !== 1 ? 's' : ''}
                    {a.blockedCount > 0 && <span className="text-[#EF4444] ml-1">· {a.blockedCount} blocked</span>}
                    {a.waitingOnBenCount > 0 && <span className="text-[#D97706] ml-1">· {a.waitingOnBenCount} waiting</span>}
                  </p>
                  {/* Last seen timestamp */}
                  <p className="text-[10px] text-[#A3A3A3]" title={a.lastSeenAt ?? 'Never'}>
                    {formatLastSeen(a.lastSeenAt)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stale Ledger ─────────────────────────────────────────────────────────────

function StaleLedger({ items, router }: { items: AttentionItem[]; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden mt-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E5]">
        <div>
          <h3 className="text-[14px] font-bold text-[#1A1A1A]">Stale Ledger</h3>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mt-0.5">Idle items &gt; 48 hours</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => router.push('/tasks')}
            className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#1A1A1A] hover:underline"
          >
            Reassign All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-4 text-[12px] text-[#C6C6C6]">Nothing stale</p>
      ) : (
        <div className="divide-y divide-[#F3F3F3]">
          {items.slice(0, 5).map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] cursor-pointer transition-colors"
              onClick={() => router.push(`/tasks/${item.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-[#C6C6C6] mb-0.5">{item.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{item.title}</p>
              </div>
              <span className="text-[11px] font-mono text-[#A3A3A3] flex-shrink-0 ml-4">
                {item.updatedAt ? timeAgo(item.updatedAt) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Decisions Panel ─────────────────────────────────────────────────────────

function DecisionsPanel({ items, router }: { items: AttentionItem[]; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E5E5E5]">
        <h2 className="text-[20px] font-bold text-[#1A1A1A]">Decisions Needed</h2>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mt-0.5">
          Executive sign-off required
        </p>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-[13px] text-[#A3A3A3]">No pending decisions</p>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E5E5]">
          {items.map(item => {
            const isCritical = item.priority === 1
            return (
              <div key={item.id} className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded ${
                    isCritical ? 'bg-[#1A1A1A] text-white' : 'border border-[#C6C6C6] text-[#474747]'
                  }`}>
                    {isCritical ? 'CRITICAL' : 'STANDARD'}
                  </span>
                  {item.dueAt && (
                    <span className="text-[11px] text-[#A3A3A3]">
                      Exp: {Math.max(0, Math.ceil((new Date(item.dueAt).getTime() - Date.now()) / 3600000))}h
                    </span>
                  )}
                </div>
                <h4 className="text-[14px] font-bold text-[#1A1A1A] uppercase tracking-[0.02em] mb-1">
                  {item.title}
                </h4>
                {item.decisionSummary && (
                  <p className="text-[12px] text-[#737373] mb-4 leading-relaxed">{item.decisionSummary}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/tasks/${item.id}`)}
                    className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-[10px] font-bold uppercase tracking-[0.08em] rounded transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => router.push(`/tasks/${item.id}`)}
                    className="px-4 py-2 border border-[#C6C6C6] hover:bg-[#F3F3F3] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-[0.08em] rounded transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Overdue Panel ────────────────────────────────────────────────────────────

function OverduePanel({ items, router }: { items: AttentionItem[]; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E5E5E5]">
        <h2 className="text-[20px] font-bold text-[#EF4444]">Overdue Actions</h2>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mt-0.5">
          SLA violations occurring
        </p>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-[13px] text-[#A3A3A3]">Nothing overdue</p>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E5E5]">
          {items.map(item => {
            const overdueLabel = formatOverdue(item.dueAt)
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-[#FEF2F2] cursor-pointer transition-colors group"
                onClick={() => router.push(`/tasks/${item.id}`)}
              >
                {/* Alert icon */}
                <div className="w-8 h-8 rounded bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{item.title}</p>
                  {overdueLabel && (
                    <p className="text-[10px] font-bold text-[#EF4444] mt-0.5">{overdueLabel}</p>
                  )}
                </div>

                <svg className="w-4 h-4 text-[#C6C6C6] flex-shrink-0 group-hover:text-[#EF4444] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NowClient() {
  const { workspaceId } = useWorkspace()
  const [data, setData] = useState<NowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/now/summary')
      if (res.ok) setData(await res.json())
    } catch (e) {
      console.error('Failed to load Now summary', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (workspaceId) load()
  }, [workspaceId, load])

  const handleCompleteTask = useCallback(async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      load()
    } catch (e) {
      console.error('Failed to complete task', e)
    }
  }, [load])

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar workspaceName="My Workspace" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

        {/* ── Top bar — consistent with rest of app ────────────────────────── */}
        <div className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-4 md:px-8 py-3 flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-[#1A1A1A]">Now</h1>
          <button
            onClick={() => router.push('/brain-dump')}
            className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-2 transition-colors"
          >
            <FaMicrophone className="text-[10px]" />
            Brain Dump
          </button>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">

          {/* ── Page heading ──────────────────────────────────────────────── */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">NOW DASHBOARD</p>
              <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">{dateStr}</h1>
            </div>
          </div>

          {/* ── Manager's Note ──────────────────────────────────────────────── */}
          <div className="mb-6">
            <ManagersNote />
          </div>

          {loading ? (
            /* ── Skeleton ──────────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="grid grid-cols-4 bg-white border border-[#E5E5E5] rounded">
                {[1,2,3,4].map(i => (
                  <div key={i} className="px-6 py-5 border-r border-[#E5E5E5] last:border-0 animate-pulse">
                    <div className="h-2 w-20 bg-[#F3F3F3] rounded mb-3" />
                    <div className="h-8 w-12 bg-[#F3F3F3] rounded mb-2" />
                    <div className="h-2 w-24 bg-[#F3F3F3] rounded" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_320px] gap-6">
                <div className="bg-white border border-[#E5E5E5] rounded h-64 animate-pulse" />
                <div className="bg-white border border-[#E5E5E5] rounded h-64 animate-pulse" />
              </div>
            </div>
          ) : data ? (
            <>
              {/* ── Stat Bar ──────────────────────────────────────────────── */}
              <StatBar data={data} />

              {/* ── Main 2-col layout ──────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

                {/* LEFT: Queue + Decisions + Overdue */}
                <div className="space-y-6">
                  <QueueTable tasks={data.myQueue} onComplete={handleCompleteTask} router={router} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DecisionsPanel items={data.needsAttention.decisions} router={router} />
                    <OverduePanel items={data.needsAttention.overdue} router={router} />
                  </div>
                </div>

                {/* RIGHT: Agent Intelligence + Stale Ledger */}
                <div>
                  <AgentIntelligence agents={data.agentStatus} router={router} />
                  <StaleLedger items={data.needsAttention.stale} router={router} />

                  {/* Done today */}
                  {data.recentWins.length > 0 && (
                    <div className="bg-[#1A1A1A] rounded mt-4 px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 mb-1">Completed Today</p>
                      <p className="text-[28px] font-bold text-white leading-none mb-3">{data.recentWins.length}</p>
                      <div className="space-y-1.5">
                        {data.recentWins.slice(0, 4).map(w => (
                          <div key={w.id} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                            <p className="text-[11px] text-white/60 truncate">{w.title}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/30 mt-3 uppercase tracking-[0.06em]">Normal operation</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#737373]">Failed to load — refresh to try again</div>
          )}
        </div>
    </div>
  )
}
