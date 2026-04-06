'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useWorkspace } from '@/lib/use-workspace'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentMessage {
  id:             string
  threadId:       string
  fromAgent:      string
  toAgent:        string
  subject:        string | null
  body:           string
  taskId:         string | null
  taskTitle?:     string | null
  handoffId:      string | null
  companyId:      string | null
  actionRequired: boolean
  actionDeadline: string | null
  readAt:         string | null
  createdAt:      string
}

interface Thread {
  threadId:       string
  subject:        string
  openedBy:       string
  participants:   string[]
  messageCount:   number
  unreadCount:    number
  actionRequired: boolean
  latestAt:       string
  latestPreview:  string
  latestFrom:     string
  taskId:         string | null
  taskTitle:      string | null
  handoffId:      string | null
  companyId:      string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  harvey: { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  theo:   { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
  doug:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  casper: { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  ben:    { bg: 'bg-[#F3F3F3]',  text: 'text-[#1A1C1C]',  dot: 'bg-[#1A1C1C]' },
  system: { bg: 'bg-[#F3F3F3]',  text: 'text-[#474747]',  dot: 'bg-[#C6C6C6]' },
  all:    { bg: 'bg-[#F3F3F3]',  text: 'text-[#474747]',  dot: 'bg-[#C6C6C6]' },
}

const agentColor = (agent: string) =>
  AGENT_COLORS[agent] ?? { bg: 'bg-[#F3F3F3]', text: 'text-[#474747]', dot: 'bg-[#C6C6C6]' }

function AgentPill({ agent }: { agent: string }) {
  const c = agentColor(agent)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {agent === 'all' ? 'everyone' : agent.charAt(0).toUpperCase() + agent.slice(1)}
    </span>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const AGENTS = ['harvey', 'theo', 'doug', 'casper', 'ben']

// ─── Thread List Item ─────────────────────────────────────────────────────────

function ThreadRow({ thread, selected, onClick }: {
  thread:   Thread
  selected: boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-[#F3F3F3] transition-colors ${
        selected ? 'bg-[#F3F3F3]' : 'bg-white hover:bg-[#F9F9F9]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <AgentPill agent={thread.openedBy} />
          <span className="text-[#C6C6C6] text-[10px]">→</span>
          <AgentPill agent={thread.participants.find(p => p !== thread.openedBy && p !== 'all') ?? 'all'} />
          {thread.actionRequired && (
            <span className="px-1.5 py-0.5 rounded-[4px] bg-black text-white text-[10px] font-medium">
              ACTION
            </span>
          )}
          {thread.unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#1A1C1C] text-white text-[9px] font-bold flex items-center justify-center">
              {thread.unreadCount}
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#A3A3A3] flex-shrink-0">{timeAgo(thread.latestAt)}</span>
      </div>

      <p className="text-[13px] font-medium text-[#1A1C1C] truncate mb-0.5">
        {thread.subject}
      </p>
      <p className="text-[12px] text-[#747474] truncate">{thread.latestPreview}</p>

      {thread.taskTitle && (
        <p className="text-[11px] text-[#A3A3A3] mt-1 truncate">
          📋 {thread.taskTitle}
        </p>
      )}

      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] text-[#C6C6C6]">{thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}</span>
      </div>
    </button>
  )
}

// ─── Thread Detail ────────────────────────────────────────────────────────────

function ThreadDetail({ threadId, workspaceId }: { threadId: string; workspaceId: string }) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/bus/messages?workspaceId=${workspaceId}&threadId=${threadId}`)
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [threadId, workspaceId])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
    </div>
  )

  if (messages.length === 0) return (
    <div className="flex-1 flex items-center justify-center text-[#A3A3A3] text-sm">No messages in this thread.</div>
  )

  const opener = messages[0]

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Thread header */}
      <div className="px-6 py-4 border-b border-[#E5E5E5] bg-white">
        <h2 className="text-[15px] font-semibold text-[#1A1C1C] mb-2">
          {opener.subject ?? opener.body.slice(0, 80)}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {[...new Set(messages.map(m => m.fromAgent))].map(a => (
            <AgentPill key={a} agent={a} />
          ))}
          {opener.taskTitle && (
            <Link
              href={`/tasks?highlight=${opener.taskId}`}
              className="text-[11px] text-[#474747] bg-[#F3F3F3] px-2 py-0.5 rounded-[4px] hover:bg-[#E5E5E5] transition-colors"
            >
              📋 {opener.taskTitle}
            </Link>
          )}
          {opener.handoffId && (
            <span className="text-[11px] text-[#474747] bg-[#F3F3F3] px-2 py-0.5 rounded-[4px]">
              🔄 Linked handoff
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="px-6 py-4 space-y-4">
        {messages.map((msg, i) => {
          const c = agentColor(msg.fromAgent)
          const isFirst = i === 0
          return (
            <div key={msg.id} className={`flex gap-3 ${isFirst ? '' : 'pt-4 border-t border-[#F3F3F3]'}`}>
              {/* Avatar dot */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${c.bg}`}>
                <span className={`text-[11px] font-bold ${c.text}`}>
                  {msg.fromAgent.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <AgentPill agent={msg.fromAgent} />
                  <span className="text-[10px] text-[#C6C6C6]">→</span>
                  <AgentPill agent={msg.toAgent} />
                  {msg.actionRequired && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-black text-white text-[10px] font-medium">
                      ACTION REQUIRED
                    </span>
                  )}
                  <span className="text-[11px] text-[#A3A3A3] ml-auto flex-shrink-0">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Message body */}
                <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-[4px] px-4 py-3">
                  <p className="text-[13px] text-[#1A1C1C] whitespace-pre-wrap leading-relaxed">
                    {msg.body}
                  </p>
                </div>

                {/* Metadata */}
                {(msg.actionDeadline || msg.taskId || msg.readAt) && (
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {msg.actionDeadline && (
                      <span className="text-[11px] text-[#474747]">
                        ⏰ Action by {new Date(msg.actionDeadline).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    {msg.readAt && (
                      <span className="text-[11px] text-[#A3A3A3]">
                        ✓ Read {timeAgo(msg.readAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommsPage() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [threads,         setThreads]         = useState<Thread[]>([])
  const [loading,         setLoading]         = useState(true)
  const [selectedThread,  setSelectedThread]  = useState<string | null>(null)

  // Filters
  const [agentFilter,  setAgentFilter]  = useState('')
  const [actionOnly,   setActionOnly]   = useState(false)
  const [search,       setSearch]       = useState('')

  const load = useCallback(() => {
    if (!workspaceId) return
    setLoading(true)
    const params = new URLSearchParams({ workspaceId, limit: '200' })
    if (agentFilter) params.set('toAgent', agentFilter)
    fetch(`/api/bus/threads?${params}`)
      .then(r => r.json())
      .then(d => { setThreads(d.threads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspaceId, agentFilter])

  useEffect(() => { load() }, [load])

  // Stats
  const totalThreads    = threads.length
  const unreadThreads   = threads.filter(t => t.unreadCount > 0).length
  const actionThreads   = threads.filter(t => t.actionRequired).length
  const totalMessages   = threads.reduce((s, t) => s + t.messageCount, 0)

  // Filtered list
  const filtered = threads.filter(t => {
    if (actionOnly && !t.actionRequired) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.subject?.toLowerCase().includes(q) ||
        t.latestPreview.toLowerCase().includes(q) ||
        t.openedBy.toLowerCase().includes(q) ||
        t.participants.some(p => p.toLowerCase().includes(q)) ||
        t.taskTitle?.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (wsLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F9F9F9]">

      {/* Left panel — thread list */}
      <div className="w-[360px] flex-shrink-0 border-r border-[#E5E5E5] flex flex-col bg-white">

        {/* Header */}
        <div className="px-4 pt-6 pb-4 border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[15px] font-semibold text-[#1A1C1C]">Agent Comms</h1>
            <button
              onClick={load}
              className="text-[11px] text-[#474747] hover:text-[#1A1C1C] border border-[#E5E5E5] px-2 py-1 rounded-[4px] transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Threads',   value: totalThreads },
              { label: 'Messages',  value: totalMessages },
              { label: 'Unread',    value: unreadThreads },
              { label: 'Actions',   value: actionThreads },
            ].map(s => (
              <div key={s.label} className="bg-[#F9F9F9] rounded-[4px] p-2 text-center">
                <p className="text-[16px] font-semibold text-[#1A1C1C]">{s.value}</p>
                <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-[4px] bg-[#F9F9F9] focus:outline-none focus:border-[#1A1C1C] mb-2"
          />

          {/* Filter row */}
          <div className="flex items-center gap-2">
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[12px] border border-[#E5E5E5] rounded-[4px] bg-white focus:outline-none focus:border-[#1A1C1C]"
            >
              <option value="">All agents</option>
              {AGENTS.map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={() => setActionOnly(!actionOnly)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-[4px] border transition-colors ${
                actionOnly
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#474747] border-[#E5E5E5] hover:border-[#1A1C1C]'
              }`}
            >
              Actions only
            </button>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[#A3A3A3] text-sm px-4">
              {search || agentFilter || actionOnly
                ? 'No threads match your filters.'
                : 'No agent messages yet. Messages between agents will appear here.'}
            </div>
          ) : (
            filtered.map(thread => (
              <ThreadRow
                key={thread.threadId}
                thread={thread}
                selected={selectedThread === thread.threadId}
                onClick={() => setSelectedThread(thread.threadId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel — thread detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedThread && workspaceId ? (
          <ThreadDetail threadId={selectedThread} workspaceId={workspaceId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-12 h-12 rounded-full bg-[#F3F3F3] flex items-center justify-center mb-4">
              <span className="text-xl">💬</span>
            </div>
            <p className="text-[14px] font-medium text-[#1A1C1C] mb-1">Agent communication log</p>
            <p className="text-[13px] text-[#A3A3A3] max-w-sm">
              Every message between Harvey, Theo, Doug, Casper and Ben is logged here.
              Select a thread to read the full conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
