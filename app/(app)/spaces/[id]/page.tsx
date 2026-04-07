'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

function OverviewTab({ space, onEditClick }: { space: Space; onEditClick: () => void }) {
  const router = useRouter()

  const topObjectives = space.objectives.slice(0, 3)
  const topProjects = space.projects.slice(0, 3)
  const recentMemory = (space.memories ?? []).slice(0, 3)

  // Sections that have content — only render populated ones
  const strategyFields = [
    { label: 'Mission Statement', value: space.missionStatement },
    { label: 'Executive Summary', value: space.executiveSummary },
    { label: 'Vision', value: space.vision },
  ].filter(f => f.value)

  const marketFields = [
    { label: 'Target Customers', value: space.targetCustomers },
    { label: 'Market Size', value: space.marketSize },
    { label: 'Competitors', value: space.competitors },
    { label: 'Differentiators', value: space.differentiators },
    { label: 'USPs', value: space.usps },
  ].filter(f => f.value)

  const productFields = [
    { label: 'Core Product', value: space.coreProduct },
    { label: 'Positioning', value: space.positioning },
    { label: 'Pricing', value: space.pricing },
    { label: 'Features', value: space.features },
    { label: 'Roadmap', value: space.roadmap },
  ].filter(f => f.value)

  const aiFields = [
    { label: 'AI Improvement Areas', value: space.aiImprovementAreas },
    { label: 'AI Opportunities', value: space.aiOpportunities },
  ].filter(f => f.value)

  const hasProfile = strategyFields.length > 0 || marketFields.length > 0 || productFields.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: live ops + profile */}
      <div className="lg:col-span-2 space-y-5">

        {/* Objectives */}
        <div className="bg-white rounded p-5 border border-[#E5E5E5]">
          <SectionHeader
            title="Active Objectives"
            action={
              space.objectives.length > 3 ? (
                <button onClick={() => router.push(`/spaces/${space.id}?tab=objectives`)} className="text-[11px] text-[#737373] hover:text-[#1A1A1A]">
                  View all {space._count.objectives}
                </button>
              ) : undefined
            }
          />
          {topObjectives.length === 0 ? (
            <p className="text-[13px] text-[#C6C6C6] italic">No active objectives</p>
          ) : (
            <div className="space-y-4">
              {topObjectives.map((obj: any) => {
                const pct = obj.targetValue > 0
                  ? Math.min(100, Math.round((Number(obj.currentValue || 0) / Number(obj.targetValue)) * 100))
                  : 0
                return (
                  <div key={obj.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{obj.title}</p>
                      <span className={`text-[11px] font-semibold flex-shrink-0 ${obj.status === 'blocked' ? 'text-red-600' : obj.status === 'at_risk' ? 'text-amber-600' : 'text-green-600'}`}>{pct}%</span>
                    </div>
                    <ProgressBar value={Number(obj.currentValue || 0)} max={Number(obj.targetValue)} />
                    {obj.deadline && <p className="text-[11px] text-[#A3A3A3] mt-1">Due {new Date(obj.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="bg-white rounded p-5 border border-[#E5E5E5]">
          <SectionHeader title="Projects" />
          {topProjects.length === 0 ? (
            <p className="text-[13px] text-[#C6C6C6] italic">No active projects</p>
          ) : (
            <div className="space-y-3">
              {topProjects.map((p: any) => {
                const total = p.tasks?.length || 0
                const done = p.tasks?.filter((t: any) => t.completedAt).length || 0
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#474747] transition truncate">{p.name}</p>
                      <p className="text-[11px] text-[#A3A3A3]">{done}/{total} tasks done</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#C6C6C6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Strategy */}
        {strategyFields.length > 0 && (
          <div className="bg-white rounded p-5 border border-[#E5E5E5]">
            <SectionHeader title="Strategy" />
            <div className="space-y-5">
              {strategyFields.map(f => (
                <div key={f.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5">{f.label}</p>
                  <JsonField value={f.value} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market */}
        {marketFields.length > 0 && (
          <div className="bg-white rounded p-5 border border-[#E5E5E5]">
            <SectionHeader title="Market & Competition" />
            <div className="space-y-5">
              {marketFields.map(f => (
                <div key={f.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5">{f.label}</p>
                  <JsonField value={f.value} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product */}
        {productFields.length > 0 && (
          <div className="bg-white rounded p-5 border border-[#E5E5E5]">
            <SectionHeader title="Product" />
            <div className="space-y-5">
              {productFields.map(f => (
                <div key={f.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5">{f.label}</p>
                  <JsonField value={f.value} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI */}
        {aiFields.length > 0 && (
          <div className="bg-white rounded p-5 border border-[#E5E5E5]">
            <SectionHeader title="AI Intelligence" />
            <div className="space-y-5">
              {aiFields.map(f => (
                <div key={f.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5">{f.label}</p>
                  <JsonField value={f.value} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty profile prompt */}
        {!hasProfile && (
          <div className="bg-white rounded p-6 border border-dashed border-[#E5E5E5] text-center">
            <p className="text-[13px] text-[#A3A3A3] mb-3">No business profile yet — add mission, market, and product details</p>
            <button
              onClick={onEditClick}
              className="text-[12px] font-medium text-[#1A1A1A] border border-[#C6C6C6] px-3 py-1.5 rounded-md hover:bg-[#F9F9F9] transition"
            >
              Fill in profile
            </button>
          </div>
        )}
      </div>

      {/* Right: meta + stats + memory */}
      <div className="space-y-5">
        {/* Business details */}
        <div className="bg-white rounded p-5 border border-[#E5E5E5]">
          <SectionHeader
            title="Details"
            action={
              <button onClick={onEditClick} className="text-[11px] text-[#737373] hover:text-[#1A1A1A]">Edit</button>
            }
          />
          <div className="space-y-3">
            {[
              { label: 'Industry',   value: space.industry },
              { label: 'Stage',      value: space.stage },
              { label: 'Model',      value: space.businessModel },
              { label: 'Revenue',    value: space.revenue ? `£${(Number(space.revenue)/1000).toFixed(1)}k MRR` : null },
              { label: 'Market',     value: space.marketSize },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex justify-between gap-2">
                <span className="text-[12px] text-[#A3A3A3]">{r.label}</span>
                <span className="text-[12px] font-medium text-[#1A1A1A] text-right capitalize">{r.value}</span>
              </div>
            ))}
            {space.websiteUrl && (
              <a href={space.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-[#DD3A44] hover:underline">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                Website
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded p-5 border border-[#E5E5E5]">
          <SectionHeader title="Stats" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Tasks',      n: space._count.tasks },
              { label: 'Objectives', n: space._count.objectives },
              { label: 'Projects',   n: space._count.projects },
              { label: 'Docs',       n: space._count.documents },
              { label: 'Notes',      n: space._count.notes },
              { label: 'Insights',   n: space._count.insights },
            ].map(s => (
              <div key={s.label} className="text-center py-2 bg-[#F9F9F9] rounded-md">
                <div className="text-[18px] font-bold text-[#1A1A1A]">{s.n}</div>
                <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent memory */}
        {recentMemory.length > 0 && (
          <div className="bg-white rounded p-5 border border-[#E5E5E5]">
            <SectionHeader title="Recent Memory" />
            <div className="space-y-3">
              {recentMemory.map((m: any) => (
                <div key={m.id}>
                  <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{m.title}</p>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5 line-clamp-2">{m.description}</p>
                  <p className="text-[10px] text-[#C6C6C6] mt-0.5">{timeAgo(m.updatedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Work ────────────────────────────────────────────────────────────────

function WorkTab({ space, wsId, onRefresh, onTaskClick }: { space: Space; wsId: string | null; onRefresh: () => void; onTaskClick?: (task: any) => void }) {
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
                onClick={() => onTaskClick?.(task)}
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
        {(space.documents ?? []).length === 0 ? (
          <EmptyState icon="📄" title="No documents yet" />
        ) : (
          <div className="space-y-2">
            {(space.documents ?? []).map((doc: any) => (
              <div key={doc.id} onClick={() => router.push(`/documents/${doc.id}`)} className="flex items-center gap-3 bg-white rounded p-4 border border-[#E5E5E5] hover:border-[#C6C6C6] cursor-pointer transition">
                <svg className="w-4 h-4 text-[#C6C6C6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{doc.title}</p>
                  <p className="text-[11px] text-[#A3A3A3] capitalize">{doc.documentType} · {new Date(doc.updatedAt).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            ))}
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
  const spaceId = params.id as string
  const { workspaceId: wsId } = useWorkspace()

  const [space, setSpace] = useState<Space | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
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

          {/* ── Space header ──────────────────────────────────────────────── */}
          <div className="flex items-start gap-4 mb-6">
            {/* Logo / avatar */}
            <div className="flex-shrink-0 w-14 h-14 rounded bg-white border border-[#E5E5E5] flex items-center justify-center overflow-hidden">
              {space.logoUrl ? (
                <img src={space.logoUrl} alt={space.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#C6C6C6]">{space.name[0]}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-bold text-[#1A1A1A] truncate">{space.name}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-shrink-0 text-[#C6C6C6] hover:text-[#737373] transition"
                  title="Edit space profile"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {space.industry && <span className="text-[12px] text-[#737373]">{space.industry}</span>}
                {space.industry && space.stage && <span className="text-[#C6C6C6]">·</span>}
                {space.stage && <span className="text-[12px] text-[#737373] capitalize">{space.stage}</span>}
                {space.revenue && (
                  <>
                    <span className="text-[#C6C6C6]">·</span>
                    <span className="text-[12px] font-semibold text-[#1A1A1A]">
                      £{(Number(space.revenue) / 1000).toFixed(1)}k MRR
                    </span>
                  </>
                )}
                {space.websiteUrl && (
                  <>
                    <span className="text-[#C6C6C6]">·</span>
                    <a href={space.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#DD3A44] hover:underline">
                      {space.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Counts pills */}
            <div className="flex-shrink-0 hidden md:flex items-center gap-2">
              {[
                { label: 'Tasks', n: space._count.tasks },
                { label: 'Objectives', n: space._count.objectives },
                { label: 'Projects', n: space._count.projects },
              ].map(s => (
                <div key={s.label} className="text-center bg-white border border-[#E5E5E5] rounded-md px-3 py-1.5">
                  <div className="text-[14px] font-bold text-[#1A1A1A]">{s.n}</div>
                  <div className="text-[10px] text-[#A3A3A3]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="flex gap-1 overflow-x-auto mb-6 bg-white rounded border border-[#E5E5E5] p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'work'         && <WorkTab space={space} wsId={wsId} onRefresh={() => loadSpace(true)} onTaskClick={async (t) => {
              try {
                const data = await fetch(`/api/tasks/${t.id}`).then(r => r.json())
                setSelectedTask({ ...(data.task ?? t), workspaceId: wsId })
              } catch { setSelectedTask({ ...t, workspaceId: wsId }) }
              setIsTaskModalOpen(true)
            }} />}
          {activeTab === 'objectives'   && <ObjectivesTab space={space} wsId={wsId} onRefresh={() => loadSpace(true)} />}
          {activeTab === 'projects'     && <ProjectsTab space={space} wsId={wsId} onRefresh={() => loadSpace(true)} />}
          {activeTab === 'agents'       && <AgentsTab space={space} onSwitchToWork={() => setActiveTab('work')} onTaskClick={async (t) => {
              try {
                const data = await fetch(`/api/tasks/${t.id}`).then(r => r.json())
                setSelectedTask({ ...(data.task ?? t), workspaceId: wsId })
              } catch { setSelectedTask({ ...t, workspaceId: wsId }) }
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

      {/* Task Detail Modal */}
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
        workspaceId={wsId ?? ''}
        statuses={modalStatuses}
      />

    </div>
  )
}
