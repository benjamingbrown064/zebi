'use client'

import { useState } from 'react'
import { FaBolt, FaChevronDown, FaChevronRight, FaCheck, FaTimes } from 'react-icons/fa'

const AGENTS = ['harvey', 'theo', 'doug', 'casper']

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
}

interface Props {
  taskId: string
  workspaceId: string
  ownerAgent?: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  done:     'bg-[#F3F3F3] text-[#737373]',
  rejected: 'bg-red-100 text-red-700',
}

export default function TaskHandoffPanel({ taskId, workspaceId, ownerAgent }: Props) {
  const [open, setOpen] = useState(false)
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [fromAgent, setFromAgent] = useState(ownerAgent ?? '')
  const [toAgent, setToAgent] = useState('')
  const [summary, setSummary] = useState('')
  const [requestedOutcome, setRequestedOutcome] = useState('')
  const [completedWork, setCompletedWork] = useState('')
  const [remainingWork, setRemainingWork] = useState('')
  const [blockers, setBlockers] = useState('none')
  const [decisionNeeded, setDecisionNeeded] = useState(false)
  const [decisionSummary, setDecisionSummary] = useState('')

  const loadHandoffs = async () => {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/handoffs?taskId=${taskId}&workspaceId=${workspaceId}`)
      const data = await res.json()
      setHandoffs(data.handoffs ?? [])
      setLoaded(true)
    } catch {
      setError('Failed to load handoffs')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && !loaded) loadHandoffs()
  }

  const resetForm = () => {
    setSummary('')
    setRequestedOutcome('')
    setCompletedWork('')
    setRemainingWork('')
    setBlockers('none')
    setDecisionNeeded(false)
    setDecisionSummary('')
    setCreating(false)
    setError(null)
  }

  const handleCreate = async () => {
    if (!fromAgent || !toAgent || !summary || !requestedOutcome || !completedWork || !remainingWork) {
      setError('Please fill in all required fields')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/handoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          taskId,
          fromAgent,
          toAgent,
          summary,
          requestedOutcome,
          completedWork,
          remainingWork,
          blockers,
          decisionNeeded,
          decisionSummary: decisionNeeded ? decisionSummary : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create handoff')
      setHandoffs(prev => [data.handoff, ...prev])
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create handoff')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/handoffs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHandoffs(prev => prev.map(h => h.id === id ? data.handoff : h))
    } catch (e) {
      console.error('Failed to update handoff:', e)
    }
  }

  const pendingCount = handoffs.filter(h => h.status === 'pending').length

  return (
    <div className="border border-[#E5E5E5] rounded overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F9F9F9] hover:bg-[#F3F3F3] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FaBolt size={12} className="text-[#737373]" />
          <span className="text-[13px] font-semibold text-[#525252]">Handoffs</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 text-violet-700">{pendingCount}</span>
          )}
        </div>
        {open ? <FaChevronDown size={11} className="text-[#A3A3A3]" /> : <FaChevronRight size={11} className="text-[#A3A3A3]" />}
      </button>

      {open && (
        <div className="bg-white">

          {/* Existing handoffs */}
          {loading && <p className="px-4 py-3 text-[12px] text-[#A3A3A3]">Loading…</p>}

          {!loading && handoffs.length > 0 && (
            <div className="divide-y divide-[#F3F3F3]">
              {handoffs.map(h => (
                <div key={h.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[13px] font-medium text-[#1A1A1A]">{h.summary}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[h.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {h.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A3A3A3] mb-2 capitalize">
                    {h.fromAgent} → {h.toAgent} · {new Date(h.createdAt).toLocaleDateString()}
                  </p>
                  <div className="space-y-1 text-[12px]">
                    <p><span className="text-[#737373]">Done:</span> {h.completedWork}</p>
                    <p><span className="text-[#737373]">Remaining:</span> {h.remainingWork}</p>
                    {h.blockers !== 'none' && <p><span className="text-orange-600">Blockers:</span> {h.blockers}</p>}
                    {h.decisionNeeded && h.decisionSummary && (
                      <p><span className="text-[#1A1C1C] font-medium">Decision needed:</span> {h.decisionSummary}</p>
                    )}
                  </div>
                  {h.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleStatusUpdate(h.id, 'accepted')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors"
                      >
                        <FaCheck size={9} /> Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(h.id, 'rejected')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors"
                      >
                        <FaTimes size={9} /> Reject
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(h.id, 'done')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F3F3F3] text-[#525252] text-[11px] font-medium hover:bg-[#E5E5E5] transition-colors"
                      >
                        Mark done
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && handoffs.length === 0 && !creating && (
            <p className="px-4 py-3 text-[12px] text-[#A3A3A3]">No handoffs yet for this task.</p>
          )}

          {/* Create handoff form */}
          {creating ? (
            <div className="px-4 py-4 space-y-3 border-t border-[#F3F3F3]">
              <p className="text-[12px] font-semibold text-[#525252]">New Handoff</p>

              {error && <p className="text-[12px] text-red-600">{error}</p>}

              {/* from → to */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">From *</label>
                  <select value={fromAgent} onChange={e => setFromAgent(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44]">
                    <option value="">—</option>
                    {['ben', ...AGENTS].map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">To *</label>
                  <select value={toAgent} onChange={e => setToAgent(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44]">
                    <option value="">—</option>
                    {['ben', ...AGENTS].map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
                  </select>
                </div>
              </div>

              {/* summary */}
              <div>
                <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">Summary *</label>
                <input type="text" value={summary} onChange={e => setSummary(e.target.value)}
                  placeholder="One-line description of this handoff"
                  className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44] placeholder-[#C4C4C4]" />
              </div>

              {/* requestedOutcome */}
              <div>
                <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">Requested outcome *</label>
                <textarea value={requestedOutcome} onChange={e => setRequestedOutcome(e.target.value)} rows={2}
                  placeholder="What should the receiving agent produce?"
                  className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44] resize-none placeholder-[#C4C4C4]" />
              </div>

              {/* completedWork + remainingWork */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">Completed *</label>
                  <textarea value={completedWork} onChange={e => setCompletedWork(e.target.value)} rows={3}
                    placeholder="What was done"
                    className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44] resize-none placeholder-[#C4C4C4]" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">Remaining *</label>
                  <textarea value={remainingWork} onChange={e => setRemainingWork(e.target.value)} rows={3}
                    placeholder="What still needs doing"
                    className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44] resize-none placeholder-[#C4C4C4]" />
                </div>
              </div>

              {/* blockers */}
              <div>
                <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1">Blockers</label>
                <input type="text" value={blockers} onChange={e => setBlockers(e.target.value)}
                  placeholder="none"
                  className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44] placeholder-[#C4C4C4]" />
              </div>

              {/* decision toggle */}
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[#525252]">Decision needed from Ben?</label>
                <button type="button" onClick={() => setDecisionNeeded(d => !d)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${decisionNeeded ? 'bg-[#000000]' : 'bg-[#E5E5E5]'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${decisionNeeded ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {decisionNeeded && (
                <textarea value={decisionSummary} onChange={e => setDecisionSummary(e.target.value)} rows={2}
                  placeholder="What decision is needed?"
                  className="w-full px-3 py-2 text-[12px] rounded-[7px] border border-[#E5E5E5] bg-white focus:outline-none focus:ring-1 focus:ring-[#DD3A44] resize-none placeholder-[#C4C4C4]" />
              )}

              {/* actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleCreate} disabled={saving}
                  className="px-4 py-2 bg-[#000000] text-white rounded-[7px] text-[12px] font-medium hover:bg-[#1A1C1C] transition-colors disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create handoff'}
                </button>
                <button onClick={resetForm}
                  className="px-4 py-2 bg-[#F3F3F3] text-[#525252] rounded-[7px] text-[12px] font-medium hover:bg-[#E5E5E5] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-[#F3F3F3]">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="text-[12px] font-medium text-[#1A1C1C] hover:text-[#C7333D] transition-colors"
              >
                + Create handoff
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
