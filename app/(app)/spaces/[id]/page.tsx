'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/lib/use-workspace'
import Link from 'next/link'
import { cachedFetch, invalidateCache, STABLE_TTL } from '@/lib/client-cache'
import CaptureBar from '@/components/CaptureBar'
import LoadingSpinner from '@/components/LoadingSpinner'
import SpaceForm from '@/components/SpaceForm'
import TaskDetailModal from '@/components/TaskDetailModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Space {
  id: string
  name: string
  industry: string | null
  stage: string | null
  businessModel: string | null
  missionStatement: string | null
  executiveSummary: string | null
  vision: string | null
  targetCustomers: string | null
  marketSize: string | null
  coreProduct: string | null
  positioning: string | null
  competitors: any | null
  differentiators: any | null
  usps: any | null
  pricing: any | null
  features: any | null
  roadmap: any | null
  aiImprovementAreas: any | null
  aiOpportunities: any | null
  logoUrl: string | null
  websiteUrl: string | null
  revenue: number | null
  createdAt: string
  updatedAt: string
  projects: any[]
  documents?: any[]
  notes?: any[]
  insights?: any[]
  memories?: any[]
  files: any[]
  objectives: any[]
  tasks: any[]
  _count: {
    projects: number
    tasks: number
    documents: number
    notes: number
    insights: number
    memories: number
    files: number
    objectives: number
  }
}

type TabId = 'overview' | 'work' | 'objectives' | 'projects' | 'agents' | 'docs' | 'intelligence'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',     label: 'Overview' },
  { id: 'work',         label: 'Tasks' },
  { id: 'objectives',   label: 'Objectives' },
  { id: 'projects',     label: 'Projects' },
  { id: 'agents',       label: 'Agents' },
  { id: 'docs',         label: 'Docs & Notes' },
  { id: 'intelligence', label: 'Intelligence' },
]

const AGENT_COLOURS: Record<string, string> = {
  harvey: '#2563EB',
  theo:   '#7C3AED',
  doug:   '#059669',
  casper: '#D97706',
}
const AGENT_LABELS: Record<string, string> = {
  harvey: 'Harvey', theo: 'Theo', doug: 'Doug', casper: 'Casper',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDue(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'text-red-600' }
  if (days === 0) return { label: 'Due today', cls: 'text-amber-600' }
  if (days === 1) return { label: 'Tomorrow', cls: 'text-amber-500' }
  return { label: `${days}d`, cls: 'text-[#A3A3A3]' }
}

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">{title}</h3>
      {action}
    </div>
  )
}

function EmptyState({ icon, title, cta, onCta }: { icon: string; title: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="text-center py-10 bg-white rounded border border-dashed border-[#E5E5E5]">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-[13px] text-[#A3A3A3]">{title}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="mt-3 text-[12px] font-medium text-[#1A1A1A] border border-[#C6C6C6] px-3 py-1.5 rounded-md hover:bg-[#F9F9F9] transition"
        >
          {cta}
        </button>
      )}
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const col = pct >= 80 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <div className="h-1.5 bg-[#F3F3F3] rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col }} />
    </div>
  )
}

function InlineForm({
  title, fields, onSubmit, onCancel, saving,
}: {
  title: string
  fields: { key: string; label: string; type?: string; options?: string[] }[]
  onSubmit: (data: Record<string, string>) => void
  onCancel: () => void
  saving: boolean
}) {
  const [data, setData] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, '']))
  )
  return (
    <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded p-4 mb-4">
      <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">{title}</p>
      <div className="space-y-2">
        {fields.map(f => (
          f.options ? (
            <select
              key={f.key}
              value={data[f.key]}
              onChange={e => setData(d => ({ ...d, [f.key]: e.target.value }))}
              className="w-full text-[13px] border border-[#E5E5E5] rounded-md px-3 py-2 bg-white outline-none"
            >
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              key={f.key}
              type={f.type || 'text'}
              placeholder={f.label}
              value={data[f.key]}
              onChange={e => setData(d => ({ ...d, [f.key]: e.target.value }))}
              className="w-full text-[13px] border border-[#E5E5E5] rounded-md px-3 py-2 bg-white outline-none focus:border-[#1A1A1A]"
            />
          )
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSubmit(data)}
          disabled={saving}
          className="text-[12px] font-medium bg-[#1A1A1A] text-white px-3 py-1.5 rounded-md hover:bg-[#333] transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="text-[12px] text-[#737373] px-3 py-1.5 rounded-md hover:bg-[#F3F3F3] transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function JsonField({ value }: { value: any }) {
  if (!value) return null
  if (typeof value === 'string') return <p className="text-[13px] text-[#474747] leading-relaxed whitespace-pre-wrap">{value}</p>
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item: any, i: number) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[#474747]">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C6C6C6] flex-shrink-0" />
            {typeof item === 'string' ? item : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wide">{k}</span>
            <p className="text-[13px] text-[#474747] mt-0.5">{String(v)}</p>
          </div>
        ))}
      </div>
    )
  }
  return <p className="text-[13px] text-[#474747]">{String(value)}</p>
}

function CompetitorsList({ value }: { value: any }) {
  if (!value) return <p className="text-[13px] text-[#A3A3A3] italic">No competitors listed yet.</p>
  const items: string[] = Array.isArray(value)
    ? value.map((v: any) => (typeof v === 'string' ? v : JSON.stringify(v)))
    : typeof value === 'string'
    ? value.split('\n').filter(Boolean)
    : Object.values(value).map(String)
  return (
    <div className="space-y-3 mt-2">
      {items.map((c, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="text-[10px] font-bold text-[#A3A3A3] w-4 flex-shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
          <div className="flex-1 border-t border-[#E5E5E5] pt-2">
            <p className="text-[13px] font-semibold text-[#1A1C1C]">{c}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function OverviewTab({ space, onEditClick }: { space: Space; onEditClick: () => void }) {
  const router = useRouter()
  const hasAnyProfile = !!(
    space.missionStatement || space.executiveSummary || space.vision ||
    space.coreProduct || space.competitors || space.targetCustomers || space.marketSize
  )

  // Derive primary market label
  const primaryMarket = space.marketSize || space.industry || null

  return (
    <div className="space-y-0">

      {/* ── Mission Statement ───────────────────────────────────────────── */}
      {space.missionStatement ? (
        <div className="grid grid-cols-[180px_1fr] gap-10 py-10 border-b border-[#E5E5E5]">
          <div className="pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Mission Statement</p>
          </div>
          <p className="text-[22px] font-bold leading-snug text-[#1A1C1C]">{space.missionStatement}</p>
        </div>
      ) : null}

      {/* ── Executive Summary + Market & Competition ────────────────────── */}
      {(space.executiveSummary || space.competitors || space.targetCustomers) ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 py-8 border-b border-[#E5E5E5]">
          {/* Executive Summary */}
          {space.executiveSummary ? (
            <div className="bg-white border border-[#E5E5E5] rounded p-7" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
              <h3 className="text-[15px] font-bold text-[#1A1C1C] mb-4">Executive Summary</h3>
              <p className="text-[13px] text-[#474747] leading-relaxed whitespace-pre-wrap">{space.executiveSummary}</p>
              {space.differentiators && (
                <div className="mt-5 pt-5 border-t border-[#F3F3F3]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-2">Differentiators</p>
                  <JsonField value={space.differentiators} />
                </div>
              )}
            </div>
          ) : <div />}

          {/* Market & Competition */}
          <div className="bg-white border border-[#E5E5E5] rounded p-6" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
            <h3 className="text-[15px] font-bold text-[#1A1C1C] mb-5">Market & Competition</h3>

            {primaryMarket && (
              <div className="mb-5 pb-4 border-b border-[#E5E5E5]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Primary Market</p>
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-[#1A1C1C]">{primaryMarket}</p>
                </div>
                <div className="mt-2 h-px bg-[#1A1C1C] w-2/3" />
              </div>
            )}

            {space.targetCustomers && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Target Customers</p>
                <p className="text-[13px] text-[#474747]">{
                  typeof space.targetCustomers === 'string'
                    ? space.targetCustomers
                    : JSON.stringify(space.targetCustomers)
                }</p>
              </div>
            )}

            {space.competitors && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Competitive Landscape</p>
                <CompetitorsList value={space.competitors} />
              </div>
            )}

            {!space.competitors && !space.targetCustomers && !primaryMarket && (
              <p className="text-[13px] text-[#A3A3A3] italic">No market data yet.</p>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Vision / Core Product / Objectives strip ────────────────────── */}
      {(space.vision || space.coreProduct || space.objectives.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-8 border-b border-[#E5E5E5]">
          {/* Vision */}
          <div className="bg-[#F3F3F3] rounded p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-3">Vision</p>
            {space.vision ? (
              <p className="text-[14px] font-medium text-[#1A1C1C] leading-snug">{
                typeof space.vision === 'string' ? space.vision : JSON.stringify(space.vision)
              }</p>
            ) : (
              <p className="text-[13px] text-[#A3A3A3] italic">Vision not set.</p>
            )}
          </div>

          {/* Core Product — inverted black tile */}
          <div className="bg-[#1A1C1C] rounded p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C6C6C6] mb-3">Core Product</p>
            {space.coreProduct ? (
              <p className="text-[14px] font-semibold text-white leading-snug">{
                typeof space.coreProduct === 'string' ? space.coreProduct : JSON.stringify(space.coreProduct)
              }</p>
            ) : (
              <p className="text-[13px] text-[#737373] italic">Core product not set.</p>
            )}
            {space.positioning && (
              <p className="text-[12px] text-[#A3A3A3] mt-3 leading-relaxed">{
                typeof space.positioning === 'string' ? space.positioning : ''
              }</p>
            )}
          </div>

          {/* Top Objectives — card with progress */}
          <div className="bg-white border border-[#E5E5E5] rounded p-6" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Top Objectives</p>
              {space.objectives.length > 2 && (
                <button
                  onClick={() => router.push(`/spaces/${space.id}?tab=objectives`)}
                  className="text-[10px] text-[#737373] hover:text-[#1A1C1C] transition"
                >
                  View all →
                </button>
              )}
            </div>
            {space.objectives.length === 0 ? (
              <p className="text-[13px] text-[#A3A3A3] italic">No objectives yet.</p>
            ) : (
              <div className="space-y-4">
                {space.objectives.slice(0, 2).map((obj: any) => {
                  const pct = obj.targetValue > 0
                    ? Math.min(100, Math.round((Number(obj.currentValue || 0) / Number(obj.targetValue)) * 100))
                    : 0
                  return (
                    <div key={obj.id}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[12px] font-medium text-[#1A1C1C] truncate leading-tight">{obj.title}</p>
                        <span className="text-[11px] font-bold text-[#474747] flex-shrink-0">{pct}%</span>
                      </div>
                      <ProgressBar value={Number(obj.currentValue || 0)} max={Number(obj.targetValue)} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 py-8">
        {[
          { label: 'Active Tasks',  value: space._count.tasks,      sub: 'across all projects' },
          { label: 'Objectives',    value: space._count.objectives,  sub: 'key results tracked' },
          { label: 'Projects',      value: space._count.projects,    sub: 'in progress' },
          { label: 'Documents',     value: space._count.documents,   sub: 'knowledge base' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`py-8 px-6 ${i < 3 ? 'border-r border-[#E5E5E5]' : ''} ${i >= 2 ? 'hidden md:block' : ''}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-2">{s.label}</p>
            <p className="text-[40px] font-bold text-[#1A1C1C] leading-none">{s.value}</p>
            <p className="text-[12px] text-[#A3A3A3] italic mt-2">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── AI / Product detail (secondary) ────────────────────────────── */}
      {(space.aiImprovementAreas || space.aiOpportunities || space.features || space.roadmap) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 pb-8 border-t border-[#E5E5E5]">
          {space.features && (
            <div className="bg-white border border-[#E5E5E5] rounded p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-3">Features</p>
              <JsonField value={space.features} />
            </div>
          )}
          {space.roadmap && (
            <div className="bg-white border border-[#E5E5E5] rounded p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-3">Roadmap</p>
              <JsonField value={space.roadmap} />
            </div>
          )}
          {space.aiImprovementAreas && (
            <div className="bg-white border border-[#E5E5E5] rounded p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-3">AI Improvement Areas</p>
              <JsonField value={space.aiImprovementAreas} />
            </div>
          )}
          {space.aiOpportunities && (
            <div className="bg-white border border-[#E5E5E5] rounded p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-3">AI Opportunities</p>
              <JsonField value={space.aiOpportunities} />
            </div>
          )}
        </div>
      ) : null}

      {/* ── Empty profile prompt ─────────────────────────────────────────── */}
      {!hasAnyProfile && (
        <div className="py-20 text-center border border-dashed border-[#E5E5E5] rounded bg-white">
          <p className="text-[13px] text-[#A3A3A3] mb-4">No business profile yet — add mission, market, and product details to bring this space to life.</p>
          <button
            onClick={onEditClick}
            className="text-[12px] font-semibold text-white bg-[#000000] px-5 py-2.5 rounded hover:bg-[#1A1C1C] transition"
          >
            Fill in profile
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Work ────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  inbox:    'bg-[#F3F3F3] text-[#474747]',
  todo:     'bg-[#F3F3F3] text-[#474747]',
  doing:    'bg-amber-100 text-amber-700',
  review:   'bg-blue-100 text-blue-700',
  done:     'bg-[#1A1C1C] text-white',
  blocked:  'bg-red-100 text-red-700',
}

function statusPill(name: string) {
  const key = name.toLowerCase().replace(/[\s-]+/g, '')
  return STATUS_PILL[key] || 'bg-[#F3F3F3] text-[#474747]'
}

function WorkTab({ space, wsId, onRefresh, onTaskClick, statuses }: { space: Space; wsId: string | null; onRefresh: () => void; onTaskClick?: (task: any) => void; statuses?: any[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | string>('all')

  const agents = Array.from(new Set(space.tasks.map((t: any) => t.ownerAgent).filter(Boolean))) as string[]

  const filtered = filter === 'all'
    ? space.tasks
    : space.tasks.filter((t: any) => t.ownerAgent === filter)

  const handleAdd = async (data: Record<string, string>) => {
    if (!data.title?.trim()) return
    setSaving(true)
    try {
      await fetch('/api/tasks/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: wsId,
          companyId: space.id,
          title: data.title,
          priority: parseInt(data.priority || '3'),
          ownerAgent: data.agent || null,
        }),
      })
      setShowAdd(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    onRefresh()
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition ${
            filter === 'all' ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#E5E5E5] text-[#474747] hover:border-[#C6C6C6]'
          }`}
        >
          All ({space.tasks.length})
        </button>
        {agents.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition ${
              filter === a ? 'text-white' : 'bg-white border border-[#E5E5E5] text-[#474747] hover:border-[#C6C6C6]'
            }`}
            style={filter === a ? { backgroundColor: AGENT_COLOURS[a] || '#1A1A1A' } : {}}
          >
            {AGENT_LABELS[a] || a} ({space.tasks.filter((t: any) => t.ownerAgent === a).length})
          </button>
        ))}
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto text-[12px] font-medium bg-[#1A1A1A] text-white px-3 py-1.5 rounded-md hover:bg-[#333] transition flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Add Task
        </button>
      </div>

      {showAdd && (
        <InlineForm
          title="New task"
          fields={[
            { key: 'title', label: 'Task title' },
            { key: 'agent', label: 'Assign to agent', options: ['', 'harvey', 'theo', 'doug', 'casper'] },
            { key: 'priority', label: 'Priority', options: ['1', '2', '3', '4'] },
          ]}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          saving={saving}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No tasks yet" cta="Add first task" onCta={() => setShowAdd(true)} />
      ) : (
        <div className="space-y-1">
          {filtered.map((task: any) => {
            const due = formatDue(task.dueAt)
            return (
              <div
                key={task.id}
                className="group flex items-start gap-3 py-3 px-3 bg-white rounded hover:border-[#E5E5E5] border border-transparent hover:shadow-sm transition cursor-pointer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onTaskClick) onTaskClick(task) }}
              >
                <button
                  onClick={e => { e.stopPropagation(); handleComplete(task.id) }}
                  className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border border-[#C6C6C6] hover:border-[#1A1A1A] hover:bg-[#1A1A1A] transition"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1A1A1A] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.project?.name && <span className="text-[11px] text-[#A3A3A3]">{task.project.name}</span>}
                    {task.ownerAgent && (
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{ color: AGENT_COLOURS[task.ownerAgent] || '#737373', backgroundColor: (AGENT_COLOURS[task.ownerAgent] || '#737373') + '18' }}
                      >
                        {AGENT_LABELS[task.ownerAgent] || task.ownerAgent}
                      </span>
                    )}
                    {task.statusId && statuses && (() => {
                      const s = statuses.find((st: any) => st.id === task.statusId)
                      return s ? <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusPill(s.name)}`}>{s.name}</span> : null
                    })()}
                    {task.blockedReason && <span className="text-[11px] text-red-600">Blocked</span>}
                    {due && <span className={`text-[11px] ${due.cls}`}>{due.label}</span>}
                  </div>
                </div>
                {task.priority <= 2 && (
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${task.priority === 1 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {task.priority === 1 ? 'Urgent' : 'High'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Objectives ──────────────────────────────────────────────────────────

function ObjectivesTab({ space, wsId, onRefresh }: { space: Space; wsId: string | null; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = async (data: Record<string, string>) => {
    if (!data.title?.trim()) return
    setSaving(true)
    try {
      await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: wsId,
          companyId: space.id,
          title: data.title,
          description: data.description,
          metricType: data.metricType || 'count',
          targetValue: parseFloat(data.targetValue || '100'),
          startDate: new Date().toISOString().split('T')[0],
          deadline: data.deadline || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        }),
      })
      setShowAdd(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={() => setShowAdd(true)}
          className="text-[12px] font-medium bg-[#1A1A1A] text-white px-3 py-1.5 rounded-md hover:bg-[#333] transition flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Add Objective
        </button>
      </div>

      {showAdd && (
        <InlineForm
          title="New objective"
          fields={[
            { key: 'title', label: 'Objective title' },
            { key: 'description', label: 'Description (optional)' },
            { key: 'metricType', label: 'Metric type', options: ['count', 'currency', 'percentage', 'boolean'] },
            { key: 'targetValue', label: 'Target value (number)', type: 'number' },
            { key: 'deadline', label: 'Deadline', type: 'date' },
          ]}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          saving={saving}
        />
      )}

      {space.objectives.length === 0 ? (
        <EmptyState icon="🎯" title="No objectives yet" cta="Add first objective" onCta={() => setShowAdd(true)} />
      ) : (
        <div className="space-y-4">
          {space.objectives.map((obj: any) => {
            const pct = obj.targetValue > 0
              ? Math.min(100, Math.round((Number(obj.currentValue || 0) / Number(obj.targetValue)) * 100))
              : 0
            const statusColour = obj.status === 'blocked' ? 'text-red-600 bg-red-50' :
              obj.status === 'at_risk' ? 'text-amber-600 bg-amber-50' : 'text-green-700 bg-green-50'
            return (
              <div key={obj.id} className="bg-white rounded p-5 border border-[#E5E5E5]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1A1A]">{obj.title}</p>
                    {obj.description && <p className="text-[12px] text-[#737373] mt-0.5 line-clamp-2">{obj.description}</p>}
                  </div>
                  <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColour}`}>
                    {obj.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold text-[#1A1A1A]">{pct}%</span>
                  <span className="text-[11px] text-[#A3A3A3]">progress</span>
                  {obj.deadline && (
                    <span className="ml-auto text-[11px] text-[#A3A3A3]">
                      Due {new Date(obj.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <ProgressBar value={Number(obj.currentValue || 0)} max={Number(obj.targetValue)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Projects ────────────────────────────────────────────────────────────

function ProjectsTab({ space, wsId, onRefresh }: { space: Space; wsId: string | null; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = async (data: Record<string, string>) => {
    if (!data.name?.trim()) return
    setSaving(true)
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, companyId: space.id, name: data.name, description: data.description }),
      })
      setShowAdd(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={() => setShowAdd(true)} className="text-[12px] font-medium bg-[#1A1A1A] text-white px-3 py-1.5 rounded-md hover:bg-[#333] transition flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Add Project
        </button>
      </div>

      {showAdd && (
        <InlineForm
          title="New project"
          fields={[{ key: 'name', label: 'Project name' }, { key: 'description', label: 'Description (optional)' }]}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          saving={saving}
        />
      )}

      {space.projects.length === 0 ? (
        <EmptyState icon="📁" title="No projects yet" cta="Add first project" onCta={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {space.projects.map((p: any) => {
            const total = p.tasks?.length || 0
            const done = p.tasks?.filter((t: any) => t.completedAt).length || 0
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="block bg-white rounded p-5 border border-[#E5E5E5] hover:border-[#C6C6C6] hover:shadow-sm transition">
                <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{p.name}</h3>
                {p.description && <p className="text-[12px] text-[#737373] mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between text-[11px] text-[#A3A3A3] mb-1.5">
                  <span>{done}/{total} tasks</span>
                  <span>{pct}%</span>
                </div>
                <ProgressBar value={done} max={total} />
                {p.objective && (
                  <p className="text-[11px] text-[#DD3A44] mt-2 truncate">🎯 {p.objective.title}</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Agents ──────────────────────────────────────────────────────────────

function AgentsTab({ space, onSwitchToWork, onTaskClick }: { space: Space; onSwitchToWork?: () => void; onTaskClick?: (task: any) => void }) {
  const router = useRouter()
  const agentMap: Record<string, any[]> = {}
  space.tasks.forEach((t: any) => {
    if (t.ownerAgent) {
      if (!agentMap[t.ownerAgent]) agentMap[t.ownerAgent] = []
      agentMap[t.ownerAgent].push(t)
    }
  })

  const activeAgents = Object.keys(agentMap)

  if (activeAgents.length === 0) {
    return (
      <EmptyState
        icon="🤖"
        title="No agents assigned to this space yet"
        cta="Add tasks in the Tasks tab"
        onCta={onSwitchToWork}
      />
    )
  }

  return (
    <div className="space-y-5">
      {activeAgents.map(agent => {
        const tasks = agentMap[agent]
        const blocked = tasks.filter((t: any) => !!t.blockedReason)
        const waiting = tasks.filter((t: any) => t.waitingOn === 'ben')
        const active = tasks.filter((t: any) => !t.blockedReason && t.waitingOn !== 'ben')
        const col = AGENT_COLOURS[agent] || '#737373'

        return (
          <div key={agent} className="bg-white rounded border border-[#E5E5E5] overflow-hidden">
            {/* Agent header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F3F3]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-bold text-white"
                  style={{ backgroundColor: col }}
                >
                  {(AGENT_LABELS[agent] || agent)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{AGENT_LABELS[agent] || agent}</p>
                  <p className="text-[11px] text-[#A3A3A3]">{tasks.length} tasks in this space</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/queue?agent=${agent}`)}
                className="text-[11px] text-[#737373] hover:text-[#1A1A1A] border border-[#E5E5E5] px-3 py-1.5 rounded-md transition"
              >
                Full queue →
              </button>
            </div>

            {/* Status pills */}
            <div className="flex gap-3 px-5 py-3 border-b border-[#F3F3F3]">
              <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{active.length} active</span>
              {blocked.length > 0 && <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{blocked.length} blocked</span>}
              {waiting.length > 0 && <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{waiting.length} waiting on Ben</span>}
            </div>

            {/* Task list */}
            <div className="px-5 py-3 space-y-2">
              {tasks.slice(0, 6).map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-start gap-2 cursor-pointer group"
                  onClick={() => onTaskClick?.(t)}
                >
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.blockedReason ? 'bg-red-500' : t.waitingOn === 'ben' ? 'bg-amber-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#1A1A1A] group-hover:text-[#474747] truncate transition">{t.title}</p>
                    {t.blockedReason && <p className="text-[11px] text-red-600 truncate">Blocked: {t.blockedReason}</p>}
                    {t.waitingOn === 'ben' && !t.blockedReason && <p className="text-[11px] text-amber-600">Waiting on you</p>}
                  </div>
                </div>
              ))}
              {tasks.length > 6 && (
                <p className="text-[11px] text-[#A3A3A3] pt-1">+{tasks.length - 6} more</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Docs & Notes ────────────────────────────────────────────────────────

function DocsTab({ space, wsId, onRefresh }: { space: Space; wsId: string | null; onRefresh: () => void }) {
  const router = useRouter()
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [savingDoc, setSavingDoc] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [docs, setDocs] = useState<any[] | null>(null)

  useEffect(() => {
    if (!wsId) return
    fetch(`/api/documents?companyId=${space.id}&workspaceId=${wsId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setDocs(d.documents) })
      .catch(() => {})
  }, [space.id, wsId])

  const handleAddDoc = async (data: Record<string, string>) => {
    if (!data.title?.trim()) return
    setSavingDoc(true)
    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, companyId: space.id, title: data.title, documentType: data.documentType || 'general' }),
      })
      setShowAddDoc(false)
      onRefresh()
      // Refresh docs list directly
      if (wsId) {
        fetch(`/api/documents?companyId=${space.id}&workspaceId=${wsId}`)
          .then(r => r.json())
          .then(d => { if (d.success) setDocs(d.documents) })
          .catch(() => {})
      }
    } finally {
      setSavingDoc(false)
    }
  }

  const handleAddNote = async (data: Record<string, string>) => {
    if (!data.title?.trim()) return
    setSavingNote(true)
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, companyId: space.id, title: data.title, body: data.body || '', noteType: data.noteType || 'general' }),
      })
      setShowAddNote(false)
      onRefresh()
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Documents</h3>
          <button onClick={() => setShowAddDoc(true)} className="text-[12px] font-medium text-[#1A1A1A] border border-[#E5E5E5] px-2.5 py-1 rounded-md hover:bg-[#F9F9F9] transition flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add
          </button>
        </div>
        {showAddDoc && (
          <InlineForm
            title="New document"
            fields={[
              { key: 'title', label: 'Document title' },
              { key: 'documentType', label: 'Type', options: ['general', 'strategy', 'plan', 'brief', 'spec', 'SOP', 'meeting'] },
            ]}
            onSubmit={handleAddDoc}
            onCancel={() => setShowAddDoc(false)}
            saving={savingDoc}
          />
        )}
        {docs === null ? (
          <div className="flex justify-center py-6"><div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" /></div>
        ) : docs.length === 0 ? (
          <EmptyState icon="📄" title="No documents yet" />
        ) : (
          <div className="space-y-2">
            {docs.map((doc: any) => {
              const allTags = [...(doc.functionTags || []), ...(doc.typeTags || []), ...(doc.stageTags || [])]
              return (
                <div key={doc.id} onClick={() => router.push(`/documents/${doc.id}`)}
                  className="flex items-center gap-3 bg-white rounded px-4 py-3 border border-[#E5E5E5] hover:border-[#C6C6C6] cursor-pointer transition">
                  <svg className="w-3.5 h-3.5 text-[#C6C6C6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{doc.title}</p>
                    {doc.authorName && <p className="text-[11px] text-[#A3A3A3]">{doc.authorName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {allTags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F3F3F3] text-[#737373] hidden sm:inline">{tag}</span>
                    ))}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3F3F3] text-[#474747] uppercase tracking-wide">{doc.documentType}</span>
                    <span className="text-[11px] text-[#A3A3A3] hidden md:block">{new Date(doc.updatedAt).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Notes</h3>
          <button onClick={() => setShowAddNote(true)} className="text-[12px] font-medium text-[#1A1A1A] border border-[#E5E5E5] px-2.5 py-1 rounded-md hover:bg-[#F9F9F9] transition flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add
          </button>
        </div>
        {showAddNote && (
          <InlineForm
            title="New note"
            fields={[
              { key: 'title', label: 'Note title' },
              { key: 'body', label: 'Content' },
              { key: 'noteType', label: 'Type', options: ['general', 'strategy', 'plan', 'meeting', 'briefing', 'ops', 'partnership'] },
            ]}
            onSubmit={handleAddNote}
            onCancel={() => setShowAddNote(false)}
            saving={savingNote}
          />
        )}
        {(space.notes ?? []).length === 0 ? (
          <EmptyState icon="📝" title="No notes yet" />
        ) : (
          <div className="space-y-2">
            {(space.notes ?? []).map((note: any) => (
              <div key={note.id} className="bg-white rounded p-4 border border-[#E5E5E5] hover:border-[#C6C6C6] cursor-pointer transition">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{note.title}</p>
                  <span className="flex-shrink-0 text-[10px] text-[#A3A3A3] capitalize bg-[#F3F3F3] px-1.5 py-0.5 rounded">{note.noteType}</span>
                </div>
                <p className="text-[12px] text-[#737373] line-clamp-2">{note.body}</p>
                <p className="text-[10px] text-[#C6C6C6] mt-1">{timeAgo(note.updatedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Intelligence ────────────────────────────────────────────────────────

function IntelligenceTab({ space }: { space: Space }) {
  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded p-3 text-[12px] text-[#737373]">
        Agents working on this space reference these insights and memories when planning and executing tasks.
      </div>

      {/* AI Insights */}
      <div>
        <SectionHeader title="AI Insights" />
        {(space.insights ?? []).length === 0 ? (
          <EmptyState icon="💡" title="No insights yet — insights are published by agents from chat" />
        ) : (
          <div className="space-y-3">
            {(space.insights ?? []).map((ins: any) => (
              <div key={ins.id} className="bg-white rounded p-5 border border-[#E5E5E5]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{ins.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#737373] bg-[#F3F3F3] px-1.5 py-0.5 rounded">{ins.insightType}</span>
                    {ins.priority <= 2 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ins.priority === 1 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        P{ins.priority}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[13px] text-[#474747] leading-relaxed">{ins.summary}</p>
                {ins.tags?.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {ins.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] text-[#737373] bg-[#F3F3F3] px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-[#C6C6C6] mt-2">{timeAgo(ins.createdAt)}{ins.createdBy ? ` · ${ins.createdBy}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Memory */}
      <div>
        <SectionHeader title="AI Memory" />
        {(space.memories ?? []).length === 0 ? (
          <EmptyState icon="🧠" title="No memory entries yet — agents write memory from chat" />
        ) : (
          <div className="space-y-3">
            {(space.memories ?? []).map((mem: any) => (
              <div key={mem.id} className="bg-white rounded p-4 border border-[#E5E5E5]">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{mem.title}</p>
                  <span className="flex-shrink-0 text-[10px] text-[#737373] bg-[#F3F3F3] px-1.5 py-0.5 rounded capitalize">{mem.memoryType}</span>
                </div>
                <p className="text-[12px] text-[#737373] leading-relaxed">{mem.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {mem.authorAgent && (
                    <span className="text-[10px]" style={{ color: AGENT_COLOURS[mem.authorAgent] || '#A3A3A3' }}>
                      {AGENT_LABELS[mem.authorAgent] || mem.authorAgent}
                    </span>
                  )}
                  <span className="text-[10px] text-[#C6C6C6]">{timeAgo(mem.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SpaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const spaceId = params.id as string
  const { workspaceId: wsId } = useWorkspace()

  const [space, setSpace] = useState<Space | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || 'overview'
  )
  const [isMobile, setIsMobile] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [modalStatuses, setModalStatuses] = useState<any[]>([])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadSpace = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) invalidateCache(`/api/spaces/${spaceId}`)
      const spaceData = await cachedFetch<Space>(`/api/spaces/${spaceId}`, { ttl: STABLE_TTL })
      setSpace(spaceData)
    } catch (err: any) {
      if (err?.message?.includes('404')) router.push('/spaces')
    } finally {
      setLoading(false)
    }
  }, [spaceId, router])

  // Load statuses separately once wsId is available
  useEffect(() => {
    if (!wsId) return
    cachedFetch<any>(`/api/statuses?workspaceId=${wsId}`, { ttl: 5 * 60 * 1000 })
      .then(d => setModalStatuses(d?.statuses ?? []))
      .catch(() => {})
  }, [wsId])

  useEffect(() => { loadSpace() }, [loadSpace])

  const handleSaveEdit = async (formData: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        await loadSpace(true)
        setIsEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (!space) return null

  const mainClass = ''

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <div className={`${mainClass} transition-all duration-200`}>

        {/* ── Top bar with capture ──────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-[#F3F3F3] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
          <div className="max-w-[1400px] mx-auto flex items-center gap-4">
            <button onClick={() => router.push('/spaces')} className="flex-shrink-0 text-[#A3A3A3] hover:text-[#1A1A1A] transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex-1">
              <CaptureBar onCaptured={() => loadSpace(true)} spaceId={space.id} />
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-12">

          {/* ── Space header — editorial style ────────────────────────────── */}
          <div className="mb-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Profile</span>
              <span className="text-[#C6C6C6] text-[10px]">/</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">Space</span>
              {space.industry && (
                <>
                  <span className="text-[#C6C6C6] text-[10px]">/</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">{space.industry}</span>
                </>
              )}
              <span className="ml-2 flex items-center gap-1.5 bg-[#1A1C1C] text-white text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                Active Project
              </span>
            </div>

            {/* Title row */}
            <div className="flex items-start justify-between gap-6 mb-5">
              <h1 className="text-[48px] font-extrabold text-[#1A1C1C] leading-none tracking-tight">{space.name}</h1>
              <div className="flex-shrink-0 flex items-center gap-3 mt-2">
                <button
                  onClick={() => {}}
                  className="px-5 py-2.5 border border-[#C6C6C6] text-[12px] font-semibold uppercase tracking-[0.06em] text-[#1A1C1C] rounded bg-white hover:bg-[#F3F3F3] transition"
                >
                  Export Report
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 bg-[#1A1C1C] text-[12px] font-semibold uppercase tracking-[0.06em] text-white rounded hover:bg-[#000] transition"
                >
                  Edit Space
                </button>
              </div>
            </div>

            {/* Meta columns row */}
            <div className="flex items-start gap-10 flex-wrap">
              {space.industry && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">Industry</p>
                  <p className="text-[14px] font-semibold text-[#1A1C1C]">{space.industry}</p>
                </div>
              )}
              {space.stage && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">Stage</p>
                  <p className="text-[14px] font-semibold text-[#1A1C1C] capitalize">{space.stage}</p>
                </div>
              )}
              {space.businessModel && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">Model</p>
                  <p className="text-[14px] font-semibold text-[#1A1C1C]">{space.businessModel}</p>
                </div>
              )}
              {space.marketSize && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">Region / Market</p>
                  <p className="text-[14px] font-semibold text-[#1A1C1C]">{space.marketSize}</p>
                </div>
              )}
              {space.revenue && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">Revenue</p>
                  <p className="text-[14px] font-semibold text-[#1A1C1C]">£{(Number(space.revenue) / 1000).toFixed(1)}k MRR</p>
                </div>
              )}
              {space.websiteUrl && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">Website</p>
                  <a href={space.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-[#1A1C1C] hover:underline">
                    {space.websiteUrl.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="flex gap-1 overflow-x-auto mb-6 bg-white rounded border border-[#E5E5E5] p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', tab.id)
                  window.history.replaceState(null, '', url.toString())
                }}
                className={`px-4 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#474747] hover:bg-[#F3F3F3]'
                }`}
              >
                {tab.label}
                {tab.id === 'work' && space._count.tasks > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#F3F3F3] text-[#737373]'}`}>
                    {space._count.tasks}
                  </span>
                )}
                {tab.id === 'objectives' && space._count.objectives > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#F3F3F3] text-[#737373]'}`}>
                    {space._count.objectives}
                  </span>
                )}
                {tab.id === 'intelligence' && (space._count.insights + space._count.memories) > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#F3F3F3] text-[#737373]'}`}>
                    {space._count.insights + space._count.memories}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab content ───────────────────────────────────────────────── */}
          {activeTab === 'overview'     && <OverviewTab space={space} onEditClick={() => setIsEditing(true)} />}
          {activeTab === 'work'         && <WorkTab space={space} wsId={wsId} statuses={modalStatuses} onRefresh={() => loadSpace(true)} onTaskClick={async (t) => {
              const d = await fetch(`/api/tasks/${t.id}`).then(r => r.json()).catch(() => ({}))
              setSelectedTask(d.task ?? t)
              setIsTaskModalOpen(true)
            }} />}
          {activeTab === 'objectives'   && <ObjectivesTab space={space} wsId={wsId} onRefresh={() => loadSpace(true)} />}
          {activeTab === 'projects'     && <ProjectsTab space={space} wsId={wsId} onRefresh={() => loadSpace(true)} />}
          {activeTab === 'agents'       && <AgentsTab space={space} onSwitchToWork={() => setActiveTab('work')} onTaskClick={async (t) => {
              const d = await fetch(`/api/tasks/${t.id}`).then(r => r.json()).catch(() => ({}))
              setSelectedTask(d.task ?? t)
              setIsTaskModalOpen(true)
            }} />}
          {activeTab === 'docs'         && <DocsTab space={space} wsId={wsId} onRefresh={() => loadSpace(true)} />}
          {activeTab === 'intelligence' && <IntelligenceTab space={space} />}

        </div>
      </div>

      {/* ── Edit Space Modal ──────────────────────────────────────────── */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditing(false) }}
        >
          <div
            className="relative bg-white w-full max-w-[700px] rounded flex flex-col"
            style={{ maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}
          >
            {/* Header */}
            <div className="px-8 pt-7 pb-5 border-b border-[#F3F3F3] flex-shrink-0">
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-5 right-5 text-[#A3A3A3] hover:text-[#1A1C1C] transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1">
                Edit Module
              </p>
              <h2 className="text-[26px] font-bold text-[#1A1C1C]">Edit Space Profile</h2>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-8 py-7">
              <SpaceForm
                initialData={{
                  name:              space.name,
                  industry:          space.industry          || '',
                  stage:             space.stage             || 'pre-seed',
                  businessModel:     space.businessModel     || '',
                  missionStatement:  space.missionStatement  || '',
                  executiveSummary:  space.executiveSummary  || '',
                  vision:            space.vision            || '',
                  targetCustomers:   space.targetCustomers   || '',
                  marketSize:        space.marketSize        || '',
                  coreProduct:       space.coreProduct       || '',
                  positioning:       space.positioning       || '',
                  logoUrl:           space.logoUrl           || '',
                  websiteUrl:        space.websiteUrl        || '',
                  revenue:           space.revenue           ? String(space.revenue) : '',
                }}
                onSubmit={handleSaveEdit}
                onCancel={() => setIsEditing(false)}
                submitLabel="Save Changes"
                isLoading={saving}
                hideActions
              />
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 border-t border-[#E5E5E5] bg-[#FAFAFA] px-8 py-4 flex items-center justify-between rounded-b">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#474747]">
                  Verification Status: Draft
                </span>
                <span className="w-2 h-2 rounded-full bg-[#C6C6C6] flex-shrink-0" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-5 py-2 text-[14px] font-medium text-[#474747] hover:text-[#1A1C1C] transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="space-form"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white text-[14px] font-semibold rounded transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal — same component as task list */}
      <TaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null) }}
        task={selectedTask ?? undefined}
        onUpdate={async (taskId, updates) => {
          await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updates, workspaceId: wsId }),
          })
          setIsTaskModalOpen(false)
          setSelectedTask(null)
          loadSpace(true)
        }}
        onDelete={async (taskId) => {
          await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
          setIsTaskModalOpen(false)
          setSelectedTask(null)
          loadSpace(true)
        }}
        workspaceId={wsId ?? 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'}
        statuses={modalStatuses}
      />

    </div>
  )
}
