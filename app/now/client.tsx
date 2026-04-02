'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CaptureBar from '@/components/CaptureBar'
import ManagersNote from '@/components/ManagersNote'
import { useWorkspace } from '@/lib/use-workspace'

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
}

interface AgentStatus {
  agent: string
  status: 'active' | 'waiting' | 'blocked'
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
  harvey: 'Harvey',
  theo: 'Theo',
  doug: 'Doug',
  casper: 'Casper',
}

const AGENT_COLOURS: Record<string, string> = {
  harvey: '#2563EB',
  theo:   '#7C3AED',
  doug:   '#059669',
  casper: '#D97706',
}

const STATUS_COLOURS = {
  active:  { bg: '#F0FDF4', dot: '#22C55E', label: 'Active' },
  waiting: { bg: '#FFFBEB', dot: '#F59E0B', label: 'Waiting' },
  blocked: { bg: '#FEF2F2', dot: '#EF4444', label: 'Blocked' },
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' }
const PRIORITY_COLOURS: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-[#F3F3F3] text-[#474747]',
  4: 'bg-[#F3F3F3] text-[#A3A3A3]',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function formatDue(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'text-red-600' }
  if (days === 0) return { label: 'Due today', cls: 'text-orange-600' }
  if (days === 1) return { label: 'Due tomorrow', cls: 'text-yellow-600' }
  return { label: `Due in ${days}d`, cls: 'text-[#737373]' }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">{title}</h3>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded-full leading-none">
          {count}
        </span>
      )}
    </div>
  )
}

function TaskRow({
  task,
  onComplete,
  showAgent = false,
}: {
  task: QueueTask | AttentionItem
  onComplete?: (id: string) => void
  showAgent?: boolean
}) {
  const [completing, setCompleting] = useState(false)
  const router = useRouter()
  const due = formatDue((task as QueueTask).dueAt ?? (task as AttentionItem).dueAt)
  const priority = (task as QueueTask).priority

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onComplete) return
    setCompleting(true)
    onComplete(task.id)
  }

  return (
    <div
      className="group flex items-start gap-3 py-2.5 px-3 rounded-[8px] hover:bg-[#F9F9F9] cursor-pointer transition-colors"
      onClick={() => router.push(`/tasks?highlight=${task.id}`)}
    >
      {/* Complete button */}
      {onComplete && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border border-[#C6C6C6] hover:border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all flex items-center justify-center group/btn"
        >
          {completing && (
            <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#1A1A1A] leading-snug truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {(task as QueueTask).spaceName && (
            <span className="text-[11px] text-[#737373]">{(task as QueueTask).spaceName}</span>
          )}
          {showAgent && (task as AttentionItem).ownerAgent && (
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded"
              style={{
                color: AGENT_COLOURS[(task as AttentionItem).ownerAgent!] || '#737373',
                backgroundColor: (AGENT_COLOURS[(task as AttentionItem).ownerAgent!] || '#737373') + '15',
              }}
            >
              {AGENT_LABELS[(task as AttentionItem).ownerAgent!] || (task as AttentionItem).ownerAgent}
            </span>
          )}
          {due && <span className={`text-[11px] ${due.cls}`}>{due.label}</span>}
        </div>
      </div>

      {priority && priority <= 2 && (
        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLOURS[priority]}`}>
          {PRIORITY_LABELS[priority]}
        </span>
      )}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const router = useRouter()
  const col = AGENT_COLOURS[agent.agent] || '#737373'
  const st = STATUS_COLOURS[agent.status]

  return (
    <div
      className="bg-white border border-[#E5E5E5] rounded-[12px] p-4 cursor-pointer hover:border-[#C6C6C6] hover:shadow-sm transition-all"
      onClick={() => router.push(`/queue?agent=${agent.agent}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[11px] font-bold text-white"
            style={{ backgroundColor: col }}
          >
            {AGENT_LABELS[agent.agent]?.[0] || agent.agent[0].toUpperCase()}
          </div>
          <span className="text-[14px] font-semibold text-[#1A1A1A]">
            {AGENT_LABELS[agent.agent] || agent.agent}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: st.bg, color: st.dot === '#22C55E' ? '#15803D' : st.dot === '#F59E0B' ? '#92400E' : '#B91C1C' }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
          {st.label}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-3">
        <div className="text-center">
          <div className="text-[18px] font-bold text-[#1A1A1A] leading-none">{agent.activeCount}</div>
          <div className="text-[10px] text-[#A3A3A3] mt-0.5">Tasks</div>
        </div>
        {agent.blockedCount > 0 && (
          <div className="text-center">
            <div className="text-[18px] font-bold text-red-600 leading-none">{agent.blockedCount}</div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5">Blocked</div>
          </div>
        )}
        {agent.waitingOnBenCount > 0 && (
          <div className="text-center">
            <div className="text-[18px] font-bold text-amber-600 leading-none">{agent.waitingOnBenCount}</div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5">Waiting</div>
          </div>
        )}
        {agent.decisionsNeededCount > 0 && (
          <div className="text-center">
            <div className="text-[18px] font-bold text-purple-600 leading-none">{agent.decisionsNeededCount}</div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5">Decisions</div>
          </div>
        )}
      </div>

      {/* Top tasks */}
      {agent.topTasks.length > 0 ? (
        <div className="space-y-1.5">
          {agent.topTasks.map(t => (
            <div key={t.id} className="flex items-start gap-1.5">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: col }} />
              <p className="text-[12px] text-[#474747] leading-snug line-clamp-1">{t.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-[#C6C6C6] italic">No active tasks</p>
      )}
    </div>
  )
}

function AttentionSection({
  title,
  items,
  emptyText,
  showAgent = true,
}: {
  title: string
  items: AttentionItem[]
  emptyText: string
  showAgent?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="mb-5">
        <SectionHeader title={title} />
        <p className="text-[12px] text-[#C6C6C6] italic px-1">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <SectionHeader title={title} count={items.length} />
      <div className="space-y-0.5">
        {items.map(item => (
          <TaskRow key={item.id} task={item} showAgent={showAgent} />
        ))}
      </div>
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
      // Get a done status — we'll just PATCH completedAt
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      // Refresh
      load()
    } catch (e) {
      console.error('Failed to complete task', e)
    }
  }, [load])

  const mainClass = isMobile ? '' : sidebarCollapsed ? 'ml-16' : 'ml-64'

  // ── Date string ──────────────────────────────────────────────────────────
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const totalAlerts = data
    ? data.needsAttention.decisions.length +
      data.needsAttention.waitingOnBen.length +
      data.needsAttention.overdue.length
    : 0

  return (
    <div className="min-h-screen bg-[#F3F3F3]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={`${mainClass} transition-all duration-200`}>
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-[#F3F3F3] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
          <div className="max-w-[1400px] mx-auto flex items-center gap-4">
            <div className="flex-1">
              <CaptureBar onCaptured={load} />
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">

          {/* ── Page heading ─────────────────────────────────────────────── */}
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-[#1A1A1A]">Now</h1>
            <p className="text-[13px] text-[#737373] mt-0.5">{dateStr}</p>
          </div>

          {/* ── Manager's Note ───────────────────────────────────────────── */}
          <div className="mb-6">
            <ManagersNote />
          </div>

          {loading ? (
            /* ── Skeleton ─────────────────────────────────────────────── */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-[14px] p-5 space-y-3 animate-pulse">
                  <div className="h-3 bg-[#F3F3F3] rounded w-1/3" />
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-10 bg-[#F9F9F9] rounded-[8px]" />
                  ))}
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── Col 1: My Queue ────────────────────────────────────── */}
              <div className="bg-white rounded-[14px] p-5">
                <SectionHeader title="My Queue" count={data.myQueue.length} />

                {data.myQueue.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">✓</div>
                    <p className="text-[13px] text-[#737373]">Queue clear</p>
                    <p className="text-[12px] text-[#C6C6C6] mt-1">Use the bar above to add work</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {data.myQueue.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onComplete={handleCompleteTask}
                      />
                    ))}
                  </div>
                )}

                {/* Recent wins */}
                {data.recentWins.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[#F3F3F3]">
                    <SectionHeader title="Done today" />
                    <div className="space-y-1">
                      {data.recentWins.slice(0, 5).map(w => (
                        <div key={w.id} className="flex items-start gap-2 px-1 py-1">
                          <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-[#737373] truncate">{w.title}</p>
                            {w.ownerAgent && (
                              <p className="text-[11px]" style={{ color: AGENT_COLOURS[w.ownerAgent] || '#A3A3A3' }}>
                                {AGENT_LABELS[w.ownerAgent] || w.ownerAgent}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Col 2: Agent Status ─────────────────────────────────── */}
              <div>
                <SectionHeader title="Agent Status" />
                <div className="space-y-3">
                  {data.agentStatus.map(agent => (
                    <AgentCard key={agent.agent} agent={agent} />
                  ))}
                </div>

                {/* Quick link to founder view */}
                <button
                  onClick={() => router.push('/founder')}
                  className="mt-3 w-full text-[12px] text-[#737373] hover:text-[#1A1A1A] py-2 flex items-center justify-center gap-1.5 border border-[#E5E5E5] rounded-[8px] bg-white hover:bg-[#F9F9F9] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Full Founder View
                </button>
              </div>

              {/* ── Col 3: Needs Attention ──────────────────────────────── */}
              <div className="bg-white rounded-[14px] p-5">
                <SectionHeader
                  title="Needs Attention"
                  count={totalAlerts || undefined}
                />

                {totalAlerts === 0 && data.needsAttention.stale.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">🟢</div>
                    <p className="text-[13px] text-[#737373]">All clear</p>
                    <p className="text-[12px] text-[#C6C6C6] mt-1">No decisions or blockers</p>
                  </div>
                ) : (
                  <>
                    <AttentionSection
                      title="Decisions needed"
                      items={data.needsAttention.decisions}
                      emptyText="No decisions pending"
                      showAgent
                    />
                    <AttentionSection
                      title="Waiting on you"
                      items={data.needsAttention.waitingOnBen}
                      emptyText="Nothing waiting on you"
                      showAgent
                    />
                    <AttentionSection
                      title="Overdue"
                      items={data.needsAttention.overdue}
                      emptyText="Nothing overdue"
                      showAgent
                    />
                    {data.needsAttention.stale.length > 0 && (
                      <div className="mb-5">
                        <SectionHeader title="Stale (48h+)" count={data.needsAttention.stale.length} />
                        <div className="space-y-0.5">
                          {data.needsAttention.stale.map(item => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] hover:bg-[#F9F9F9] cursor-pointer"
                              onClick={() => router.push(`/tasks?highlight=${item.id}`)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[#1A1A1A] truncate">{item.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.ownerAgent && (
                                    <span className="text-[11px]" style={{ color: AGENT_COLOURS[item.ownerAgent] || '#A3A3A3' }}>
                                      {AGENT_LABELS[item.ownerAgent] || item.ownerAgent}
                                    </span>
                                  )}
                                  {item.updatedAt && (
                                    <span className="text-[11px] text-[#A3A3A3]">{timeAgo(item.updatedAt)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Stats footer */}
                <div className="mt-4 pt-4 border-t border-[#F3F3F3] grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[16px] font-bold text-[#1A1A1A]">{data.counts.totalActive}</div>
                    <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Active</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-[#1A1A1A]">{data.counts.totalPendingHandoffs}</div>
                    <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Handoffs</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-[#1A1A1A]">{data.recentWins.length}</div>
                    <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Done today</div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-[#737373]">Failed to load — refresh to try again</div>
          )}
        </div>
      </div>
    </div>
  )
}
