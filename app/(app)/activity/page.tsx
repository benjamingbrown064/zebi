'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { useWorkspace } from '@/lib/use-workspace'
import {
  FaSync, FaRobot, FaCheckCircle, FaBolt, FaExclamationTriangle,
  FaPlus, FaPen, FaArrowRight, FaLightbulb, FaBrain, FaBalanceScale,
  FaFilter
} from 'react-icons/fa'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: string
  eventType: string
  eventPayload: any
  createdAt: string
  aiAgent?: string | null
  companyId?: string | null
  projectId?: string | null
  objectiveId?: string | null
  taskId?: string | null
  task?: { id: string; title: string } | null
  goal?: { id: string; name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  harvey: 'bg-violet-100 text-violet-700',
  theo:   'bg-sky-100 text-sky-700',
  doug:   'bg-emerald-100 text-emerald-700',
  casper: 'bg-orange-100 text-orange-700',
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  task_created:       <FaPlus size={11} className="text-emerald-500" />,
  task_updated:       <FaPen size={11} className="text-sky-500" />,
  task_completed:     <FaCheckCircle size={11} className="text-emerald-600" />,
  task_assigned:      <FaRobot size={11} className="text-violet-500" />,
  task_blocked:       <FaExclamationTriangle size={11} className="text-orange-500" />,
  handoff_created:    <FaBolt size={11} className="text-violet-500" />,
  handoff_accepted:   <FaCheckCircle size={11} className="text-emerald-500" />,
  decision_requested: <FaBalanceScale size={11} className="text-[#1A1C1C]" />,
  insight_created:    <FaLightbulb size={11} className="text-yellow-500" />,
  memory_created:     <FaBrain size={11} className="text-sky-500" />,
  status_changed:     <FaArrowRight size={11} className="text-[#737373]" />,
}

function eventLabel(entry: ActivityEntry): string {
  const t = entry.eventType
  const payload = entry.eventPayload ?? {}
  const taskTitle = entry.task?.title ?? payload.title ?? 'a task'

  const map: Record<string, string> = {
    task_created:       `Created "${taskTitle}"`,
    task_updated:       `Updated "${taskTitle}"`,
    task_completed:     `Completed "${taskTitle}"`,
    task_assigned:      `Assigned "${taskTitle}" to ${payload.assignee ?? 'agent'}`,
    task_blocked:       `Blocked "${taskTitle}" — ${payload.reason ?? 'no reason given'}`,
    handoff_created:    `Handed off "${taskTitle}" from ${payload.from ?? '?'} → ${payload.to ?? '?'}`,
    handoff_accepted:   `Accepted handoff for "${taskTitle}"`,
    decision_requested: `Decision needed on "${taskTitle}"`,
    insight_created:    `Published insight: ${payload.title ?? 'untitled'}`,
    memory_created:     `Memory note: ${payload.title ?? 'untitled'}`,
    status_changed:     `Status changed on "${taskTitle}" → ${payload.status ?? '?'}`,
  }
  return map[t] ?? `${t.replace(/_/g, ' ')} — ${taskTitle}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const AGENTS = ['harvey', 'theo', 'doug', 'casper']
const EVENT_TYPES = [
  'task_created', 'task_updated', 'task_completed', 'task_assigned',
  'task_blocked', 'handoff_created', 'decision_requested', 'insight_created', 'memory_created'
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [logs, setLogs] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Filters
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      const res = await fetch(`/api/activity?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!wsLoading && workspaceId) load()
  }, [wsLoading, workspaceId, load])

  const filtered = logs.filter(l => {
    if (agentFilter && l.aiAgent !== agentFilter) return false
    if (typeFilter && l.eventType !== typeFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar workspaceName="Zebi" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-[220px]'} p-6 md:p-8`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[26px] font-semibold text-[#1A1A1A]">Activity Feed</h1>
            <p className="text-[13px] text-[#A3A3A3] mt-1">Shared timeline across all agents and work</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium border transition-all ${showFilters ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#474747] border-[#E5E5E5]'}`}
            >
              <FaFilter size={11} /> Filters
            </button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium text-[#474747] hover:bg-white border border-[#E5E5E5] bg-white disabled:opacity-50 transition-all">
              <FaSync size={11} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded p-4 mb-6 flex flex-wrap gap-4 border border-[#E5E5E5]">
            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">Agent</label>
              <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
                className="px-3 py-2 text-[13px] rounded-md border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1C1C] min-w-[140px]">
                <option value="">All agents</option>
                {AGENTS.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">Event type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-[13px] rounded-md border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1C1C] min-w-[180px]">
                <option value="">All events</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {(agentFilter || typeFilter) && (
              <div className="flex items-end">
                <button onClick={() => { setAgentFilter(''); setTypeFilter('') }}
                  className="px-3 py-2 text-[12px] text-[#1A1C1C] hover:text-[#474747] font-medium">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feed */}
        <div className="bg-white rounded divide-y divide-[#F3F3F3]">
          {loading && (
            <div className="flex items-center justify-center py-20 text-[#A3A3A3] text-[13px]">Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[#A3A3A3] text-[14px] mb-1">No activity yet</p>
              <p className="text-[#C4C4C4] text-[12px]">Activity is recorded as tasks are created, updated, and handed off.</p>
            </div>
          )}

          {!loading && filtered.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#F9F9F9] transition-colors">
              {/* Icon */}
              <div className="w-6 h-6 rounded-full bg-[#F3F3F3] flex items-center justify-center shrink-0 mt-0.5">
                {EVENT_ICONS[entry.eventType] ?? <FaArrowRight size={10} className="text-[#A3A3A3]" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#1A1A1A]">
                  {entry.task ? (
                    <Link href={`/tasks/${entry.task.id}`} className="hover:text-[#474747] transition-colors">
                      {eventLabel(entry)}
                    </Link>
                  ) : eventLabel(entry)}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-[#A3A3A3]">{timeAgo(entry.createdAt)}</span>
                  {entry.aiAgent && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${AGENT_COLORS[entry.aiAgent] ?? 'bg-gray-100 text-gray-500'}`}>
                      {entry.aiAgent}
                    </span>
                  )}
                </div>
              </div>

              {/* Time */}
              <span className="text-[11px] text-[#C4C4C4] shrink-0 mt-0.5">
                {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
