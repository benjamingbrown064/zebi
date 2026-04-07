'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/lib/use-workspace'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'
import {
  FaBolt, FaExclamationTriangle, FaHourglass, FaClock, FaCheckCircle,
} from 'react-icons/fa'
import { getAIMemories, createAIMemory, AIMemory } from '@/app/actions/ai-memory'

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TOP_TABS = [
  { id: 'roster',   label: 'Agents' },
  { id: 'queue',    label: 'Queue' },
  { id: 'comms',    label: 'Comms' },
  { id: 'skills',   label: 'Skills' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'memory',   label: 'Memory' },
] as const
type TopTab = typeof TOP_TABS[number]['id']

// ─── Shared helpers ───────────────────────────────────────────────────────────

const AGENT_AVATARS: Record<string, string> = { harvey: '🧠', doug: '🤖', theo: '🔬', casper: '👻' }
const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const
type Agent = typeof AGENTS[number]

const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  harvey: { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  theo:   { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  doug:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  casper: { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  ben:    { bg: 'bg-[#F3F3F3]',  text: 'text-[#1A1C1C]',  dot: 'bg-[#1A1C1C]' },
}
const agentColor = (a: string) => AGENT_COLORS[a] ?? { bg: 'bg-[#F3F3F3]', text: 'text-[#474747]', dot: 'bg-[#C6C6C6]' }

function AgentPill({ agent }: { agent: string }) {
  const c = agentColor(agent)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {agent === 'all' ? 'everyone' : agent.charAt(0).toUpperCase() + agent.slice(1)}
    </span>
  )
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60000) return 'just now'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}

// ─── ROSTER TAB ───────────────────────────────────────────────────────────────

function RosterTab() {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const wsId = workspaceId || 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    fetch(`/api/agents?workspaceId=${wsId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents) })
      .finally(() => setLoading(false))
  }, [workspaceId])

  const PRESENCE_DOT: Record<string, string> = {
    active: 'bg-green-500', idle: 'bg-yellow-400', offline: 'bg-[#C6C6C6]',
  }

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>

  if (agents.length === 0) return (
    <div className="text-center py-16 text-[#A3A3A3] text-[14px]">No agents configured yet.</div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agents.map(agent => (
        <div
          key={agent.id}
          onClick={() => router.push(`/agents/${agent.id}`)}
          className="bg-white border border-[#E5E5E5] rounded p-6 cursor-pointer hover:border-[#C6C6C6] transition group"
          style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F3F3F3] rounded flex items-center justify-center text-2xl flex-shrink-0">
                {agent.avatar || AGENT_AVATARS[agent.id] || '🤖'}
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#1A1A1A]">{agent.name}</h2>
                <p className="text-[12px] text-[#737373]">{agent.role || 'Agent'}</p>
                {agent.perspective && <p className="text-[11px] text-[#A3A3A3]">{agent.perspective}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${PRESENCE_DOT[agent.presence] || PRESENCE_DOT.offline}`} />
              <span className="text-[11px] text-[#737373] capitalize">{agent.presence}</span>
            </div>
          </div>
          {agent.tagline && (
            <p className="text-[13px] text-[#474747] italic mb-4 border-l-2 border-[#E5E5E5] pl-3">"{agent.tagline}"</p>
          )}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#F9F9F9] rounded p-2 text-center">
              <div className="text-[15px] font-bold text-[#1A1A1A]">{agent.openTasks}</div>
              <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Open</div>
            </div>
            <div className="bg-[#F9F9F9] rounded p-2 text-center">
              <div className="text-[11px] text-[#737373]">Last seen</div>
              <div className="text-[12px] font-medium text-[#474747]">{timeAgo(agent.lastSeenAt || new Date(0).toISOString())}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-[#F3F3F3] text-[#474747]">{agent.status}</span>
            <svg className="w-4 h-4 text-[#C6C6C6] group-hover:text-[#737373] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── QUEUE TAB ────────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<Agent, { dot: string; label: string; description: string }> = {
  harvey: { dot: 'bg-violet-500', label: 'Harvey', description: 'Orchestration · Planning · Founder comms · Blockers' },
  theo:   { dot: 'bg-sky-500',    label: 'Theo',   description: 'Research · Synthesis · Evidence · Insights' },
  doug:   { dot: 'bg-emerald-500',label: 'Doug',   description: 'Implementation · Debugging · Shipping' },
  casper: { dot: 'bg-orange-500', label: 'Casper', description: 'Parallel dev · Overflow · QA · Features' },
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5' }
const PRIORITY_CLS: Record<number, string> = {
  1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-700', 4: 'bg-gray-100 text-gray-500', 5: 'bg-gray-50 text-gray-400',
}

function QueueTab() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [activeAgent, setActiveAgent] = useState<Agent>('harvey')
  const [tasks, setTasks] = useState<any[]>([])
  const [handoffs, setHandoffs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const [tr, hr] = await Promise.all([
        fetch(`/api/tasks/direct?workspaceId=${workspaceId}&ownerAgent=${activeAgent}`),
        fetch(`/api/handoffs?workspaceId=${workspaceId}&toAgent=${activeAgent}&status=pending`),
      ])
      const td = await tr.json(); const hd = await hr.json()
      setTasks(td.tasks ?? []); setHandoffs(hd.handoffs ?? [])
    } finally { setLoading(false) }
  }, [workspaceId, activeAgent])

  useEffect(() => { if (!wsLoading && workspaceId) load() }, [wsLoading, workspaceId, load])

  const blocked   = tasks.filter((t: any) => t.blockedReason)
  const decisions = tasks.filter((t: any) => t.decisionNeeded && !t.blockedReason)
  const waiting   = tasks.filter((t: any) => t.waitingOn === 'ben' && !t.blockedReason)
  const stale     = tasks.filter((t: any) => {
    const age = Date.now() - new Date(t.updatedAt).getTime()
    return age > 48*60*60*1000 && !t.blockedReason && !t.decisionNeeded
  })
  const special = new Set([...blocked, ...decisions, ...waiting, ...stale].map((t: any) => t.id))
  const ready = tasks.filter((t: any) => !special.has(t.id)).sort((a: any, b: any) => a.priority - b.priority)
  const openHandoffs = handoffs.filter((h: any) => h.status === 'pending')
  const cfg = AGENT_CONFIG[activeAgent]

  return (
    <div>
      {/* Agent selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {AGENTS.map(agent => {
          const c = AGENT_CONFIG[agent]
          const isActive = agent === activeAgent
          return (
            <button key={agent} onClick={() => setActiveAgent(agent)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-[13px] font-medium transition border ${
                isActive ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#474747] border-[#E5E5E5] hover:border-[#C4C4C4]'
              }`}>
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : c.dot}`} />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Agent summary */}
      <div className="bg-white rounded px-5 py-4 mb-6 flex items-center justify-between gap-4 border border-[#E5E5E5]">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">{cfg.label}</h2>
          </div>
          <p className="text-[12px] text-[#737373]">{cfg.description}</p>
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div><p className="text-[20px] font-bold text-[#1A1A1A]">{tasks.length}</p><p className="text-[10px] text-[#A3A3A3]">tasks</p></div>
          {openHandoffs.length > 0 && <div><p className="text-[20px] font-bold text-violet-600">{openHandoffs.length}</p><p className="text-[10px] text-[#A3A3A3]">handoffs</p></div>}
          {blocked.length > 0 && <div><p className="text-[20px] font-bold text-orange-600">{blocked.length}</p><p className="text-[10px] text-[#A3A3A3]">blocked</p></div>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-4">
          {[
            { title: 'Open Handoffs',           items: openHandoffs, icon: <FaBolt size={12} />,                isHandoff: true },
            { title: 'Blocked',                  items: blocked,     icon: <FaExclamationTriangle size={12} />, isHandoff: false },
            { title: 'Decision Needed',          items: decisions,   icon: <FaHourglass size={12} />,           isHandoff: false },
            { title: 'Waiting on Ben',           items: waiting,     icon: <FaHourglass size={12} />,           isHandoff: false },
            { title: 'Stale — No Update 48h+',   items: stale,       icon: <FaClock size={12} />,               isHandoff: false },
            { title: 'Ready to Work',            items: ready,       icon: <FaCheckCircle size={12} />,         isHandoff: false },
          ].filter(g => g.title === 'Ready to Work' || g.items.length > 0).map(group => (
            <div key={group.title} className="bg-white rounded border border-[#E5E5E5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#737373]">{group.icon}</span>
                <h3 className="text-[13px] font-semibold text-[#474747]">{group.title}</h3>
                <span className="text-[11px] text-[#A3A3A3]">({group.items.length})</span>
              </div>
              {group.items.length === 0 ? (
                <p className="text-[13px] text-[#A3A3A3]">Nothing here — queue is clear.</p>
              ) : group.isHandoff ? (
                <div className="space-y-2">
                  {group.items.map((h: any) => (
                    <div key={h.id} className="bg-violet-50 rounded p-3 border border-violet-100">
                      <p className="text-[13px] font-medium text-[#1A1A1A] mb-1">{h.summary}</p>
                      <p className="text-[12px] text-[#737373]">{h.requestedOutcome}</p>
                      <p className="text-[11px] text-[#A3A3A3] mt-1">from {h.fromAgent} · {new Date(h.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[#F3F3F3]">
                  {group.items.map((t: any) => (
                    <Link key={t.id} href={`/tasks/${t.id}`}
                      className="flex items-start gap-3 py-3 hover:bg-[#F9F9F9] rounded px-2 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{t.title}</p>
                        {t.blockedReason && <p className="text-[11px] text-orange-600 mt-0.5">⚠ {t.blockedReason}</p>}
                        {t.nextAction && <p className="text-[11px] text-[#A3A3A3] mt-0.5">→ {t.nextAction}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORITY_CLS[t.priority] || 'bg-gray-100 text-gray-500'}`}>
                        {PRIORITY_LABEL[t.priority] || `P${t.priority}`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── COMMS TAB ────────────────────────────────────────────────────────────────

function CommsTab() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [threads, setThreads]               = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [messages, setMessages]             = useState<any[]>([])
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [agentFilter, setAgentFilter]       = useState('')
  const [actionOnly, setActionOnly]         = useState(false)
  const [search, setSearch]                 = useState('')

  const loadThreads = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    const p = new URLSearchParams({ workspaceId, limit: '200' })
    if (agentFilter) p.set('toAgent', agentFilter)
    fetch(`/api/bus/threads?${p}`)
      .then(r => r.json())
      .then(d => { setThreads(d.threads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspaceId, agentFilter])

  useEffect(() => { if (!wsLoading) loadThreads() }, [wsLoading, loadThreads])

  useEffect(() => {
    if (!selectedThread || !workspaceId) return
    setLoadingMsgs(true)
    fetch(`/api/bus/messages?workspaceId=${workspaceId}&threadId=${selectedThread}`)
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []) })
      .finally(() => setLoadingMsgs(false))
  }, [selectedThread, workspaceId])

  const filtered = threads.filter(t => {
    if (actionOnly && !t.actionRequired) return false
    if (search) {
      const q = search.toLowerCase()
      return t.subject?.toLowerCase().includes(q) || t.latestPreview?.toLowerCase().includes(q)
    }
    return true
  })

  const stats = {
    threads: threads.length,
    messages: threads.reduce((s, t) => s + t.messageCount, 0),
    unread: threads.filter(t => t.unreadCount > 0).length,
    actions: threads.filter(t => t.actionRequired).length,
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
      {/* Left panel */}
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-white border border-[#E5E5E5] rounded overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[#E5E5E5]">
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="bg-[#F9F9F9] rounded p-1.5 text-center">
                <p className="text-[15px] font-semibold text-[#1A1A1A]">{v}</p>
                <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wide">{k}</p>
              </div>
            ))}
          </div>
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-[12px] border border-[#E5E5E5] rounded bg-[#F9F9F9] focus:outline-none focus:border-[#1A1A1A] mb-2" />
          <div className="flex gap-2">
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[12px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
              <option value="">All agents</option>
              {['harvey','theo','doug','casper','ben'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => setActionOnly(v => !v)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded border transition ${actionOnly ? 'bg-black text-white border-black' : 'bg-white text-[#474747] border-[#E5E5E5]'}`}>
              Actions
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> :
           filtered.length === 0 ? <p className="text-[#A3A3A3] text-[12px] text-center py-8">No messages yet.</p> :
           filtered.map(t => (
            <button key={t.threadId} onClick={() => setSelectedThread(t.threadId)}
              className={`w-full text-left px-4 py-3 border-b border-[#F3F3F3] transition ${selectedThread === t.threadId ? 'bg-[#F3F3F3]' : 'hover:bg-[#F9F9F9]'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <AgentPill agent={t.openedBy} />
                  {t.actionRequired && <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 rounded">ACTION</span>}
                  {t.unreadCount > 0 && <span className="w-4 h-4 rounded-full bg-[#1A1C1C] text-white text-[9px] flex items-center justify-center">{t.unreadCount}</span>}
                </div>
                <span className="text-[10px] text-[#A3A3A3]">{timeAgo(t.latestAt)}</span>
              </div>
              <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{t.subject}</p>
              <p className="text-[11px] text-[#737373] truncate">{t.latestPreview}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white border border-[#E5E5E5] rounded overflow-hidden flex flex-col">
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="text-[14px] font-medium text-[#1A1A1A] mb-1">Agent Comms</p>
            <p className="text-[13px] text-[#A3A3A3]">Select a thread to read the conversation.</p>
          </div>
        ) : loadingMsgs ? (
          <div className="flex-1 flex justify-center items-center"><LoadingSpinner /></div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg: any, i: number) => {
              const c = agentColor(msg.fromAgent)
              return (
                <div key={msg.id} className={`flex gap-3 ${i > 0 ? 'pt-4 border-t border-[#F3F3F3]' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                    <span className={`text-[11px] font-bold ${c.text}`}>{msg.fromAgent.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AgentPill agent={msg.fromAgent} />
                      <span className="text-[10px] text-[#C6C6C6]">→</span>
                      <AgentPill agent={msg.toAgent} />
                      <span className="text-[11px] text-[#A3A3A3] ml-auto">{new Date(msg.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded px-4 py-3">
                      <p className="text-[13px] text-[#1A1C1C] whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SKILLS TAB ───────────────────────────────────────────────────────────────

function SkillsTab() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const [skills, setSkills]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus]     = useState('all')

  const CATEGORIES = ['research', 'outreach', 'content', 'scraping', 'mailer', 'lead-gen', 'build', 'ops', 'other']
  const CAT_COLORS: Record<string, string> = {
    research: 'bg-sky-100 text-sky-700', outreach: 'bg-violet-100 text-violet-700',
    content: 'bg-pink-100 text-pink-700', build: 'bg-emerald-100 text-emerald-700',
    ops: 'bg-orange-100 text-orange-700', other: 'bg-[#F3F3F3] text-[#474747]',
  }
  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    draft:  'bg-[#F3F3F3] text-[#474747]',
    archived: 'bg-red-50 text-red-700',
  }

  useEffect(() => {
    if (!workspaceId) return
    const p = new URLSearchParams({ workspaceId, status: status === 'all' ? 'all' : status, limit: '100' })
    if (search) p.set('search', search)
    if (category !== 'all') p.set('category', category)
    fetch(`/api/skills?${p}`)
      .then(r => r.json())
      .then(d => { setSkills(d.skills ?? []); setLoading(false) })
  }, [workspaceId, search, category, status])

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="text" placeholder="Search skills…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none focus:border-[#1A1A1A]" />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
       skills.length === 0 ? <p className="text-[#A3A3A3] text-[14px] py-12 text-center">No skills found.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {skills.map((skill: any) => (
            <div key={skill.id} onClick={() => router.push(`/skills/${skill.id}`)}
              className="bg-white border border-[#E5E5E5] rounded p-4 cursor-pointer hover:border-[#C6C6C6] transition">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-[14px] font-semibold text-[#1A1A1A]">{skill.title}</h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {skill.status !== 'active' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[skill.status] || 'bg-[#F3F3F3] text-[#474747]'}`}>{skill.status}</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${CAT_COLORS[skill.category] || CAT_COLORS.other}`}>{skill.category}</span>
                </div>
              </div>
              {skill.description && <p className="text-[12px] text-[#737373] line-clamp-2">{skill.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-[#A3A3A3] capitalize">{skill.skillType}</span>
                <span className="text-[#C6C6C6]">·</span>
                <span className="text-[11px] text-[#A3A3A3]">v{skill.version}</span>
                {skill.tags?.length > 0 && skill.tags.slice(0,3).map((tag: string) => (
                  <span key={tag} className="text-[10px] bg-[#F3F3F3] text-[#474747] px-1.5 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AI INSIGHTS TAB ─────────────────────────────────────────────────────────

function InsightsTab() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [insights, setInsights]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected]     = useState<any | null>(null)

  const TYPES = ['opportunity', 'risk', 'strategy', 'optimization']
  const TYPE_COLORS: Record<string, string> = {
    opportunity: 'bg-emerald-100 text-emerald-700', risk: 'bg-red-100 text-red-700',
    strategy: 'bg-violet-100 text-violet-700', optimization: 'bg-sky-100 text-sky-700',
  }

  useEffect(() => {
    if (!workspaceId) return
    const p = new URLSearchParams({ workspaceId, status: 'new', limit: '100' })
    if (search) p.set('search', search)
    if (typeFilter) p.set('type', typeFilter)
    fetch(`/api/insights?${p}`)
      .then(r => r.json())
      .then(d => { setInsights(d.insights ?? []); setLoading(false) })
  }, [workspaceId, search, typeFilter])

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-3 mb-4 flex-wrap">
          <input type="text" placeholder="Search insights…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none focus:border-[#1A1A1A]" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
         insights.length === 0 ? <p className="text-[#A3A3A3] text-[14px] py-12 text-center">No insights yet.</p> : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {insights.map((ins: any) => (
              <div key={ins.id} onClick={() => setSelected(ins)}
                className={`bg-white border rounded p-4 cursor-pointer transition ${selected?.id === ins.id ? 'border-[#1A1A1A]' : 'border-[#E5E5E5] hover:border-[#C6C6C6]'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">{ins.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${TYPE_COLORS[ins.insightType] || 'bg-[#F3F3F3] text-[#474747]'}`}>{ins.insightType}</span>
                </div>
                <p className="text-[12px] text-[#737373] line-clamp-2">{ins.summary}</p>
                <p className="text-[10px] text-[#A3A3A3] mt-1.5">{ins.createdBy || 'unknown'} · {timeAgo(ins.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="w-[360px] flex-shrink-0 bg-white border border-[#E5E5E5] rounded p-5 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">{selected.title}</h2>
            <button onClick={() => setSelected(null)} className="text-[#A3A3A3] hover:text-[#1A1A1A] flex-shrink-0">✕</button>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[selected.insightType] || 'bg-[#F3F3F3] text-[#474747]'}`}>{selected.insightType}</span>
          <p className="text-[13px] text-[#474747] mt-3 leading-relaxed">{selected.summary}</p>
          {selected.suggestedActions && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Suggested Actions</p>
              <div className="space-y-1">
                {(Array.isArray(selected.suggestedActions) ? selected.suggestedActions : []).map((a: string, i: number) => (
                  <p key={i} className="text-[12px] text-[#474747]">• {a}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MEMORY TAB ───────────────────────────────────────────────────────────────

function MemoryTab() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [memories, setMemories]       = useState<AIMemory[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterType, setFilterType]   = useState('all')
  const [selected, setSelected]       = useState<AIMemory | null>(null)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const filters: any = {}
    if (search) filters.search = search
    if (filterAgent !== 'all') filters.authorAgent = filterAgent
    if (filterType  !== 'all') filters.entryType   = filterType
    const data = await getAIMemories(workspaceId, filters)
    setMemories(data)
    setLoading(false)
  }, [workspaceId, search, filterAgent, filterType])

  useEffect(() => { if (!wsLoading && workspaceId) load() }, [wsLoading, workspaceId, load])

  const ENTRY_TYPES = ['progress', 'blocker', 'decision', 'context', 'daily_wrap', 'other']

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-3 mb-4 flex-wrap">
          <input type="text" placeholder="Search memory…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none focus:border-[#1A1A1A]" />
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
            <option value="all">All agents</option>
            {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
            <option value="all">All types</option>
            {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
         memories.length === 0 ? <p className="text-[#A3A3A3] text-[14px] py-12 text-center">No memory entries found.</p> : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {memories.map((mem: any) => (
              <div key={mem.id} onClick={() => setSelected(mem)}
                className={`bg-white border rounded p-4 cursor-pointer transition ${selected?.id === mem.id ? 'border-[#1A1A1A]' : 'border-[#E5E5E5] hover:border-[#C6C6C6]'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{mem.title || mem.content?.slice(0,80)}</p>
                  <span className="text-[10px] bg-[#F3F3F3] text-[#474747] px-1.5 py-0.5 rounded capitalize flex-shrink-0">{mem.entryType || 'note'}</span>
                </div>
                {mem.description && <p className="text-[12px] text-[#737373] line-clamp-2">{mem.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  {mem.authorAgent && <AgentPill agent={mem.authorAgent} />}
                  <span className="text-[10px] text-[#C6C6C6]">{timeAgo(mem.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="w-[360px] flex-shrink-0 bg-white border border-[#E5E5E5] rounded p-5 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">{(selected as any).title || 'Memory'}</h2>
            <button onClick={() => setSelected(null)} className="text-[#A3A3A3] hover:text-[#1A1A1A]">✕</button>
          </div>
          {(selected as any).authorAgent && <AgentPill agent={(selected as any).authorAgent} />}
          <p className="text-[13px] text-[#474747] mt-3 leading-relaxed whitespace-pre-wrap">
            {(selected as any).content || (selected as any).description || ''}
          </p>
          <p className="text-[10px] text-[#A3A3A3] mt-4">{timeAgo((selected as any).updatedAt)}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AgentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') || 'roster') as TopTab
  const activeTab = TOP_TABS.find(t => t.id === tabParam) ? tabParam : 'roster'

  function setTab(id: TopTab) {
    router.push(`/agents?tab=${id}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#F3F3F3] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1">Zebi</p>
          <h1 className="text-[20px] font-bold text-[#1A1A1A] mb-3">Agents</h1>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto bg-white rounded border border-[#E5E5E5] p-1 w-fit">
            {TOP_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-4 py-1.5 rounded text-[13px] font-medium whitespace-nowrap transition flex-shrink-0 ${
                  activeTab === tab.id ? 'bg-[#1A1A1A] text-white' : 'text-[#474747] hover:bg-[#F3F3F3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-16">
        {activeTab === 'roster'   && <RosterTab />}
        {activeTab === 'queue'    && <QueueTab />}
        {activeTab === 'comms'    && <CommsTab />}
        {activeTab === 'skills'   && <SkillsTab />}
        {activeTab === 'insights' && <InsightsTab />}
        {activeTab === 'memory'   && <MemoryTab />}
      </div>
    </div>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center"><LoadingSpinner /></div>}>
      <AgentsPageContent />
    </Suspense>
  )
}
