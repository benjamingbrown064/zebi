'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useWorkspace } from '@/lib/use-workspace'
import LoadingSpinner from '@/components/LoadingSpinner'

type Tab = 'overview' | 'evaluations'

const QUALITY_COLORS: Record<string, string> = {
  met:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  not_met: 'bg-red-50 text-red-700 border-red-200',
}

const QUALITY_LABEL: Record<string, string> = {
  met: '✓ Met', partial: '~ Partial', not_met: '✗ Not met',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   'bg-[#1A1A1A] text-white',
  medium: 'bg-[#F3F3F3] text-[#474747]',
  low:    'bg-[#F9F9F9] text-[#A3A3A3]',
}

const ROLE_LABEL: Record<string, string> = {
  'owner':          'Owner',
  'regular-user':   'Regular user',
  'incidental-user':'Incidental',
}

const CAT_COLORS: Record<string, string> = {
  research: 'bg-sky-100 text-sky-700', outreach: 'bg-violet-100 text-violet-700',
  content: 'bg-pink-100 text-pink-700', build: 'bg-emerald-100 text-emerald-700',
  ops: 'bg-orange-100 text-orange-700', other: 'bg-[#F3F3F3] text-[#474747]',
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60000) return 'just now'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ skill }: { skill: any }) {
  const steps: any[]           = Array.isArray(skill.steps) ? skill.steps : []
  const qc: any                = skill.qualityCriteria || {}
  const examples: any          = skill.examples || {}

  return (
    <div className="space-y-6">
      {/* Description */}
      {skill.description && (
        <div className="bg-white border border-[#E5E5E5] rounded p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Description</p>
          <p className="text-[13px] text-[#474747] leading-relaxed">{skill.description}</p>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="bg-white border border-[#E5E5E5] rounded p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-4">Steps</p>
          <div className="space-y-4">
            {steps.map((step: any, i: number) => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step.order ?? i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1A1A] mb-1">{step.title}</p>
                  {step.description && <p className="text-[12px] text-[#474747] leading-relaxed">{step.description}</p>}
                  {Array.isArray(step.tips) && step.tips.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {step.tips.map((tip: string, j: number) => (
                        <p key={j} className="text-[11px] text-[#737373] leading-relaxed">💡 {tip}</p>
                      ))}
                    </div>
                  )}
                  {typeof step.tips === 'string' && step.tips && (
                    <p className="text-[11px] text-[#737373] mt-2 leading-relaxed">💡 {step.tips}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Criteria */}
      {(qc.good?.length || qc.bad?.length || qc.checkBefore?.length) && (
        <div className="bg-white border border-[#E5E5E5] rounded p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-4">Quality Criteria</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {qc.good?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 mb-2">✓ Good output looks like</p>
                <ul className="space-y-1">
                  {qc.good.map((g: string, i: number) => <li key={i} className="text-[12px] text-[#474747]">• {g}</li>)}
                </ul>
              </div>
            )}
            {qc.bad?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-red-700 mb-2">✗ Bad output looks like</p>
                <ul className="space-y-1">
                  {qc.bad.map((b: string, i: number) => <li key={i} className="text-[12px] text-[#474747]">• {b}</li>)}
                </ul>
              </div>
            )}
            {qc.checkBefore?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#474747] mb-2">Check before completing</p>
                <ul className="space-y-1">
                  {qc.checkBefore.map((c: string, i: number) => <li key={i} className="text-[12px] text-[#474747]">• {c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Examples */}
      {(examples.good?.length || examples.bad?.length) && (
        <div className="bg-white border border-[#E5E5E5] rounded p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-4">Examples</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examples.good?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-emerald-700 mb-2">✓ Good</p>
                {examples.good.map((g: string, i: number) => (
                  <p key={i} className="text-[12px] text-[#474747] bg-emerald-50 rounded p-2 mb-1">{g}</p>
                ))}
              </div>
            )}
            {examples.bad?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-red-700 mb-2">✗ Bad</p>
                {examples.bad.map((b: string, i: number) => (
                  <p key={i} className="text-[12px] text-[#474747] bg-red-50 rounded p-2 mb-1">{b}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Evaluations Tab ─────────────────────────────────────────────────────────
function EvaluationsTab({ skill, workspaceId }: { skill: any; workspaceId: string }) {
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [stats, setStats]             = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [agentFilter, setAgentFilter] = useState('all')
  const [selected, setSelected]       = useState<any | null>(null)

  const AGENTS = ['harvey', 'theo', 'doug', 'casper']

  const load = useCallback(() => {
    const p = new URLSearchParams({ workspaceId })
    if (agentFilter !== 'all') p.set('agentId', agentFilter)
    fetch(`/api/skills/${skill.id}/evaluate?${p}`)
      .then(r => r.json())
      .then(d => {
        setEvaluations(d.evaluations || [])
        setStats(d.stats || null)
      })
      .finally(() => setLoading(false))
  }, [skill.id, workspaceId, agentFilter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Stats bar */}
      {stats && (
        <div className="bg-white border border-[#E5E5E5] rounded p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
              Health — v{stats.currentVersion} ({stats.total} evaluation{stats.total !== 1 ? 's' : ''})
            </p>
            {stats.suggestCount > 0 && (
              <span className="text-[11px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded">
                {stats.suggestCount} improvement{stats.suggestCount !== 1 ? 's' : ''} suggested
              </span>
            )}
          </div>
          {stats.total > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-[#F3F3F3] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.metPct}%` }} />
              </div>
              <span className="text-[13px] font-bold text-[#1A1A1A] flex-shrink-0">{stats.metPct}% met</span>
              <div className="flex gap-3 flex-shrink-0">
                <span className="text-[11px] text-emerald-700">{stats.met} met</span>
                <span className="text-[11px] text-yellow-700">{stats.partial} partial</span>
                <span className="text-[11px] text-red-700">{stats.notMet} not met</span>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#A3A3A3]">No evaluations yet for this version.</p>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded bg-white focus:outline-none">
          <option value="all">All agents</option>
          {AGENTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
       evaluations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-[#A3A3A3] mb-2">No evaluations yet.</p>
          <p className="text-[12px] text-[#C6C6C6]">Evaluations are submitted when an agent completes a task linked to this skill.</p>
        </div>
       ) : (
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            {evaluations.map((ev: any) => (
              <div key={ev.id} onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                className={`bg-white border rounded p-4 cursor-pointer transition ${selected?.id === ev.id ? 'border-[#1A1A1A]' : 'border-[#E5E5E5] hover:border-[#C6C6C6]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#1A1A1A] capitalize">{ev.agentId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${QUALITY_COLORS[ev.qualityScore] || ''}`}>
                        {QUALITY_LABEL[ev.qualityScore] || ev.qualityScore}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CONFIDENCE_COLORS[ev.confidence] || ''}`}>
                        {ev.confidence} confidence
                      </span>
                      <span className="text-[10px] text-[#A3A3A3] bg-[#F9F9F9] px-1.5 py-0.5 rounded">{ROLE_LABEL[ev.agentSkillRole] || ev.agentSkillRole}</span>
                    </div>
                    {ev.strengthNotes && (
                      <p className="text-[12px] text-emerald-700 truncate">✓ {ev.strengthNotes}</p>
                    )}
                    {ev.gapNotes && (
                      <p className="text-[12px] text-red-600 truncate">⚠ {ev.gapNotes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-[#A3A3A3]">{timeAgo(ev.createdAt)}</p>
                    <p className="text-[10px] text-[#C6C6C6]">v{ev.skillVersion}</p>
                    {ev.suggestUpdate && (
                      <span className="text-[10px] text-orange-600 font-medium">suggests update</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-[320px] flex-shrink-0 bg-white border border-[#E5E5E5] rounded p-5 self-start sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-[#1A1A1A] capitalize">{selected.agentId}</h3>
                <button onClick={() => setSelected(null)} className="text-[#A3A3A3] hover:text-[#1A1A1A]">✕</button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${QUALITY_COLORS[selected.qualityScore]}`}>
                  {QUALITY_LABEL[selected.qualityScore]}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CONFIDENCE_COLORS[selected.confidence]}`}>
                  {selected.confidence} confidence
                </span>
                <span className="text-[10px] text-[#A3A3A3] bg-[#F9F9F9] px-1.5 py-0.5 rounded">
                  {ROLE_LABEL[selected.agentSkillRole]}
                </span>
              </div>

              {selected.strengthNotes && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-600 mb-1">What worked</p>
                  <p className="text-[12px] text-[#474747] leading-relaxed">{selected.strengthNotes}</p>
                </div>
              )}
              {selected.gapNotes && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-600 mb-1">Gaps / Issues</p>
                  <p className="text-[12px] text-[#474747] leading-relaxed">{selected.gapNotes}</p>
                </div>
              )}
              {selected.deviationNotes && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-600 mb-1">Deviations from steps</p>
                  <p className="text-[12px] text-[#474747] leading-relaxed">{selected.deviationNotes}</p>
                </div>
              )}
              {selected.suggestUpdate && (
                <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-[11px] text-orange-700 font-medium">This agent suggested a skill update</p>
                </div>
              )}
              <p className="text-[10px] text-[#C6C6C6] mt-4">{new Date(selected.createdAt).toLocaleString('en-GB')} · v{selected.skillVersion}</p>
            </div>
          )}
        </div>
       )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SkillDetailPage() {
  const router = useRouter()
  const params = useParams()
  const skillId = params.id as string
  const { workspaceId } = useWorkspace()
  const [skill, setSkill]       = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const wsId = workspaceId || 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

  useEffect(() => {
    fetch(`/api/skills/${skillId}?workspaceId=${wsId}`)
      .then(r => r.json())
      .then(d => { if (d.skill) setSkill(d.skill); else router.push('/agents?tab=skills') })
      .finally(() => setLoading(false))
  }, [skillId, wsId, router])

  if (loading) return <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center"><LoadingSpinner /></div>
  if (!skill) return null

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#F3F3F3] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/agents?tab=skills')} className="text-[#A3A3A3] hover:text-[#1A1A1A] transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[13px] text-[#737373]">Skills</span>
          <span className="text-[#C6C6C6]">/</span>
          <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{skill.title}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-[22px] font-bold text-[#1A1A1A]">{skill.title}</h1>
              {skill.status !== 'active' && (
                <span className="text-[11px] px-2 py-0.5 bg-[#F3F3F3] text-[#737373] rounded capitalize">{skill.status}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${CAT_COLORS[skill.category] || CAT_COLORS.other}`}>{skill.category}</span>
              <span className="text-[12px] text-[#737373] capitalize">{skill.skillType}</span>
              <span className="text-[#C6C6C6]">·</span>
              <span className="text-[12px] text-[#737373]">v{skill.version}</span>
              {skill.ownerAgent && (
                <>
                  <span className="text-[#C6C6C6]">·</span>
                  <span className="text-[12px] text-[#737373]">owned by <span className="font-medium text-[#1A1A1A] capitalize">{skill.ownerAgent}</span></span>
                </>
              )}
              {skill.tags?.length > 0 && skill.tags.map((t: string) => (
                <span key={t} className="text-[10px] bg-[#F3F3F3] text-[#474747] px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 hidden md:flex items-center gap-2">
            {[
              { label: 'Steps', n: Array.isArray(skill.steps) ? skill.steps.length : 0 },
              { label: 'Tasks', n: skill._count?.tasks || 0 },
            ].map(s => (
              <div key={s.label} className="text-center bg-white border border-[#E5E5E5] rounded px-3 py-1.5">
                <div className="text-[15px] font-bold text-[#1A1A1A]">{s.n}</div>
                <div className="text-[10px] text-[#A3A3A3]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded border border-[#E5E5E5] p-1 w-fit">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'evaluations', label: 'Evaluations' },
          ] as { id: Tab; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded text-[13px] font-medium whitespace-nowrap transition ${
                activeTab === tab.id ? 'bg-[#1A1A1A] text-white' : 'text-[#474747] hover:bg-[#F3F3F3]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview'    && <OverviewTab skill={skill} />}
        {activeTab === 'evaluations' && <EvaluationsTab skill={skill} workspaceId={wsId} />}
      </div>
    </div>
  )
}
