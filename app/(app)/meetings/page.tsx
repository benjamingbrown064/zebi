'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/lib/use-workspace'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceRef {
  type: 'document' | 'task' | 'objective' | 'memory' | 'insight' | 'url'
  id?: string
  url?: string
  label?: string
}

interface Contribution {
  id: string
  author: string
  role: string
  position: string
  reasoning: string
  recommendation: string
  confidence: number
  flags: string[]
  skillsUsed: string[]
  evidenceRefs: EvidenceRef[]
  createdAt: string
}

interface Meeting {
  id: string
  title: string
  agenda: string
  status: string
  requiredParticipants: string[]
  optionalParticipants: string[]
  requiredSkills: string[]
  pendingContributors: string[]
  conclusion: {
    decision: string
    rationale: string
    resultingActions: { title: string; assignTo: string; dueDate?: string }[]
    owners: string[]
    reviewDate?: string
  } | null
  concludedBy?: string
  concludedAt?: string
  createdBy: string
  createdAt: string
  contributions: Contribution[]
  contributionCount?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  harvey: { bg: 'bg-violet-50',   text: 'text-violet-700',  border: 'border-violet-200', dot: 'bg-violet-500' },
  theo:   { bg: 'bg-sky-50',      text: 'text-sky-700',     border: 'border-sky-200',    dot: 'bg-sky-500' },
  doug:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  casper: { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200', dot: 'bg-orange-500' },
  ben:    { bg: 'bg-[#F3F3F3]',   text: 'text-[#1A1C1C]',  border: 'border-[#C6C6C6]',  dot: 'bg-[#1A1C1C]' },
  system: { bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400' },
}

const ROLE_LABELS: Record<string, string> = {
  'strategic-commercial': 'Strategic & Commercial',
  'research-planning':    'Research & Planning',
  'technical-systems':    'Technical & Systems',
  'ops-execution':        'Ops & Execution',
  'founder':              'Founder',
}

const FLAG_STYLE: Record<string, string> = {
  blocker:     'bg-red-50 text-red-700 border-red-200',
  risk:        'bg-orange-50 text-orange-700 border-orange-200',
  opportunity: 'bg-green-50 text-green-700 border-green-200',
  dependency:  'bg-blue-50 text-blue-700 border-blue-200',
}

const STATUS_STYLE: Record<string, string> = {
  draft:        'bg-[#F3F3F3] text-[#474747] border-[#C6C6C6]',
  open:         'bg-blue-50 text-blue-700 border-blue-200',
  contributing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  concluded:    'bg-green-50 text-green-700 border-green-200',
  archived:     'bg-gray-50 text-gray-500 border-gray-200',
}

const ALL_AGENTS = ['harvey', 'theo', 'doug', 'casper', 'ben']

function agentStyle(agent: string) {
  return AGENT_STYLE[agent] ?? AGENT_STYLE.system
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`h-1.5 w-4 rounded-full ${i <= value ? 'bg-[#1A1C1C]' : 'bg-[#E5E5E5]'}`} />
      ))}
      <span className="text-[11px] text-[#474747] ml-1">{value}/5</span>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateMeetingModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({
    title: '',
    agenda: '',
    requiredParticipants: [] as string[],
    optionalParticipants: [] as string[],
    openNow: false,
  })
  const [saving, setSaving] = useState(false)

  const toggleParticipant = (agent: string, type: 'required' | 'optional') => {
    const key = type === 'required' ? 'requiredParticipants' : 'optionalParticipants'
    const otherKey = type === 'required' ? 'optionalParticipants' : 'requiredParticipants'
    setForm(f => ({
      ...f,
      [key]: f[key as 'requiredParticipants'].includes(agent)
        ? f[key as 'requiredParticipants'].filter(a => a !== agent)
        : [...f[key as 'requiredParticipants'], agent],
      // Remove from other list if present
      [otherKey]: f[otherKey as 'optionalParticipants'].filter(a => a !== agent),
    }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.agenda.trim() || form.requiredParticipants.length === 0) return
    setSaving(true)
    try {
      await onCreate({
        title:                form.title,
        agenda:               form.agenda,
        requiredParticipants: form.requiredParticipants,
        optionalParticipants: form.optionalParticipants,
        status:               form.openNow ? 'open' : 'draft',
        createdBy:            'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
        createdByType:        'user',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C6C6C6]">
          <h2 className="text-[15px] font-semibold text-[#1A1C1C]">New Meeting</h2>
          <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Should we build Taskbox before Dealer Next?"
              className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Agenda *</label>
            <textarea
              value={form.agenda}
              onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
              rows={5}
              placeholder="Full question and context. Include relevant background, constraints, and what you need each agent to focus on."
              className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] resize-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-3">Participants *</label>
            <div className="space-y-2">
              {ALL_AGENTS.map(agent => {
                const style = agentStyle(agent)
                const isRequired = form.requiredParticipants.includes(agent)
                const isOptional = form.optionalParticipants.includes(agent)
                return (
                  <div key={agent} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                      <span className="text-[13px] text-[#1A1C1C] capitalize">{agent}</span>
                      <span className="text-[11px] text-[#474747]">— {ROLE_LABELS[Object.keys(ROLE_LABELS).find(r => r.startsWith(agent === 'harvey' ? 'strategic' : agent === 'theo' ? 'research' : agent === 'doug' ? 'technical' : agent === 'casper' ? 'ops' : 'founder')) ?? ''] ?? ''}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleParticipant(agent, 'required')}
                        className={`text-[11px] px-2 py-1 rounded-[4px] border transition-colors ${isRequired ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'}`}
                      >
                        Required
                      </button>
                      <button
                        onClick={() => toggleParticipant(agent, 'optional')}
                        className={`text-[11px] px-2 py-1 rounded-[4px] border transition-colors ${isOptional ? 'bg-[#474747] text-white border-[#474747]' : 'border-[#C6C6C6] text-[#474747] hover:border-[#474747]'}`}
                      >
                        Optional
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="openNow"
              checked={form.openNow}
              onChange={e => setForm(f => ({ ...f, openNow: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="openNow" className="text-[13px] text-[#474747]">
              Open immediately and notify agents
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#C6C6C6]">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#474747] border border-[#C6C6C6] rounded-[4px] hover:bg-[#F3F3F3]">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || !form.agenda.trim() || form.requiredParticipants.length === 0}
            className="px-4 py-2 text-[13px] font-medium bg-[#1A1C1C] text-white rounded-[4px] hover:bg-[#333] disabled:opacity-40"
          >
            {saving ? 'Creating…' : form.openNow ? 'Open Meeting' : 'Save as Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Conclude modal ───────────────────────────────────────────────────────────

function ConcludeModal({ meeting, onClose, onSave }: { meeting: Meeting; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({
    decision: '',
    rationale: '',
    resultingActions: [{ title: '', assignTo: 'harvey', dueDate: '' }] as { title: string; assignTo: string; dueDate: string }[],
    owners: [] as string[],
    reviewDate: '',
  })
  const [saving, setSaving] = useState(false)

  const addAction = () => setForm(f => ({ ...f, resultingActions: [...f.resultingActions, { title: '', assignTo: 'harvey', dueDate: '' }] }))
  const removeAction = (i: number) => setForm(f => ({ ...f, resultingActions: f.resultingActions.filter((_, idx) => idx !== i) }))
  const updateAction = (i: number, field: string, value: string) => {
    setForm(f => ({ ...f, resultingActions: f.resultingActions.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }))
  }

  const handleSubmit = async () => {
    if (!form.decision.trim() || !form.rationale.trim()) return
    setSaving(true)
    try {
      await onSave({
        conclusion: {
          decision:         form.decision,
          rationale:        form.rationale,
          resultingActions: form.resultingActions.filter(a => a.title.trim()),
          owners:           form.owners,
          reviewDate:       form.reviewDate || null,
        },
        concludedBy:     'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
        concludedByType: 'user',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C6C6C6]">
          <h2 className="text-[15px] font-semibold text-[#1A1C1C]">Write Conclusion</h2>
          <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Decision *</label>
            <input value={form.decision} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))} placeholder="The final decision in one sentence" className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Rationale *</label>
            <textarea value={form.rationale} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} rows={4} placeholder="Why this decision was made" className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] resize-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[#474747]">Resulting Actions</label>
              <button onClick={addAction} className="text-[11px] text-[#474747] hover:text-[#1A1C1C]">+ Add</button>
            </div>
            <div className="space-y-2">
              {form.resultingActions.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <input value={a.title} onChange={e => updateAction(i, 'title', e.target.value)} placeholder="Action title" className="flex-1 border border-[#C6C6C6] rounded-[4px] px-2 py-1.5 text-[12px] focus:outline-none focus:border-[#1A1C1C]" />
                  <select value={a.assignTo} onChange={e => updateAction(i, 'assignTo', e.target.value)} className="border border-[#C6C6C6] rounded-[4px] px-2 py-1.5 text-[12px] bg-white focus:outline-none">
                    {ALL_AGENTS.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                  </select>
                  <input type="date" value={a.dueDate} onChange={e => updateAction(i, 'dueDate', e.target.value)} className="border border-[#C6C6C6] rounded-[4px] px-2 py-1.5 text-[12px] focus:outline-none" />
                  <button onClick={() => removeAction(i)} className="text-[#474747] hover:text-red-600 px-1">✕</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#474747] mb-1">Review Date (optional)</label>
            <input type="date" value={form.reviewDate} onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))} className="border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#C6C6C6]">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#474747] border border-[#C6C6C6] rounded-[4px] hover:bg-[#F3F3F3]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.decision.trim() || !form.rationale.trim()} className="px-4 py-2 text-[13px] font-medium bg-[#1A1C1C] text-white rounded-[4px] hover:bg-[#333] disabled:opacity-40">
            {saving ? 'Saving…' : 'Conclude Meeting'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Meeting detail ───────────────────────────────────────────────────────────

function MeetingDetail({ meeting, onClose, onRefresh }: { meeting: Meeting; onClose: () => void; onRefresh: () => void }) {
  const [showConclude, setShowConclude] = useState(false)
  const [opening, setOpening] = useState(false)

  const handleOpen = async () => {
    setOpening(true)
    try {
      await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      })
      onRefresh()
    } finally {
      setOpening(false)
    }
  }

  const handleConclude = async (data: any) => {
    await fetch(`/api/meetings/${meeting.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setShowConclude(false)
    onRefresh()
  }

  const pending = meeting.pendingContributors ?? []
  const allIn   = pending.length === 0 && meeting.requiredParticipants.length > 0

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#C6C6C6]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] border capitalize ${STATUS_STYLE[meeting.status] ?? ''}`}>
                    {meeting.status}
                  </span>
                  {pending.length > 0 && (
                    <span className="text-[11px] text-[#474747]">Waiting on: {pending.join(', ')}</span>
                  )}
                  {allIn && meeting.status !== 'concluded' && (
                    <span className="text-[11px] text-green-700 font-medium">✅ All contributions in</span>
                  )}
                </div>
                <h2 className="text-[16px] font-semibold text-[#1A1C1C] leading-tight">{meeting.title}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {meeting.status === 'draft' && (
                  <button onClick={handleOpen} disabled={opening} className="text-[12px] bg-[#1A1C1C] text-white px-3 py-1.5 rounded-[4px] hover:bg-[#333] disabled:opacity-40">
                    {opening ? 'Opening…' : 'Open Meeting'}
                  </button>
                )}
                {['open','contributing'].includes(meeting.status) && (
                  <button onClick={() => setShowConclude(true)} className="text-[12px] border border-[#C6C6C6] text-[#474747] px-3 py-1.5 rounded-[4px] hover:bg-[#F3F3F3]">
                    Conclude
                  </button>
                )}
                <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C] text-lg">✕</button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Agenda */}
            <div className="px-6 py-4 bg-[#F9F9F9] border-b border-[#C6C6C6]">
              <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-2">Agenda</p>
              <p className="text-[13px] text-[#1A1C1C] whitespace-pre-wrap">{meeting.agenda}</p>
            </div>

            {/* Contributions */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide">
                Contributions ({meeting.contributions?.length ?? 0} / {meeting.requiredParticipants.length} required)
              </p>

              {/* Awaiting placeholders */}
              {pending.map(agent => (
                <div key={agent} className="border border-dashed border-[#C6C6C6] rounded-[4px] p-4 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${agentStyle(agent).dot} opacity-40`} />
                  <p className="text-[13px] text-[#474747] italic">Waiting for {agent}…</p>
                </div>
              ))}

              {/* Contributions */}
              {(meeting.contributions ?? []).map(c => {
                const style = agentStyle(c.author)
                return (
                  <div key={c.id} className={`border rounded-[4px] p-4 ${style.border} ${style.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <span className={`text-[13px] font-semibold ${style.text} capitalize`}>{c.author}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-[4px] border ${style.border} ${style.text} opacity-80`}>
                          {ROLE_LABELS[c.role] ?? c.role}
                        </span>
                      </div>
                      <ConfidenceBar value={c.confidence} />
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-0.5">Position</p>
                        <p className="text-[13px] text-[#1A1C1C] font-medium">{c.position}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-0.5">Reasoning</p>
                        <p className="text-[13px] text-[#474747] whitespace-pre-wrap">{c.reasoning}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#474747] uppercase tracking-wide mb-0.5">Recommendation</p>
                        <p className="text-[13px] text-[#1A1C1C]">{c.recommendation}</p>
                      </div>
                    </div>

                    {c.flags.length > 0 && (
                      <div className="flex gap-1.5 mt-3">
                        {c.flags.map(flag => (
                          <span key={flag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border capitalize ${FLAG_STYLE[flag] ?? ''}`}>{flag}</span>
                        ))}
                      </div>
                    )}

                    {(c.skillsUsed.length > 0 || (c.evidenceRefs as any[]).length > 0) && (
                      <div className="mt-3 pt-3 border-t border-white/60 space-y-1.5">
                        {c.skillsUsed.length > 0 && (
                          <p className="text-[11px] text-[#474747]">
                            📖 Skills used: {c.skillsUsed.join(', ')}
                          </p>
                        )}
                        {(c.evidenceRefs as EvidenceRef[]).length > 0 && (
                          <p className="text-[11px] text-[#474747]">
                            🔗 {(c.evidenceRefs as EvidenceRef[]).length} evidence ref{(c.evidenceRefs as EvidenceRef[]).length !== 1 ? 's' : ''}
                            {': '}
                            {(c.evidenceRefs as EvidenceRef[]).map(r => r.label ?? r.type).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Conclusion */}
            {meeting.conclusion && (
              <div className="px-6 py-4 border-t border-[#C6C6C6] bg-green-50">
                <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-3">✅ Conclusion</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-medium text-[#474747] mb-0.5">Decision</p>
                    <p className="text-[14px] font-semibold text-[#1A1C1C]">{meeting.conclusion.decision}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-[#474747] mb-0.5">Rationale</p>
                    <p className="text-[13px] text-[#474747]">{meeting.conclusion.rationale}</p>
                  </div>
                  {meeting.conclusion.resultingActions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-[#474747] mb-1">Resulting Actions</p>
                      <div className="space-y-1">
                        {meeting.conclusion.resultingActions.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-[13px]">
                            <span className="text-green-600">→</span>
                            <span className="text-[#1A1C1C]">{a.title}</span>
                            <span className="text-[#474747]">assigned to {a.assignTo}</span>
                            {a.dueDate && <span className="text-[#474747] text-[11px]">by {a.dueDate}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {meeting.conclusion.reviewDate && (
                    <p className="text-[12px] text-[#474747]">Review: {meeting.conclusion.reviewDate}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConclude && (
        <ConcludeModal meeting={meeting} onClose={() => setShowConclude(false)} onSave={handleConclude} />
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadMeetings = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ workspaceId })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`/api/meetings?${params}`)
      const data = await res.json()
      setMeetings(data.meetings ?? [])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, filterStatus])

  useEffect(() => {
    if (!workspaceLoading && workspaceId) loadMeetings()
  }, [workspaceId, workspaceLoading, loadMeetings])

  const openDetail = async (meeting: Meeting) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`)
      const data = await res.json()
      setSelectedMeeting(data.meeting ?? meeting)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreate = async (form: any) => {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, workspaceId }),
    })
    if (res.ok) {
      setShowCreate(false)
      loadMeetings()
    }
  }

  const STATUSES = ['all', 'draft', 'open', 'contributing', 'concluded', 'archived']

  const grouped = {
    active:    meetings.filter(m => ['open', 'contributing'].includes(m.status)),
    draft:     meetings.filter(m => m.status === 'draft'),
    concluded: meetings.filter(m => m.status === 'concluded'),
    archived:  meetings.filter(m => m.status === 'archived'),
  }

  return (
    <div className="flex h-screen bg-[#F9F9F9]">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#C6C6C6] px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-[#1A1C1C]">Meetings</h1>
              <p className="text-[13px] text-[#474747] mt-0.5">Structured group decisions — each agent contributes from their area of expertise</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#1A1C1C] text-white text-[13px] font-medium px-4 py-2 rounded-[4px] hover:bg-[#333]"
            >
              <span className="text-base leading-none">+</span> New Meeting
            </button>
          </div>
          <div className="flex gap-4 mt-4">
            {[
              { label: 'Active', count: grouped.active.length },
              { label: 'Draft', count: grouped.draft.length },
              { label: 'Concluded', count: grouped.concluded.length },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[20px] font-semibold text-[#1A1C1C]">{s.count}</p>
                <p className="text-[11px] text-[#474747]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border-b border-[#C6C6C6] px-8 py-3 flex gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-[12px] px-3 py-1.5 rounded-[4px] border capitalize transition-colors ${
                filterStatus === s ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#C6C6C6] border-t-[#1A1C1C] rounded-full animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[32px] mb-3">🗣️</p>
              <p className="text-[15px] font-medium text-[#1A1C1C] mb-1">No meetings yet</p>
              <p className="text-[13px] text-[#474747] mb-4">Bring your agents together to make better decisions</p>
              <button onClick={() => setShowCreate(true)} className="bg-[#1A1C1C] text-white text-[13px] px-4 py-2 rounded-[4px] hover:bg-[#333]">
                New Meeting
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.active.length > 0 && (
                <section>
                  <p className="text-[12px] font-semibold text-[#1A1C1C] uppercase tracking-wide mb-3">Active</p>
                  <MeetingGrid meetings={grouped.active} onOpen={openDetail} />
                </section>
              )}
              {grouped.draft.length > 0 && (
                <section>
                  <p className="text-[12px] font-semibold text-[#474747] uppercase tracking-wide mb-3">Draft</p>
                  <MeetingGrid meetings={grouped.draft} onOpen={openDetail} />
                </section>
              )}
              {grouped.concluded.length > 0 && (
                <section>
                  <p className="text-[12px] font-semibold text-[#474747] uppercase tracking-wide mb-3">Concluded</p>
                  <MeetingGrid meetings={grouped.concluded} onOpen={openDetail} />
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-white border-t-[#1A1C1C] rounded-full animate-spin" />
        </div>
      )}

      {showCreate && <CreateMeetingModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {selectedMeeting && (
        <MeetingDetail
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onRefresh={() => { loadMeetings(); openDetail(selectedMeeting) }}
        />
      )}
    </div>
  )
}

function MeetingGrid({ meetings, onOpen }: { meetings: Meeting[]; onOpen: (m: Meeting) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {meetings.map(m => {
        const pending = m.pendingContributors ?? []
        const contributed = (m.contributionCount ?? m.contributions?.length ?? 0)
        const total = m.requiredParticipants.length
        return (
          <div
            key={m.id}
            onClick={() => onOpen(m)}
            className="bg-white border border-[#C6C6C6] rounded-[4px] p-4 cursor-pointer hover:border-[#1A1C1C] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[14px] font-medium text-[#1A1C1C] leading-snug flex-1">{m.title}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border capitalize shrink-0 ${STATUS_STYLE[m.status] ?? ''}`}>{m.status}</span>
            </div>
            <p className="text-[12px] text-[#474747] line-clamp-2 mb-3">{m.agenda}</p>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-1">
                {m.requiredParticipants.map(agent => (
                  <div key={agent} className={`w-5 h-5 rounded-full border-2 border-white ${agentStyle(agent).dot} flex items-center justify-center`} title={agent} />
                ))}
              </div>
              <span className="text-[11px] text-[#474747]">
                {contributed}/{total} contributed
                {pending.length > 0 && ` · waiting on ${pending.join(', ')}`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
