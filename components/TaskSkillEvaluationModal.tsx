'use client'

import { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'

interface Skill {
  id: string
  title: string
  category: string
  qualityCriteria?: { good?: string[]; bad?: string[]; checkBefore?: string[] }
  steps?: Array<{ order: number; title: string; description: string }>
}

interface EvaluationData {
  qualityScore: string // met | partial | not_met (overall)
  confidence: string   // low | medium | high
  criteriaResults: Record<string, 'met' | 'partial' | 'not_met'>
  strengthNotes: string
  gapNotes: string
  deviationNotes: string
  suggestUpdate: boolean
}

interface TaskSkillEvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (evaluation: EvaluationData, skipEvaluation: boolean, skipReason?: string) => void
  skillId: string
  taskId: string
  workspaceId: string
  agentId?: string
}

const SKIP_REASONS = [
  { value: 'wrong_skill_linked', label: 'Wrong skill was linked' },
  { value: 'skill_obsolete', label: 'Skill is outdated / obsolete' },
  { value: 'admin_or_trivial_task', label: 'Admin or trivial task' },
  { value: 'emergency_override', label: 'Emergency override' },
  { value: 'reviewer_requested_bypass', label: 'Reviewer requested bypass' },
]

export default function TaskSkillEvaluationModal({
  isOpen,
  onClose,
  onSubmit,
  skillId,
  taskId,
  workspaceId,
  agentId = 'doug',
}: TaskSkillEvaluationModalProps) {
  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'evaluate' | 'skip'>('evaluate')
  const [skipReason, setSkipReason] = useState('')

  const [criteriaResults, setCriteriaResults] = useState<Record<string, 'met' | 'partial' | 'not_met'>>({})
  const [overallScore, setOverallScore] = useState<'met' | 'partial' | 'not_met'>('met')
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium')
  const [strengthNotes, setStrengthNotes] = useState('')
  const [gapNotes, setGapNotes] = useState('')
  const [deviationNotes, setDeviationNotes] = useState('')
  const [suggestUpdate, setSuggestUpdate] = useState(false)

  useEffect(() => {
    if (!isOpen || !skillId) return
    setLoading(true)
    setError(null)
    fetch(`/api/skills/${skillId}`)
      .then(r => r.json())
      .then(d => {
        setSkill(d.skill || null)
        // Initialise criteria results
        const criteria = d.skill?.qualityCriteria?.good || []
        const initial: Record<string, 'met' | 'partial' | 'not_met'> = {}
        criteria.forEach((c: string) => { initial[c] = 'met' })
        setCriteriaResults(initial)
      })
      .catch(() => setError('Failed to load skill'))
      .finally(() => setLoading(false))
  }, [isOpen, skillId])

  if (!isOpen) return null

  const criteria = skill?.qualityCriteria?.good || []
  const allCriteriaScored = criteria.length === 0 || criteria.every(c => criteriaResults[c])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    if (mode === 'skip') {
      if (!skipReason) { setError('Please select a skip reason'); setSubmitting(false); return }
      onSubmit({ qualityScore: 'met', confidence: 'medium', criteriaResults: {}, strengthNotes: '', gapNotes: '', deviationNotes: '', suggestUpdate: false }, true, skipReason)
      setSubmitting(false)
      return
    }

    // Submit evaluation to API
    try {
      const res = await fetch(`/api/skills/${skillId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          taskId,
          agentId,
          skillVersion: 1,
          qualityScore: overallScore,
          confidence,
          criteriaResults,
          strengthNotes: strengthNotes || null,
          gapNotes: gapNotes || null,
          deviationNotes: deviationNotes || null,
          suggestUpdate,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Evaluation failed')
      onSubmit({ qualityScore: overallScore, confidence, criteriaResults, strengthNotes, gapNotes, deviationNotes, suggestUpdate }, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  const scoreBtn = (value: 'met' | 'partial' | 'not_met', current: string, onChange: (v: any) => void) => {
    const styles: Record<string, string> = {
      met:     current === value ? 'bg-green-600 text-white border-green-600' : 'border-[#C6C6C6] text-[#474747] hover:border-green-400',
      partial: current === value ? 'bg-amber-500 text-white border-amber-500' : 'border-[#C6C6C6] text-[#474747] hover:border-amber-400',
      not_met: current === value ? 'bg-red-500 text-white border-red-500'     : 'border-[#C6C6C6] text-[#474747] hover:border-red-400',
    }
    const labels: Record<string, string> = { met: 'Met', partial: 'Partial', not_met: 'Not met' }
    return (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`px-2 py-1 text-[11px] font-medium border rounded transition-colors ${styles[value]}`}
        style={{ borderRadius: 3 }}
      >
        {labels[value]}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.12)]" style={{ borderRadius: 4 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E8] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1C1C]">Skill Evaluation Required</h2>
            {skill && <p className="text-xs text-[#A3A3A3] mt-0.5">{skill.title}</p>}
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#1A1C1C] transition-colors">
            <FaTimes />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#E8E8E8] border-t-[#1A1C1C] rounded-full animate-spin" />
          </div>
        )}

        {!loading && skill && (
          <>
            {/* Mode toggle */}
            <div className="px-4 pt-3 shrink-0">
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setMode('evaluate')}
                  className={`px-3 py-1.5 border font-medium transition-colors ${mode === 'evaluate' ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:bg-[#F3F3F3]'}`}
                  style={{ borderRadius: 3 }}
                >
                  Evaluate
                </button>
                <button
                  onClick={() => setMode('skip')}
                  className={`px-3 py-1.5 border font-medium transition-colors ${mode === 'skip' ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:bg-[#F3F3F3]'}`}
                  style={{ borderRadius: 3 }}
                >
                  Skip with reason
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {mode === 'skip' ? (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
                    Skip reason
                  </label>
                  <select
                    value={skipReason}
                    onChange={e => setSkipReason(e.target.value)}
                    className="w-full border border-[#C6C6C6] px-3 py-2 text-sm text-[#1A1C1C] bg-white outline-none focus:border-[#1A1C1C]"
                    style={{ borderRadius: 4 }}
                  >
                    <option value="">Select a reason…</option>
                    {SKIP_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  {/* Per-criterion scoring */}
                  {criteria.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
                        Quality Criteria
                      </label>
                      <div className="space-y-2">
                        {criteria.map((c: string) => (
                          <div key={c} className="flex items-start gap-3">
                            <span className="text-xs text-[#474747] flex-1 pt-1">{c}</span>
                            <div className="flex gap-1 shrink-0">
                              {(['met', 'partial', 'not_met'] as const).map(v =>
                                scoreBtn(v, criteriaResults[c] || '', (val) =>
                                  setCriteriaResults(prev => ({ ...prev, [c]: val }))
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overall score */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
                      Overall Score
                    </label>
                    <div className="flex gap-2">
                      {(['met', 'partial', 'not_met'] as const).map(v =>
                        scoreBtn(v, overallScore, setOverallScore)
                      )}
                    </div>
                  </div>

                  {/* Confidence */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2 block">
                      Confidence
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setConfidence(v)}
                          className={`px-2 py-1 text-[11px] font-medium border rounded transition-colors capitalize ${confidence === v ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]' : 'border-[#C6C6C6] text-[#474747] hover:bg-[#F3F3F3]'}`}
                          style={{ borderRadius: 3 }}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
                      Strength notes <span className="text-[#C6C6C6] normal-case font-normal">— what went well</span>
                    </label>
                    <textarea
                      value={strengthNotes}
                      onChange={e => setStrengthNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-[#C6C6C6] px-3 py-2 text-sm text-[#1A1C1C] resize-none outline-none focus:border-[#1A1C1C]"
                      style={{ borderRadius: 4 }}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
                      Gap notes <span className="text-[#C6C6C6] normal-case font-normal">— what fell short</span>
                    </label>
                    <textarea
                      value={gapNotes}
                      onChange={e => setGapNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-[#C6C6C6] px-3 py-2 text-sm text-[#1A1C1C] resize-none outline-none focus:border-[#1A1C1C]"
                      style={{ borderRadius: 4 }}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
                      Deviation notes <span className="text-[#C6C6C6] normal-case font-normal">— where you deviated from the steps</span>
                    </label>
                    <textarea
                      value={deviationNotes}
                      onChange={e => setDeviationNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-[#C6C6C6] px-3 py-2 text-sm text-[#1A1C1C] resize-none outline-none focus:border-[#1A1C1C]"
                      style={{ borderRadius: 4 }}
                      placeholder="Optional"
                    />
                  </div>

                  {/* Suggest update */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={suggestUpdate}
                      onChange={e => setSuggestUpdate(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-sm text-[#474747]">Suggest this skill should be updated</span>
                  </label>
                </>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#E8E8E8] shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-[#C6C6C6] text-[#474747] hover:bg-[#F3F3F3] transition-colors"
                style={{ borderRadius: 4 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (mode === 'evaluate' && !allCriteriaScored)}
                className="px-4 py-2 text-sm bg-[#1A1C1C] text-white hover:bg-[#2a2c2c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ borderRadius: 4 }}
              >
                {submitting ? 'Submitting…' : mode === 'skip' ? 'Skip & move to Review' : 'Submit & move to Review'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
