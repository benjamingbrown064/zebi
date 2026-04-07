'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useWorkspace } from '@/lib/use-workspace'

type Tab = 'overview' | 'work' | 'knowledge' | 'memory' | 'insights'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'work',       label: 'Work' },
  { id: 'knowledge',  label: 'Skills & Knowledge' },
  { id: 'memory',     label: 'Memory' },
  { id: 'insights',   label: 'Insights' },
]

const AGENT_AVATARS: Record<string, string> = {
  harvey: '🧠', doug: '🤖', theo: '🔬', casper: '👻',
}

const PRESENCE_DOT: Record<string, string> = {
  active: 'bg-green-500', idle: 'bg-yellow-400', offline: 'bg-[#C6C6C6]',
}

const STATUS_GROUPS = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'todo',        label: 'Ready' },
  { key: 'blocked',     label: 'Blocked' },
  { key: 'done',        label: 'Done' },
]

const LINK_TYPE_BADGE: Record<string, string> = {
  skill:     'bg-blue-50 text-blue-700',
  document:  'bg-purple-50 text-purple-700',
  briefing:  'bg-black text-white',
  url:       'bg-[#F3F3F3] text-[#474747]',
  file:      'bg-[#F3F3F3] text-[#474747]',
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60000) return 'Just now'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">{title}</p>
      {children}
    </div>
  )
}

function MarkdownText({ text }: { text: string }) {
  if (!text) return <span className="text-[#C6C6C6] text-[13px]">Not set</span>
  return (
    <div className="text-[13px] text-[#474747] leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ agent, onEdit }: { agent: any; onEdit: () => void }) {
  const requiredLinks = (agent.knowledgeLinks || []).filter((l: any) => l.required && (l.linkType === 'briefing' || l.linkType === 'document'))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column — identity */}
      <div className="lg:col-span-2 space-y-0">
        <div className="flex justify-end mb-4">
          <button
            onClick={onEdit}
            className="text-[12px] font-medium text-[#474747] border border-[#E5E5E5] px-3 py-1.5 rounded hover:bg-[#F3F3F3] transition flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        </div>

        <Section title="Identity">
          <MarkdownText text={agent.identity} />
        </Section>
        <Section title="Tone of Voice">
          <MarkdownText text={agent.toneOfVoice} />
        </Section>
        <Section title="Working Style">
          <MarkdownText text={agent.workingStyle} />
        </Section>
        <Section title="Core Responsibilities">
          <MarkdownText text={agent.coreResponsibilities} />
        </Section>
        <Section title="Decision Scope">
          <MarkdownText text={agent.decisionScope} />
        </Section>
        <Section title="Approval Boundaries">
          <MarkdownText text={agent.approvalBoundaries} />
        </Section>
        <Section title="Escalation Rules">
          <MarkdownText text={agent.escalationRules} />
        </Section>
      </div>

      {/* Right column — stats + foundational docs */}
      <div className="space-y-4">
        {/* Stats */}
        <div className="bg-white border border-[#E5E5E5] rounded p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3">Stats</p>
          <div className="space-y-2">
            {[
              { label: 'Open Tasks',      value: agent.stats?.openTasks || 0 },
              { label: 'Blocked',         value: agent.stats?.blockedTasks || 0 },
              { label: 'Decisions Needed',value: agent.stats?.decisionTasks || 0 },
              { label: 'Waiting on Ben',  value: agent.stats?.waitingOnBen || 0 },
              { label: 'Completed',       value: agent.stats?.doneTasks || 0 },
              { label: 'Active Handoffs', value: agent.stats?.totalHandoffs || 0 },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[12px] text-[#737373]">{s.label}</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Presence */}
        <div className="bg-white border border-[#E5E5E5] rounded p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3">Presence</p>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${PRESENCE_DOT[agent.presence] || PRESENCE_DOT.offline}`} />
            <span className="text-[13px] font-semibold text-[#1A1A1A] capitalize">{agent.presence}</span>
          </div>
          <p className="text-[12px] text-[#737373]">Last seen {timeAgo(agent.lastSeenAt)}</p>
          {agent.currentTaskTitle && (
            <p className="text-[12px] text-[#474747] mt-1.5 italic">"{agent.currentTaskTitle}"</p>
          )}
          <p className="text-[10px] text-[#C6C6C6] mt-2">Profile v{agent.profileVersion}</p>
        </div>

        {/* Foundational Docs */}
        {requiredLinks.length > 0 && (
          <div className="bg-[#1A1A1A] rounded p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60 mb-3">Foundational Docs</p>
            <div className="space-y-2">
              {requiredLinks.map((link: any) => (
                <div key={link.id} className="flex items-center gap-2">
                  <span className="text-white/40 text-[10px]">▸</span>
                  <span className="text-[12px] text-white/90">{link.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Work Tab ────────────────────────────────────────────────────────────────
function WorkTab({ agent }: { agent: any }) {
  const router = useRouter()
  const tasks: any[] = agent.tasks || []
  const handoffs: any[] = agent.handoffs || []

  const grouped = {
    in_progress: tasks.filter(t => !t.completedAt && t.status?.name?.toLowerCase().includes('progress')),
    blocked: tasks.filter(t => !t.completedAt && t.blockedReason),
    waiting: tasks.filter(t => !t.completedAt && t.waitingOn === 'ben'),
    todo: tasks.filter(t => !t.completedAt && !t.blockedReason && t.waitingOn !== 'ben' && !t.status?.name?.toLowerCase().includes('progress')),
    done: tasks.filter(t => t.completedAt).slice(0, 10),
  }

  const pendingHandoffs = handoffs.filter(h => h.toAgent === agent.id && h.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Pending handoffs */}
      {pendingHandoffs.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3">Pending Handoffs</p>
          <div className="space-y-2">
            {pendingHandoffs.map((h: any) => (
              <div key={h.id} className="bg-white border border-[#E5E5E5] rounded p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded uppercase tracking-wide">From {h.fromAgent}</span>
                  <span className="text-[12px] font-medium text-[#1A1A1A]">{h.summary}</span>
                </div>
                {h.requestedOutcome && <p className="text-[12px] text-[#737373]">{h.requestedOutcome}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task groups */}
      {[
        { key: 'in_progress', label: 'In Progress', tasks: grouped.in_progress },
        { key: 'blocked',     label: 'Blocked',     tasks: grouped.blocked },
        { key: 'waiting',     label: 'Waiting on Ben', tasks: grouped.waiting },
        { key: 'todo',        label: 'Ready',       tasks: grouped.todo },
        { key: 'done',        label: 'Done',        tasks: grouped.done },
      ].filter(g => g.tasks.length > 0).map(group => (
        <div key={group.key}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3">
            {group.label} <span className="text-[#C6C6C6]">({group.tasks.length})</span>
          </p>
          <div className="space-y-2">
            {group.tasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks?highlight=${task.id}`)}
                className="bg-white border border-[#E5E5E5] rounded p-4 cursor-pointer hover:border-[#C6C6C6] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{task.title}</p>
                    {task.blockedReason && (
                      <p className="text-[12px] text-red-600 mt-0.5">⚠ {task.blockedReason}</p>
                    )}
                    {task.project && (
                      <p className="text-[11px] text-[#A3A3A3] mt-0.5">{task.project.name}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-medium ${
                    task.priority <= 1 ? 'bg-red-50 text-red-700' :
                    task.priority === 2 ? 'bg-orange-50 text-orange-700' :
                    'bg-[#F3F3F3] text-[#737373]'
                  }`}>
                    P{task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {tasks.length === 0 && handoffs.length === 0 && (
        <p className="text-[#A3A3A3] text-[14px] py-12 text-center">No tasks assigned to this agent.</p>
      )}
    </div>
  )
}

// ─── Knowledge Tab ───────────────────────────────────────────────────────────
function KnowledgeTab({ agent, onRefresh }: { agent: any; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', linkType: 'skill', url: '', notes: '', required: false })

  const links: any[] = agent.knowledgeLinks || []
  const required = links.filter(l => l.required)
  const optional = links.filter(l => !l.required)

  const grouped: Record<string, any[]> = {
    briefing: required.filter(l => l.linkType === 'briefing'),
    document: required.filter(l => l.linkType === 'document'),
    skill:    required.filter(l => l.linkType === 'skill'),
    optional: optional,
  }

  async function handleAdd() {
    if (!form.title) return
    setSaving(true)
    try {
      await fetch(`/api/agents/${agent.id}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId: agent.workspaceId }),
      })
      setShowAdd(false)
      setForm({ title: '', linkType: 'skill', url: '', notes: '', required: false })
      onRefresh()
    } finally { setSaving(false) }
  }

  async function handleDelete(linkId: string) {
    await fetch(`/api/agents/${agent.id}/knowledge?linkId=${linkId}`, { method: 'DELETE' })
    onRefresh()
  }

  function LinkList({ items, emptyMsg }: { items: any[]; emptyMsg: string }) {
    if (items.length === 0) return <p className="text-[12px] text-[#C6C6C6] py-2">{emptyMsg}</p>
    return (
      <div className="space-y-2">
        {items.map((link: any) => (
          <div key={link.id} className="bg-white border border-[#E5E5E5] rounded p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-medium ${LINK_TYPE_BADGE[link.linkType] || LINK_TYPE_BADGE.url}`}>
                  {link.linkType}
                </span>
                {link.required && (
                  <span className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Required</span>
                )}
              </div>
              <p className="text-[13px] font-medium text-[#1A1A1A]">
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{link.title}</a>
                ) : link.title}
              </p>
              {link.notes && <p className="text-[12px] text-[#737373] mt-0.5">{link.notes}</p>}
            </div>
            <button
              onClick={() => handleDelete(link.id)}
              className="flex-shrink-0 text-[#C6C6C6] hover:text-red-500 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-[12px] font-medium text-[#1A1A1A] border border-[#E5E5E5] px-3 py-1.5 rounded hover:bg-[#F3F3F3] transition flex items-center gap-1.5"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Link
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded p-4 space-y-3">
          <select value={form.linkType} onChange={e => setForm(f => ({ ...f, linkType: e.target.value }))}
            className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]">
            <option value="briefing">Briefing</option>
            <option value="document">Document</option>
            <option value="skill">Skill</option>
            <option value="url">URL</option>
            <option value="file">File</option>
          </select>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title"
            className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]"
          />
          <input
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="URL (optional)"
            className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]"
          />
          <input
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)"
            className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]"
          />
          <label className="flex items-center gap-2 text-[13px] text-[#474747] cursor-pointer">
            <input type="checkbox" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))} />
            Required reading
          </label>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !form.title}
              className="px-4 py-2 bg-[#1A1A1A] text-white text-[13px] rounded hover:bg-black transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[#737373] text-[13px] hover:text-[#1A1A1A] transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Briefings</p>
        <LinkList items={grouped.briefing} emptyMsg="No briefings linked." />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Required Documents</p>
        <LinkList items={grouped.document} emptyMsg="No required documents linked." />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Required Skills</p>
        <LinkList items={grouped.skill} emptyMsg="No skills linked." />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Optional References</p>
        <LinkList items={grouped.optional} emptyMsg="No optional references." />
      </div>
    </div>
  )
}

// ─── Memory Tab ──────────────────────────────────────────────────────────────
function MemoryTab({ agent }: { agent: any }) {
  const memories: any[] = agent.memories || []
  if (memories.length === 0) {
    return <p className="text-[#A3A3A3] text-[14px] py-12 text-center">No memory entries yet.</p>
  }
  return (
    <div className="space-y-3">
      {memories.map((m: any) => (
        <div key={m.id} className="bg-white border border-[#E5E5E5] rounded p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-medium text-[#1A1A1A]">{m.title || m.content?.slice(0, 80)}</p>
            <span className="flex-shrink-0 text-[10px] text-[#A3A3A3] bg-[#F3F3F3] px-1.5 py-0.5 rounded capitalize">{m.entryType || m.memoryType || 'note'}</span>
          </div>
          {m.description && <p className="text-[12px] text-[#737373] leading-relaxed">{m.description}</p>}
          {m.content && !m.title && <p className="text-[12px] text-[#737373] leading-relaxed">{m.content}</p>}
          <p className="text-[10px] text-[#C6C6C6] mt-2">{timeAgo(m.updatedAt)}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Insights Tab ────────────────────────────────────────────────────────────
function InsightsTab({ agent }: { agent: any }) {
  const insights: any[] = agent.insights || []
  if (insights.length === 0) {
    return <p className="text-[#A3A3A3] text-[14px] py-12 text-center">No insights published yet.</p>
  }
  return (
    <div className="space-y-3">
      {insights.map((ins: any) => (
        <div key={ins.id} className="bg-white border border-[#E5E5E5] rounded p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-medium text-[#1A1A1A]">{ins.title}</p>
            <span className="flex-shrink-0 text-[10px] text-[#A3A3A3] bg-[#F3F3F3] px-1.5 py-0.5 rounded capitalize">{ins.insightType || 'insight'}</span>
          </div>
          <p className="text-[12px] text-[#737373] leading-relaxed line-clamp-3">{ins.content}</p>
          <p className="text-[10px] text-[#C6C6C6] mt-2">{timeAgo(ins.createdAt)}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({ agent, onClose, onSaved }: { agent: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: agent.name || '',
    role: agent.role || '',
    perspective: agent.perspective || '',
    tagline: agent.tagline || '',
    avatar: agent.avatar || '',
    identity: agent.identity || '',
    toneOfVoice: agent.toneOfVoice || '',
    workingStyle: agent.workingStyle || '',
    coreResponsibilities: agent.coreResponsibilities || '',
    escalationRules: agent.escalationRules || '',
    decisionScope: agent.decisionScope || '',
    approvalBoundaries: agent.approvalBoundaries || '',
    status: agent.status || 'active',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId: agent.workspaceId }),
      })
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  const fields: { key: keyof typeof form; label: string; multiline?: boolean }[] = [
    { key: 'name',                label: 'Name' },
    { key: 'role',                label: 'Role' },
    { key: 'perspective',         label: 'Perspective' },
    { key: 'tagline',             label: 'Tagline' },
    { key: 'avatar',              label: 'Avatar (emoji or URL)' },
    { key: 'identity',            label: 'Identity',             multiline: true },
    { key: 'toneOfVoice',         label: 'Tone of Voice',        multiline: true },
    { key: 'workingStyle',        label: 'Working Style',        multiline: true },
    { key: 'coreResponsibilities',label: 'Core Responsibilities', multiline: true },
    { key: 'decisionScope',       label: 'Decision Scope',       multiline: true },
    { key: 'approvalBoundaries',  label: 'Approval Boundaries',  multiline: true },
    { key: 'escalationRules',     label: 'Escalation Rules',     multiline: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-white w-full max-w-[640px] rounded flex flex-col" style={{ maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
        <div className="px-8 pt-7 pb-5 border-b border-[#F3F3F3] flex-shrink-0 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1">Agent Profile</p>
            <h2 className="text-[22px] font-bold text-[#1A1C1C]">Edit {agent.name}</h2>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#1A1C1C] transition mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1">{f.label}</label>
              {f.multiline ? (
                <textarea
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  rows={4}
                  className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A] resize-vertical"
                />
              ) : (
                <input
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]"
                />
              )}
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
        <div className="flex-shrink-0 border-t border-[#E5E5E5] px-8 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-[14px] font-medium text-[#474747] hover:text-[#1A1C1C] transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white text-[14px] font-semibold rounded transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string
  const { workspaceId } = useWorkspace()

  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    const wsId = workspaceId || 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    try {
      const res = await fetch(`/api/agents/${agentId}?workspaceId=${wsId}`)
      const data = await res.json()
      if (data.success) setAgent(data.agent)
      else router.push('/agents')
    } finally { setLoading(false) }
  }, [agentId, workspaceId, router])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center"><LoadingSpinner /></div>
  )
  if (!agent) return null

  const msSince = agent.lastSeenAt ? Date.now() - new Date(agent.lastSeenAt).getTime() : null
  const presence = msSince === null ? 'offline' : msSince < 600000 ? 'active' : msSince < 3600000 ? 'idle' : 'offline'

  return (
    <div className="min-h-screen bg-[#F9F9F9]">

        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[#F3F3F3] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
          <div className="max-w-[1200px] mx-auto flex items-center gap-3">
            <button onClick={() => router.push('/agents')} className="text-[#A3A3A3] hover:text-[#1A1A1A] transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[13px] text-[#737373]">Agents</span>
            <span className="text-[#C6C6C6]">/</span>
            <span className="text-[13px] font-medium text-[#1A1A1A]">{agent.name}</span>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-16">

          {/* Agent header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-[#F3F3F3] rounded flex items-center justify-center text-3xl flex-shrink-0">
              {agent.avatar || AGENT_AVATARS[agent.id] || '🤖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[24px] font-bold text-[#1A1A1A]">{agent.name}</h1>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${PRESENCE_DOT[presence]}`} />
                  <span className="text-[12px] text-[#737373] capitalize">{presence}</span>
                </div>
              </div>
              <p className="text-[14px] text-[#737373]">{agent.role}{agent.perspective ? ` · ${agent.perspective}` : ''}</p>
              {agent.tagline && <p className="text-[13px] text-[#A3A3A3] italic mt-1">"{agent.tagline}"</p>}
            </div>
            <div className="flex-shrink-0 hidden md:flex items-center gap-2">
              {[
                { label: 'Open', n: agent.stats?.openTasks || 0 },
                { label: 'Blocked', n: agent.stats?.blockedTasks || 0 },
                { label: 'Knowledge', n: agent.knowledgeLinks?.length || 0 },
              ].map(s => (
                <div key={s.label} className="text-center bg-white border border-[#E5E5E5] rounded-md px-3 py-1.5">
                  <div className="text-[15px] font-bold text-[#1A1A1A]">{s.n}</div>
                  <div className="text-[10px] text-[#A3A3A3]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto mb-6 bg-white rounded border border-[#E5E5E5] p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition flex-shrink-0 ${
                  activeTab === tab.id ? 'bg-[#1A1A1A] text-white' : 'text-[#474747] hover:bg-[#F3F3F3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview'  && <OverviewTab agent={agent} onEdit={() => setEditing(true)} />}
          {activeTab === 'work'      && <WorkTab agent={agent} />}
          {activeTab === 'knowledge' && <KnowledgeTab agent={agent} onRefresh={load} />}
          {activeTab === 'memory'    && <MemoryTab agent={agent} />}
          {activeTab === 'insights'  && <InsightsTab agent={agent} />}
        </div>

      {editing && <EditModal agent={agent} onClose={() => setEditing(false)} onSaved={load} />}
    </div>
  )
}
