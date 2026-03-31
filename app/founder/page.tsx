'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import {
  FaFlag, FaExclamationTriangle, FaCheckCircle, FaRobot,
  FaClock, FaBalanceScale, FaSync, FaChevronRight,
  FaUser, FaBolt, FaInbox, FaHourglass
} from 'react-icons/fa'
import { useWorkspace } from '@/lib/use-workspace'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentWorkload {
  agent: string
  totalActive: number
  blocked: number
  decisionNeeded: number
  waitingOnBen: number
  highPriority: number
}

interface TaskSummary {
  id: string
  title: string
  priority: number
  taskType?: string
  ownerAgent?: string
  waitingOn?: string
  decisionNeeded?: boolean
  blockedReason?: string
  decisionSummary?: string
  requestedBy?: string
  nextAction?: string
  dueAt?: string
  completedAt?: string
  completionNote?: string
  outputDocId?: string
  outputUrl?: string
  company?: { id: string; name: string } | null
  project?: { id: string; name: string } | null
  updatedAt?: string
  createdAt?: string
}

interface Handoff {
  id: string
  fromAgent: string
  toAgent: string
  summary: string
  requestedOutcome: string
  status: string
  decisionNeeded: boolean
  taskId?: string
  createdAt: string
}

interface FounderSummary {
  generatedAt: string
  topPriorities: TaskSummary[]
  agentWorkloads: AgentWorkload[]
  blockedTasks: TaskSummary[]
  decisionInbox: TaskSummary[]
  waitingOnBen: TaskSummary[]
  recentCompletions: TaskSummary[]
  pendingHandoffs: { total: number; byAgent: Record<string, Handoff[]> }
  workflowHealth: {
    totalActiveTasks: number
    ownerCoveragePercent: number
    tasksWithNoOwner: number
    doneWithNoOutput: number
    stalledTasks: number
    openDecisions: number
    waitingOnBenCount: number
    pendingHandoffCount: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  harvey: 'bg-violet-100 text-violet-700',
  theo:   'bg-sky-100 text-sky-700',
  doug:   'bg-emerald-100 text-emerald-700',
  casper: 'bg-orange-100 text-orange-700',
  ben:    'bg-[#DD3A44]/10 text-[#DD3A44]',
}

const AGENT_DOT: Record<string, string> = {
  harvey: 'bg-violet-500',
  theo:   'bg-sky-500',
  doug:   'bg-emerald-500',
  casper: 'bg-orange-500',
}

const PRIORITY_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'Critical', cls: 'bg-red-100 text-red-700' },
  2: { label: 'High',     cls: 'bg-orange-100 text-orange-700' },
  3: { label: 'Medium',   cls: 'bg-yellow-100 text-yellow-700' },
  4: { label: 'Low',      cls: 'bg-gray-100 text-gray-600' },
  5: { label: 'Minimal',  cls: 'bg-gray-100 text-gray-500' },
}

function AgentBadge({ agent }: { agent?: string }) {
  if (!agent) return <span className="text-[#A3A3A3] text-[11px]">unassigned</span>
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${AGENT_COLORS[agent] ?? 'bg-gray-100 text-gray-600'}`}>
      {agent}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: number }) {
  const p = PRIORITY_LABEL[priority] ?? { label: `P${priority}`, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.cls}`}>{p.label}</span>
}

function TaskRow({ task, showAgent = true }: { task: TaskSummary; showAgent?: boolean }) {
  return (
    <Link href={`/tasks/${task.id}`} className="flex items-start gap-3 py-3 px-4 hover:bg-[#F9F9F9] rounded-[8px] transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1A1A1A] truncate group-hover:text-[#DD3A44] transition-colors">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.company && <span className="text-[11px] text-[#A3A3A3]">{task.company.name}</span>}
          {task.project && <span className="text-[11px] text-[#A3A3A3]">· {task.project.name}</span>}
          {task.taskType && <span className="text-[11px] text-[#737373] capitalize">{task.taskType}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <PriorityBadge priority={task.priority} />
        {showAgent && <AgentBadge agent={task.ownerAgent} />}
      </div>
    </Link>
  )
}

function SectionCard({
  title, icon, count, countColor = 'text-[#737373]', children, emptyText
}: {
  title: string
  icon: React.ReactNode
  count?: number
  countColor?: string
  children: React.ReactNode
  emptyText?: string
}) {
  return (
    <div className="bg-white rounded-[14px] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#737373]">{icon}</span>
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">{title}</h2>
        </div>
        {count !== undefined && (
          <span className={`text-[13px] font-semibold ${countColor}`}>{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderPage() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [data, setData] = useState<FounderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/founder/summary?workspaceId=${workspaceId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!wsLoading && workspaceId) load()
  }, [wsLoading, workspaceId, load])

  const health = data?.workflowHealth

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Sidebar
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-[60px]' : 'ml-[220px]'} p-6 md:p-8`}>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold text-[#1A1A1A]">Founder View</h1>
            <p className="text-[13px] text-[#A3A3A3] mt-1 truncate">
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading…'}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium text-[#525252] hover:bg-white hover:shadow-sm transition-all border border-[#E5E5E5] bg-white disabled:opacity-50"
          >
            <FaSync className={loading ? 'animate-spin' : ''} size={12} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-32 text-[#A3A3A3] text-[14px]">
            Loading…
          </div>
        )}

        {data && (
          <div className="space-y-6">

            {/* ── Workflow Health Bar ────────────────────────────────── */}
            {health && (
              <div className="bg-white rounded-[14px] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Workflow Health</h2>
                  <span className={`text-[20px] font-bold ${health.ownerCoveragePercent >= 80 ? 'text-emerald-600' : health.ownerCoveragePercent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {health.ownerCoveragePercent}% owned
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'Active tasks', value: health.totalActiveTasks, color: 'text-[#1A1A1A]' },
                    { label: 'No owner', value: health.tasksWithNoOwner, color: health.tasksWithNoOwner > 0 ? 'text-orange-600' : 'text-emerald-600' },
                    { label: 'Stalled (48h)', value: health.stalledTasks, color: health.stalledTasks > 3 ? 'text-orange-600' : 'text-[#737373]' },
                    { label: 'Open decisions', value: health.openDecisions, color: health.openDecisions > 0 ? 'text-[#DD3A44]' : 'text-emerald-600' },
                    { label: 'Waiting on Ben', value: health.waitingOnBenCount, color: health.waitingOnBenCount > 0 ? 'text-[#DD3A44]' : 'text-emerald-600' },
                    { label: 'Done, no output', value: health.doneWithNoOutput, color: health.doneWithNoOutput > 5 ? 'text-orange-600' : 'text-[#737373]' },
                    { label: 'Open handoffs', value: health.pendingHandoffCount, color: health.pendingHandoffCount > 0 ? 'text-violet-600' : 'text-[#737373]' },
                  ].map(m => (
                    <div key={m.label} className="bg-[#F9F9F9] rounded-[10px] p-3 text-center">
                      <p className={`text-[22px] font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-[#A3A3A3] mt-1 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Two-column grid ───────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top Priorities */}
              <SectionCard
                title="Top Priorities"
                icon={<FaFlag size={13} />}
                count={data.topPriorities.length}
              >
                {data.topPriorities.length === 0 ? (
                  <p className="text-[13px] text-[#A3A3A3] py-2">No active tasks</p>
                ) : (
                  <div className="divide-y divide-[#F3F3F3]">
                    {data.topPriorities.map(t => <TaskRow key={t.id} task={t} />)}
                  </div>
                )}
              </SectionCard>

              {/* Agent Workloads */}
              <SectionCard title="Agent Workloads" icon={<FaRobot size={13} />}>
                <div className="space-y-3">
                  {data.agentWorkloads.map(a => (
                    <div key={a.agent} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${AGENT_DOT[a.agent] ?? 'bg-gray-400'}`} />
                        <span className="text-[13px] font-medium text-[#1A1A1A] capitalize">{a.agent}</span>
                      </div>
                      <div className="flex-1 bg-[#F3F3F3] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${AGENT_DOT[a.agent] ?? 'bg-gray-400'}`}
                          style={{ width: `${Math.min(100, (a.totalActive / Math.max(1, data.workflowHealth.totalActiveTasks)) * 100 * 4)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[12px]">
                        <span className="text-[#525252] font-medium w-6 text-right">{a.totalActive}</span>
                        {a.blocked > 0 && <span className="text-orange-600 font-medium">{a.blocked} blocked</span>}
                        {a.waitingOnBen > 0 && <span className="text-[#DD3A44] font-medium">{a.waitingOnBen} → Ben</span>}
                        {a.blocked === 0 && a.waitingOnBen === 0 && <span className="text-emerald-600 text-[11px]">clear</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

            </div>

            {/* ── Decision inbox + Waiting on Ben ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Decision Inbox */}
              <SectionCard
                title="Decision Inbox"
                icon={<FaBalanceScale size={13} />}
                count={data.decisionInbox.length}
                countColor={data.decisionInbox.length > 0 ? 'text-[#DD3A44] font-bold' : 'text-emerald-600'}
              >
                {data.decisionInbox.length === 0 ? (
                  <p className="text-[13px] text-emerald-600 py-2 flex items-center gap-1.5"><FaCheckCircle size={12} /> Nothing needs your decision</p>
                ) : (
                  <div className="divide-y divide-[#F3F3F3]">
                    {data.decisionInbox.map(t => (
                      <Link key={t.id} href={`/tasks/${t.id}`} className="block py-3 px-4 hover:bg-[#F9F9F9] rounded-[8px] transition-colors group">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#DD3A44] transition-colors">{t.title}</p>
                          <AgentBadge agent={t.ownerAgent} />
                        </div>
                        {t.decisionSummary && (
                          <p className="text-[12px] text-[#737373] mt-1 line-clamp-2">{t.decisionSummary}</p>
                        )}
                        {t.company && <p className="text-[11px] text-[#A3A3A3] mt-1">{t.company.name}</p>}
                      </Link>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Waiting on Ben */}
              <SectionCard
                title="Waiting on Ben"
                icon={<FaHourglass size={13} />}
                count={data.waitingOnBen.length}
                countColor={data.waitingOnBen.length > 0 ? 'text-[#DD3A44]' : 'text-emerald-600'}
              >
                {data.waitingOnBen.length === 0 ? (
                  <p className="text-[13px] text-emerald-600 py-2 flex items-center gap-1.5"><FaCheckCircle size={12} /> Nothing waiting on you</p>
                ) : (
                  <div className="divide-y divide-[#F3F3F3]">
                    {data.waitingOnBen.map(t => (
                      <Link key={t.id} href={`/tasks/${t.id}`} className="block py-3 px-4 hover:bg-[#F9F9F9] rounded-[8px] transition-colors group">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#DD3A44] transition-colors">{t.title}</p>
                          <AgentBadge agent={t.ownerAgent} />
                        </div>
                        {t.nextAction && (
                          <p className="text-[12px] text-[#737373] mt-1 line-clamp-1">→ {t.nextAction}</p>
                        )}
                        {t.company && <p className="text-[11px] text-[#A3A3A3] mt-1">{t.company.name}</p>}
                      </Link>
                    ))}
                  </div>
                )}
              </SectionCard>

            </div>

            {/* ── Blocked tasks ──────────────────────────────────────── */}
            <SectionCard
              title="Blocked Tasks"
              icon={<FaExclamationTriangle size={13} />}
              count={data.blockedTasks.length}
              countColor={data.blockedTasks.length > 0 ? 'text-orange-600' : 'text-emerald-600'}
            >
              {data.blockedTasks.length === 0 ? (
                <p className="text-[13px] text-emerald-600 py-2 flex items-center gap-1.5"><FaCheckCircle size={12} /> No blocked tasks</p>
              ) : (
                <div className="divide-y divide-[#F3F3F3]">
                  {data.blockedTasks.map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-start gap-3 py-3 px-4 hover:bg-[#F9F9F9] rounded-[8px] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#DD3A44] transition-colors truncate">{t.title}</p>
                        {t.blockedReason && (
                          <p className="text-[12px] text-orange-600 mt-0.5 line-clamp-1">⚠ {t.blockedReason}</p>
                        )}
                        {(t.company || t.project) && (
                          <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                            {t.company?.name}{t.project ? ` · ${t.project.name}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={t.priority} />
                        <AgentBadge agent={t.ownerAgent} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Recent Completions ─────────────────────────────────── */}
            <SectionCard
              title="Completed in Last 24h"
              icon={<FaCheckCircle size={13} />}
              count={data.recentCompletions.length}
              countColor="text-emerald-600"
            >
              {data.recentCompletions.length === 0 ? (
                <p className="text-[13px] text-[#A3A3A3] py-2">Nothing completed in the last 24 hours</p>
              ) : (
                <div className="divide-y divide-[#F3F3F3]">
                  {data.recentCompletions.map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-start gap-3 py-3 px-4 hover:bg-[#F9F9F9] rounded-[8px] transition-colors group">
                      <FaCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={13} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#DD3A44] transition-colors truncate">{t.title}</p>
                        {t.completionNote && (
                          <p className="text-[12px] text-[#737373] mt-0.5 line-clamp-1">{t.completionNote}</p>
                        )}
                        {t.company && <p className="text-[11px] text-[#A3A3A3] mt-0.5">{t.company.name}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.taskType && <span className="text-[11px] text-[#737373] capitalize">{t.taskType}</span>}
                        <AgentBadge agent={t.ownerAgent} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Pending Handoffs ───────────────────────────────────── */}
            {data.pendingHandoffs.total > 0 && (
              <SectionCard
                title="Pending Handoffs"
                icon={<FaBolt size={13} />}
                count={data.pendingHandoffs.total}
                countColor="text-violet-600"
              >
                <div className="space-y-3">
                  {Object.entries(data.pendingHandoffs.byAgent).map(([agent, handoffs]) => (
                    <div key={agent}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${AGENT_DOT[agent] ?? 'bg-gray-400'}`} />
                        <span className="text-[12px] font-semibold text-[#525252] capitalize">→ {agent}</span>
                        <span className="text-[11px] text-[#A3A3A3]">({handoffs.length})</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {handoffs.map(h => (
                          <div key={h.id} className="flex items-start justify-between gap-2 py-2 px-3 bg-[#F9F9F9] rounded-[8px]">
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{h.summary}</p>
                              <p className="text-[11px] text-[#A3A3A3]">from <span className="capitalize">{h.fromAgent}</span> · {new Date(h.createdAt).toLocaleDateString()}</p>
                            </div>
                            {h.decisionNeeded && (
                              <span className="text-[10px] font-semibold text-[#DD3A44] shrink-0">decision needed</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
