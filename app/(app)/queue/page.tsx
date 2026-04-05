'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useWorkspace } from '@/lib/use-workspace'
import {
  FaBolt, FaExclamationTriangle, FaHourglass, FaClock,
  FaCheckCircle, FaRobot, FaArrowRight
} from 'react-icons/fa'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueTask {
  id: string
  title: string
  priority: number
  taskType?: string
  ownerAgent?: string
  handoffToAgent?: string
  waitingOn?: string
  blockedReason?: string
  decisionNeeded?: boolean
  definitionOfDone?: string
  nextAction?: string
  expectedOutcome?: string
  completionNote?: string
  companyId?: string
  projectId?: string
  dueAt?: string
  updatedAt: string
  createdAt: string
}

interface Handoff {
  id: string
  fromAgent: string
  toAgent: string
  summary: string
  requestedOutcome: string
  completedWork: string
  remainingWork: string
  blockers: string
  decisionNeeded: boolean
  decisionSummary?: string
  status: string
  createdAt: string
  taskId?: string
}

// ─── Config per agent ─────────────────────────────────────────────────────────

const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const
type Agent = typeof AGENTS[number]

const AGENT_CONFIG: Record<Agent, { color: string; dot: string; label: string; description: string; taskTypes: string[] }> = {
  harvey: {
    color: 'text-violet-700', dot: 'bg-violet-500', label: 'Harvey',
    description: 'Orchestration · Planning · Founder comms · Blockers · Handoff routing',
    taskTypes: ['strategy', 'ops', 'briefing', 'review'],
  },
  theo: {
    color: 'text-sky-700', dot: 'bg-sky-500', label: 'Theo',
    description: 'Research · Synthesis · Evidence · Published insights',
    taskTypes: ['research'],
  },
  doug: {
    color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Doug',
    description: 'Implementation · Debugging · Shipping · Technical handoffs',
    taskTypes: ['build', 'bug'],
  },
  casper: {
    color: 'text-orange-700', dot: 'bg-orange-500', label: 'Casper',
    description: 'Parallel dev · Overflow · QA · Isolated features',
    taskTypes: ['build', 'bug', 'review', 'admin'],
  },
}

const PRIORITY_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'P1', cls: 'bg-red-100 text-red-700' },
  2: { label: 'P2', cls: 'bg-orange-100 text-orange-700' },
  3: { label: 'P3', cls: 'bg-yellow-100 text-yellow-700' },
  4: { label: 'P4', cls: 'bg-gray-100 text-gray-500' },
  5: { label: 'P5', cls: 'bg-gray-50 text-gray-400' },
}

function PriorityBadge({ p }: { p: number }) {
  const cfg = PRIORITY_LABEL[p] ?? { label: `P${p}`, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${cfg.cls}`}>{cfg.label}</span>
}

function SectionHeader({ title, count, icon }: { title: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#737373]">{icon}</span>
      <h3 className="text-[13px] font-semibold text-[#474747]">{title}</h3>
      <span className="text-[11px] text-[#A3A3A3]">({count})</span>
    </div>
  )
}

function TaskRow({ task }: { task: QueueTask }) {
  return (
    <Link href={`/tasks/${task.id}`}
      className="flex items-start gap-3 py-3 px-4 hover:bg-[#F9F9F9] rounded-md transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1A1A1A] truncate group-hover:text-[#DD3A44] transition-colors">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.taskType && <span className="text-[11px] text-[#737373] capitalize">{task.taskType}</span>}
          {task.nextAction && <span className="text-[11px] text-[#A3A3A3] truncate max-w-[200px]">→ {task.nextAction}</span>}
          {task.blockedReason && <span className="text-[11px] text-orange-600 truncate max-w-[200px]">⚠ {task.blockedReason}</span>}
          {task.decisionNeeded && <span className="text-[10px] font-semibold text-[#DD3A44]">decision needed</span>}
        </div>
      </div>
      <PriorityBadge p={task.priority} />
    </Link>
  )
}

function HandoffRow({ h }: { h: Handoff }) {
  return (
    <div className="py-3 px-4 bg-violet-50 rounded-md border border-violet-100">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[13px] font-medium text-[#1A1A1A]">{h.summary}</p>
        {h.decisionNeeded && <span className="text-[10px] font-bold text-[#DD3A44] shrink-0">decision needed</span>}
      </div>
      <p className="text-[12px] text-[#737373] mb-1.5">{h.requestedOutcome}</p>
      <div className="space-y-0.5 text-[11px]">
        <p><span className="text-[#A3A3A3]">Done:</span> {h.completedWork}</p>
        <p><span className="text-[#A3A3A3]">Remaining:</span> {h.remainingWork}</p>
        {h.blockers !== 'none' && <p><span className="text-orange-600">Blockers:</span> {h.blockers}</p>}
      </div>
      <p className="text-[11px] text-[#A3A3A3] mt-1.5 capitalize">from {h.fromAgent} · {new Date(h.createdAt).toLocaleDateString()}</p>
      {h.taskId && (
        <Link href={`/tasks/${h.taskId}`} className="text-[11px] text-[#DD3A44] hover:underline mt-1 block">View task →</Link>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function QueueContent() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const agentParam = (searchParams.get('agent') ?? 'harvey') as Agent
  const activeAgent = AGENTS.includes(agentParam) ? agentParam : 'harvey'

  const [tasks, setTasks] = useState<QueueTask[]>([])
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const [tasksRes, handoffsRes] = await Promise.all([
        fetch(`/api/tasks/direct?workspaceId=${workspaceId}&ownerAgent=${activeAgent}`),
        fetch(`/api/handoffs?workspaceId=${workspaceId}&toAgent=${activeAgent}&status=pending`),
      ])
      const tasksData = await tasksRes.json()
      const handoffsData = await handoffsRes.json()
      setTasks(tasksData.tasks ?? [])
      setHandoffs(handoffsData.handoffs ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, activeAgent])

  useEffect(() => {
    if (!wsLoading && workspaceId) load()
  }, [wsLoading, workspaceId, load])

  const cfg = AGENT_CONFIG[activeAgent]

  // Segment tasks
  const openHandoffs   = handoffs.filter(h => h.status === 'pending')
  const blockedTasks   = tasks.filter(t => t.blockedReason)
  const decisionTasks  = tasks.filter(t => t.decisionNeeded && !t.blockedReason)
  const waitingOnBen   = tasks.filter(t => t.waitingOn === 'ben' && !t.blockedReason)
  const stale          = tasks.filter(t => {
    const age = Date.now() - new Date(t.updatedAt).getTime()
    return age > 48 * 60 * 60 * 1000 && !t.blockedReason && !t.decisionNeeded
  })
  const readyIds = new Set([
    ...blockedTasks, ...decisionTasks, ...waitingOnBen, ...stale
  ].map(t => t.id))
  const ready = tasks.filter(t => !readyIds.has(t.id))
    .sort((a, b) => a.priority - b.priority)

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar workspaceName="Zebi" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-[220px]'} p-6 md:p-8`}>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[26px] font-semibold text-[#1A1A1A]">Agent Queue</h1>
          <p className="text-[13px] text-[#A3A3A3] mt-1">Focused work queue per agent</p>
        </div>

        {/* Agent tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {AGENTS.map(agent => {
            const c = AGENT_CONFIG[agent]
            const isActive = agent === activeAgent
            return (
              <button key={agent} onClick={() => router.push(`/queue?agent=${agent}`)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded text-[13px] font-medium transition-all border ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#474747] border-[#E5E5E5] hover:border-[#C4C4C4]'
                }`}>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : c.dot}`} />
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Agent description */}
        <div className="bg-white rounded px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <h2 className={`text-[15px] font-semibold ${cfg.color}`}>{cfg.label}</h2>
            </div>
            <p className="text-[12px] text-[#737373]">{cfg.description}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-center">
            <div>
              <p className="text-[20px] font-bold text-[#1A1A1A]">{tasks.length}</p>
              <p className="text-[10px] text-[#A3A3A3]">tasks</p>
            </div>
            {openHandoffs.length > 0 && (
              <div>
                <p className="text-[20px] font-bold text-violet-600">{openHandoffs.length}</p>
                <p className="text-[10px] text-[#A3A3A3]">handoffs</p>
              </div>
            )}
            {blockedTasks.length > 0 && (
              <div>
                <p className="text-[20px] font-bold text-orange-600">{blockedTasks.length}</p>
                <p className="text-[10px] text-[#A3A3A3]">blocked</p>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#A3A3A3] text-[13px]">Loading…</div>
        ) : (
          <div className="space-y-6">

            {/* Open handoffs — always first */}
            {openHandoffs.length > 0 && (
              <div className="bg-white rounded p-5">
                <SectionHeader title="Open Handoffs" count={openHandoffs.length} icon={<FaBolt size={13} />} />
                <div className="space-y-2">
                  {openHandoffs.map(h => <HandoffRow key={h.id} h={h} />)}
                </div>
              </div>
            )}

            {/* Blocked */}
            {blockedTasks.length > 0 && (
              <div className="bg-white rounded p-5">
                <SectionHeader title="Blocked" count={blockedTasks.length} icon={<FaExclamationTriangle size={13} />} />
                <div className="divide-y divide-[#F3F3F3]">
                  {blockedTasks.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {/* Waiting on decisions */}
            {decisionTasks.length > 0 && (
              <div className="bg-white rounded p-5">
                <SectionHeader title="Decision Needed" count={decisionTasks.length} icon={<FaHourglass size={13} />} />
                <div className="divide-y divide-[#F3F3F3]">
                  {decisionTasks.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {/* Waiting on Ben */}
            {waitingOnBen.length > 0 && (
              <div className="bg-white rounded p-5">
                <SectionHeader title="Waiting on Ben" count={waitingOnBen.length} icon={<FaHourglass size={13} />} />
                <div className="divide-y divide-[#F3F3F3]">
                  {waitingOnBen.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {/* Stale (not updated 48h+) */}
            {stale.length > 0 && (
              <div className="bg-white rounded p-5">
                <SectionHeader title="Stale — No Update in 48h" count={stale.length} icon={<FaClock size={13} />} />
                <div className="divide-y divide-[#F3F3F3]">
                  {stale.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {/* Ready to work */}
            <div className="bg-white rounded p-5">
              <SectionHeader title="Ready to Work" count={ready.length} icon={<FaCheckCircle size={13} />} />
              {ready.length === 0 ? (
                <p className="text-[13px] text-[#A3A3A3] py-2">No tasks in queue — all clear or nothing assigned yet.</p>
              ) : (
                <div className="divide-y divide-[#F3F3F3]">
                  {ready.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <p className="text-[#A3A3A3] text-[13px]">Loading queue…</p>
      </div>
    }>
      <QueueContent />
    </Suspense>
  )
}
