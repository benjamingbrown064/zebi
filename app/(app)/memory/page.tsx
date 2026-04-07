'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/lib/use-workspace'
import { getAIMemories, createAIMemory, AIMemory } from '@/app/actions/ai-memory'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  harvey: { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200', dot: 'bg-violet-500',  label: 'Harvey' },
  theo:   { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',    dot: 'bg-sky-500',     label: 'Theo' },
  doug:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500', label: 'Doug' },
  casper: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200', dot: 'bg-orange-500',  label: 'Casper' },
  ben:    { bg: 'bg-[#F3F3F3]',  text: 'text-[#1A1C1C]',  border: 'border-[#C6C6C6]',  dot: 'bg-[#1A1C1C]',  label: 'Ben' },
}

const ENTRY_TYPE_STYLE: Record<string, { label: string; icon: string; color: string }> = {
  daily_wrap: { label: 'Daily Wrap',  icon: '🌙', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  progress:   { label: 'Progress',    icon: '📈', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  decision:   { label: 'Decision',    icon: '✅', color: 'bg-green-50 text-green-700 border-green-200' },
  blocker:    { label: 'Blocker',     icon: '🚧', color: 'bg-red-50 text-red-700 border-red-200' },
  handoff:    { label: 'Handoff',     icon: '🤝', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  note:       { label: 'Note',        icon: '📝', color: 'bg-[#F3F3F3] text-[#474747] border-[#C6C6C6]' },
  routine:    { label: 'Routine',     icon: '🔄', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  summary:    { label: 'Summary',     icon: '📋', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

function agentStyle(agent: string | null) {
  return AGENT_STYLE[agent ?? ''] ?? { bg: 'bg-[#F3F3F3]', text: 'text-[#474747]', border: 'border-[#C6C6C6]', dot: 'bg-[#C6C6C6]', label: agent ?? 'Unknown' }
}

function entryStyle(type: string | null) {
  return ENTRY_TYPE_STYLE[type ?? 'note'] ?? ENTRY_TYPE_STYLE.note
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr     = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr)     return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'

  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(memories: AIMemory[]): Record<string, AIMemory[]> {
  const groups: Record<string, AIMemory[]> = {}
  for (const m of memories) {
    const key = m.date ?? m.createdAt.toString().split('T')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  return groups
}

// ─── Memory card ─────────────────────────────────────────────────────────────

function MemoryCard({ memory, onClick }: { memory: AIMemory; onClick: () => void }) {
  const agent  = agentStyle(memory.authorAgent ?? memory.createdBy)
  const entry  = entryStyle(memory.entryType)
  const isDailyWrap = memory.entryType === 'daily_wrap'

  const completed     = Array.isArray(memory.completed)    ? memory.completed    : []
  const decisions     = Array.isArray(memory.decisions)    ? memory.decisions    : []
  const blockers      = Array.isArray(memory.blockers)     ? memory.blockers     : []
  const pending       = Array.isArray(memory.pending)      ? memory.pending      : []

  return (
    <div
      onClick={onClick}
      className={`border rounded-[4px] p-4 cursor-pointer transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.06)] hover:border-[#1A1C1C] ${isDailyWrap ? agent.border + ' ' + agent.bg : 'border-[#C6C6C6] bg-white'}`}
    >
      {/* Top row: agent + entry type + confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${agent.dot}`} />
          <span className={`text-[12px] font-semibold ${agent.text}`}>{agent.label}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border ${entry.color}`}>
            {entry.icon} {entry.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className={`w-1 h-2 rounded-sm ${i <= memory.confidenceScore ? agent.dot : 'bg-[#E5E5E5]'}`} />
            ))}
          </div>
          <span className="text-[10px] text-[#474747]">{memory.confidenceScore}/10</span>
        </div>
      </div>

      {/* Title */}
      <p className="text-[14px] font-semibold text-[#1A1C1C] mb-1">{memory.title}</p>

      {/* Daily wrap summary */}
      {isDailyWrap ? (
        <div className="flex gap-4 mt-2">
          {completed.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-green-600 font-medium">✅ {completed.length} done</span>
            </div>
          )}
          {pending.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-blue-600 font-medium">⏳ {pending.length} pending</span>
            </div>
          )}
          {blockers.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-red-600 font-medium">🚧 {blockers.length} blocked</span>
            </div>
          )}
          {decisions.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-purple-600 font-medium">💡 {decisions.length} decisions</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-[#474747] line-clamp-2">{memory.description}</p>
      )}

      {/* Tags */}
      {memory.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {memory.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] bg-[#F3F3F3] text-[#474747] px-1.5 py-0.5 rounded-[4px]">{tag}</span>
          ))}
          {memory.tags.length > 4 && <span className="text-[10px] text-[#474747]">+{memory.tags.length - 4}</span>}
        </div>
      )}

      {/* Space/project context */}
      {(memory.space || memory.project) && (
        <div className="flex gap-2 mt-2">
          {memory.space   && <span className="text-[10px] text-[#474747] bg-[#F3F3F3] px-1.5 py-0.5 rounded-[4px]">📦 {memory.space.name}</span>}
          {memory.project && <span className="text-[10px] text-[#474747] bg-[#F3F3F3] px-1.5 py-0.5 rounded-[4px]">📁 {memory.project.name}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function MemoryDetail({ memory, onClose }: { memory: AIMemory; onClose: () => void }) {
  const agent  = agentStyle(memory.authorAgent ?? memory.createdBy)
  const entry  = entryStyle(memory.entryType)

  const completed    = Array.isArray(memory.completed)    ? memory.completed    : []
  const decisions    = Array.isArray(memory.decisions)    ? memory.decisions    : []
  const blockers     = Array.isArray(memory.blockers)     ? memory.blockers     : []
  const pending      = Array.isArray(memory.pending)      ? memory.pending      : []
  const tmrw         = Array.isArray(memory.tomorrowFirst)? memory.tomorrowFirst: []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className={`px-6 py-4 border-b border-[#C6C6C6] rounded-t-[4px] ${agent.bg}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${agent.dot}`} />
                <span className={`text-[12px] font-semibold ${agent.text}`}>{agent.label}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border ${entry.color}`}>{entry.icon} {entry.label}</span>
                {memory.date && <span className="text-[11px] text-[#474747]">{memory.date}</span>}
              </div>
              <h2 className="text-[15px] font-semibold text-[#1A1C1C]">{memory.title}</h2>
            </div>
            <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C] ml-4">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <div>
            <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-1">Summary</p>
            <p className="text-[13px] text-[#474747] whitespace-pre-wrap">{memory.description}</p>
          </div>

          {/* Daily wrap sections */}
          {completed.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-2">✅ Completed</p>
              <ul className="space-y-1">{completed.map((item: string, i: number) => (
                <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-green-500 shrink-0">•</span>{item}</li>
              ))}</ul>
            </div>
          )}
          {decisions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-2">💡 Decisions</p>
              <ul className="space-y-1">{decisions.map((item: string, i: number) => (
                <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-purple-500 shrink-0">•</span>{item}</li>
              ))}</ul>
            </div>
          )}
          {blockers.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-2">🚧 Blockers</p>
              <ul className="space-y-1">{blockers.map((item: string, i: number) => (
                <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-red-500 shrink-0">•</span>{item}</li>
              ))}</ul>
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-2">⏳ Pending</p>
              <ul className="space-y-1">{pending.map((item: string, i: number) => (
                <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-blue-500 shrink-0">•</span>{item}</li>
              ))}</ul>
            </div>
          )}
          {tmrw.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-2">🌅 Tomorrow First</p>
              <ul className="space-y-1">{tmrw.map((item: string, i: number) => (
                <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-[#474747] shrink-0">→</span>{item}</li>
              ))}</ul>
            </div>
          )}

          {/* Tags */}
          {memory.tags?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {memory.tags.map(tag => (
                  <span key={tag} className="text-[11px] bg-[#F3F3F3] text-[#474747] px-2 py-0.5 rounded-[4px]">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="text-[11px] text-[#474747] pt-2 border-t border-[#C6C6C6] space-y-0.5">
            {memory.space   && <p>Space: {memory.space.name}</p>}
            {memory.project && <p>Project: {memory.project.name}</p>}
            <p>Confidence: {memory.confidenceScore}/10</p>
            <p>Logged: {new Date(memory.createdAt).toLocaleString('en-GB')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Log memory modal ─────────────────────────────────────────────────────────

function LogMemoryModal({ workspaceId, onClose, onSave }: { workspaceId: string; onClose: () => void; onSave: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    title:          '',
    description:    '',
    authorAgent:    'ben',
    entryType:      'note',
    memoryType:     'summary',
    tags:           '',
    confidenceScore: 8,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return
    setSaving(true)
    try {
      await createAIMemory(workspaceId, PLACEHOLDER_USER_ID, {
        ...form,
        tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
        createdBy:   form.authorAgent,
        date:        today,
      })
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C6C6C6]">
          <h2 className="text-[15px] font-semibold text-[#1A1C1C]">Log Memory</h2>
          <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#474747] mb-1">Author</label>
              <select value={form.authorAgent} onChange={e => setForm(f => ({ ...f, authorAgent: e.target.value }))} className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#1A1C1C]">
                <option value="ben">Ben</option>
                <option value="harvey">Harvey</option>
                <option value="theo">Theo</option>
                <option value="doug">Doug</option>
                <option value="casper">Casper</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#474747] mb-1">Type</label>
              <select value={form.entryType} onChange={e => setForm(f => ({ ...f, entryType: e.target.value }))} className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#1A1C1C]">
                <option value="note">Note</option>
                <option value="progress">Progress</option>
                <option value="decision">Decision</option>
                <option value="blocker">Blocker</option>
                <option value="daily_wrap">Daily Wrap</option>
                <option value="summary">Summary</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What is this memory about?" className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="What happened, what was decided, what was built..." className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] resize-none" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. zebi, build, api" className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Confidence ({form.confidenceScore}/10)</label>
            <input type="range" min={1} max={10} value={form.confidenceScore} onChange={e => setForm(f => ({ ...f, confidenceScore: parseInt(e.target.value) }))} className="w-full" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#C6C6C6]">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#474747] border border-[#C6C6C6] rounded-[4px] hover:bg-[#F3F3F3]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.description.trim()} className="px-4 py-2 text-[13px] font-medium bg-[#1A1C1C] text-white rounded-[4px] hover:bg-[#333] disabled:opacity-40">
            {saving ? 'Saving…' : 'Log Memory'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [memories, setMemories]         = useState<AIMemory[]>([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState<AIMemory | null>(null)
  const [showLog, setShowLog]           = useState(false)
  const [search, setSearch]             = useState('')
  const [filterAgent, setFilterAgent]   = useState<string>('all')
  const [filterType, setFilterType]     = useState<string>('all')
  const [triggeringWrap, setTriggeringWrap] = useState(false)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const filters: any = {}
      if (search)                      filters.search      = search
      if (filterAgent !== 'all')       filters.authorAgent = filterAgent
      if (filterType  !== 'all')       filters.entryType   = filterType
      const data = await getAIMemories(workspaceId, filters)
      setMemories(data)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, search, filterAgent, filterType])

  useEffect(() => {
    if (!workspaceLoading && workspaceId) load()
  }, [workspaceId, workspaceLoading, load])

  const triggerDailyWraps = async () => {
    setTriggeringWrap(true)
    try {
      await fetch('/api/cron/daily-wraps')
      await load()
    } finally {
      setTriggeringWrap(false)
    }
  }

  const grouped  = groupByDate(memories)
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const totalWraps = memories.filter(m => m.entryType === 'daily_wrap').length
  const agents     = ['harvey', 'theo', 'doug', 'casper']

  return (
    <div className="flex h-screen bg-[#F9F9F9]">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#C6C6C6] px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-[#1A1C1C]">Memory</h1>
              <p className="text-[13px] text-[#474747] mt-0.5">What your agents have learned, decided, and done — day by day</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={triggerDailyWraps}
                disabled={triggeringWrap}
                className="text-[12px] border border-[#C6C6C6] text-[#474747] px-3 py-2 rounded-[4px] hover:bg-[#F3F3F3] disabled:opacity-40"
              >
                {triggeringWrap ? 'Generating…' : '🌙 Trigger Daily Wraps'}
              </button>
              <button
                onClick={() => setShowLog(true)}
                className="flex items-center gap-2 bg-[#1A1C1C] text-white text-[13px] font-medium px-4 py-2 rounded-[4px] hover:bg-[#333]"
              >
                <span className="text-base leading-none">+</span> Log Memory
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#1A1C1C]">{memories.length}</p>
              <p className="text-[11px] text-[#474747]">Total</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#1A1C1C]">{totalWraps}</p>
              <p className="text-[11px] text-[#474747]">Daily Wraps</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#1A1C1C]">{dateKeys.length}</p>
              <p className="text-[11px] text-[#474747]">Days</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-[#C6C6C6] px-8 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search memories…"
              className="border border-[#C6C6C6] rounded-[4px] pl-7 pr-3 py-1.5 text-[12px] focus:outline-none focus:border-[#1A1C1C] w-48"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#C6C6C6] text-xs">🔍</span>
          </div>

          {/* Agent filter */}
          <div className="flex gap-1.5">
            <button onClick={() => setFilterAgent('all')} className={`text-[11px] px-2.5 py-1.5 rounded-[4px] border transition-colors ${filterAgent === 'all' ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'}`}>All</button>
            {agents.map(a => {
              const s = agentStyle(a)
              return (
                <button key={a} onClick={() => setFilterAgent(a)} className={`text-[11px] px-2.5 py-1.5 rounded-[4px] border transition-colors capitalize ${filterAgent === a ? s.dot.replace('bg-', 'bg-') + ' text-white border-transparent' : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'}`}
                  style={filterAgent === a ? { backgroundColor: a === 'harvey' ? '#7c3aed' : a === 'theo' ? '#0284c7' : a === 'doug' ? '#059669' : '#ea580c', color: 'white', borderColor: 'transparent' } : {}}>
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Entry type filter */}
          <div className="flex gap-1.5">
            {['all', 'daily_wrap', 'progress', 'decision', 'blocker', 'note'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`text-[11px] px-2.5 py-1.5 rounded-[4px] border transition-colors ${filterType === t ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'}`}>
                {t === 'all' ? 'All types' : entryStyle(t).icon + ' ' + entryStyle(t).label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#C6C6C6] border-t-[#1A1C1C] rounded-full animate-spin" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[32px] mb-3">🧠</p>
              <p className="text-[15px] font-medium text-[#1A1C1C] mb-1">No memories yet</p>
              <p className="text-[13px] text-[#474747] mb-4">Memories are logged automatically at midnight, or you can log one manually</p>
              <button onClick={() => setShowLog(true)} className="bg-[#1A1C1C] text-white text-[13px] px-4 py-2 rounded-[4px] hover:bg-[#333]">Log Memory</button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8">
              {dateKeys.map(date => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-[#F9F9F9] py-1 z-10">
                    <div className="h-px flex-1 bg-[#C6C6C6]" />
                    <span className="text-[13px] font-semibold text-[#1A1C1C] whitespace-nowrap">{formatDate(date)}</span>
                    <span className="text-[11px] text-[#474747] whitespace-nowrap">{grouped[date].length} entr{grouped[date].length === 1 ? 'y' : 'ies'}</span>
                    <div className="h-px flex-1 bg-[#C6C6C6]" />
                  </div>

                  {/* Agent avatar row for the day */}
                  <div className="flex items-center gap-1.5 mb-3 pl-1">
                    {Array.from(new Set(grouped[date].map(m => m.authorAgent ?? m.createdBy ?? ''))).filter(Boolean).map(agent => {
                      const s = agentStyle(agent)
                      return <div key={agent} title={s.label} className={`w-5 h-5 rounded-full ${s.dot} border-2 border-white`} />
                    })}
                  </div>

                  {/* Memory cards */}
                  <div className="space-y-3">
                    {grouped[date].map(m => (
                      <MemoryCard key={m.id} memory={m} onClick={() => setSelected(m)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected  && <MemoryDetail memory={selected} onClose={() => setSelected(null)} />}
      {showLog   && <LogMemoryModal workspaceId={workspaceId!} onClose={() => setShowLog(false)} onSave={load} />}
    </div>
  )
}
