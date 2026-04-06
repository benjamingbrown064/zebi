'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/use-workspace'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillStep {
  order: number
  title: string
  description: string
  tips?: string
}

interface QualityCriteria {
  good: string[]
  bad: string[]
  checkBefore: string[]
}

interface Skill {
  id: string
  title: string
  description: string | null
  category: string
  skillType: string
  tags: string[]
  steps: SkillStep[]
  qualityCriteria: QualityCriteria
  examples?: { good: string[]; bad: string[] } | null
  status: string
  version: number
  createdBy: string | null
  lastUpdatedBy: string | null
  createdAt: string
  updatedAt: string
  _count?: { tasks: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'research',   label: 'Research',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'outreach',   label: 'Outreach',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'content',    label: 'Content',        color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'scraping',   label: 'Scraping',       color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'mailer',     label: 'Mailer',         color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'lead-gen',   label: 'Lead Gen',       color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'build',      label: 'Build',          color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'ops',        label: 'Ops',            color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { value: 'other',      label: 'Other',          color: 'bg-[#F3F3F3] text-[#474747] border-[#C6C6C6]' },
]

const SKILL_TYPES = ['procedure', 'checklist', 'template', 'sop']

function categoryBadge(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? 'bg-[#F3F3F3] text-[#474747] border-[#C6C6C6]'
}

function categoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

// ─── Blank forms ─────────────────────────────────────────────────────────────

const BLANK_SKILL = {
  title: '',
  description: '',
  category: 'research',
  skillType: 'procedure',
  tags: '',
  steps: [{ order: 1, title: '', description: '', tips: '' }],
  qualityCriteria: {
    good: [''],
    bad: [''],
    checkBefore: [''],
  },
  examples: { good: [''], bad: [''] },
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function SkillModal({
  skill,
  onClose,
  onSave,
  mode,
}: {
  skill?: Skill | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
  mode: 'create' | 'edit'
}) {
  const [form, setForm] = useState(() => {
    if (skill) {
      return {
        title:       skill.title,
        description: skill.description ?? '',
        category:    skill.category,
        skillType:   skill.skillType,
        tags:        skill.tags.join(', '),
        steps:       skill.steps.length > 0 ? skill.steps : BLANK_SKILL.steps,
        qualityCriteria: {
          good:        skill.qualityCriteria.good.length > 0 ? skill.qualityCriteria.good : [''],
          bad:         skill.qualityCriteria.bad.length > 0 ? skill.qualityCriteria.bad : [''],
          checkBefore: skill.qualityCriteria.checkBefore.length > 0 ? skill.qualityCriteria.checkBefore : [''],
        },
        examples: skill.examples ?? { good: [''], bad: [''] },
      }
    }
    return { ...BLANK_SKILL }
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'basics' | 'steps' | 'quality' | 'examples'>('basics')

  const updateStep = (i: number, field: string, value: string) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }))
  }

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, { order: f.steps.length + 1, title: '', description: '', tips: '' }],
    }))
  }

  const removeStep = (i: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })),
    }))
  }

  const updateCriteria = (group: 'good' | 'bad' | 'checkBefore', i: number, value: string) => {
    setForm(f => ({
      ...f,
      qualityCriteria: {
        ...f.qualityCriteria,
        [group]: f.qualityCriteria[group].map((v: string, idx: number) => idx === i ? value : v),
      },
    }))
  }

  const addCriteria = (group: 'good' | 'bad' | 'checkBefore') => {
    setForm(f => ({
      ...f,
      qualityCriteria: {
        ...f.qualityCriteria,
        [group]: [...f.qualityCriteria[group], ''],
      },
    }))
  }

  const removeCriteria = (group: 'good' | 'bad' | 'checkBefore', i: number) => {
    setForm(f => ({
      ...f,
      qualityCriteria: {
        ...f.qualityCriteria,
        [group]: f.qualityCriteria[group].filter((_: string, idx: number) => idx !== i),
      },
    }))
  }

  const updateExample = (group: 'good' | 'bad', i: number, value: string) => {
    setForm(f => ({
      ...f,
      examples: {
        ...f.examples,
        [group]: (f.examples as any)[group].map((v: string, idx: number) => idx === i ? value : v),
      },
    }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.category) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        steps: form.steps.filter((s: any) => s.title.trim()),
        qualityCriteria: {
          good:        form.qualityCriteria.good.filter((v: string) => v.trim()),
          bad:         form.qualityCriteria.bad.filter((v: string) => v.trim()),
          checkBefore: form.qualityCriteria.checkBefore.filter((v: string) => v.trim()),
        },
        examples: {
          good: form.examples.good.filter((v: string) => v.trim()),
          bad:  form.examples.bad.filter((v: string) => v.trim()),
        },
      })
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'basics',  label: 'Basics' },
    { id: 'steps',   label: `Steps (${form.steps.length})` },
    { id: 'quality', label: 'Quality' },
    { id: 'examples', label: 'Examples' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C6C6C6]">
          <h2 className="text-[15px] font-semibold text-[#1A1C1C]">
            {mode === 'create' ? 'New Skill' : 'Edit Skill'}
          </h2>
          <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C] text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#C6C6C6] px-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1A1C1C] text-[#1A1C1C]'
                  : 'border-transparent text-[#474747] hover:text-[#1A1C1C]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#474747] mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Market Research — Qualifying a New Project"
                  className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#474747] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="What does this skill cover? When should an agent use it?"
                  className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#474747] mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#474747] mb-1">Type</label>
                  <select
                    value={form.skillType}
                    onChange={e => setForm(f => ({ ...f, skillType: e.target.value }))}
                    className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] bg-white"
                  >
                    {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#474747] mb-1">Tags (comma separated)</label>
                <input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. research, qualifying, saas"
                  className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]"
                />
              </div>
            </div>
          )}

          {/* STEPS */}
          {activeTab === 'steps' && (
            <div className="space-y-3">
              <p className="text-[12px] text-[#474747]">Define each step the agent must follow, in order.</p>
              {form.steps.map((step: SkillStep, i: number) => (
                <div key={i} className="border border-[#C6C6C6] rounded-[4px] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#1A1C1C]">Step {i + 1}</span>
                    {form.steps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-[11px] text-[#474747] hover:text-red-600">Remove</button>
                    )}
                  </div>
                  <input
                    value={step.title}
                    onChange={e => updateStep(i, 'title', e.target.value)}
                    placeholder="Step title"
                    className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]"
                  />
                  <textarea
                    value={step.description}
                    onChange={e => updateStep(i, 'description', e.target.value)}
                    rows={2}
                    placeholder="What exactly should the agent do in this step?"
                    className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] resize-none"
                  />
                  <input
                    value={step.tips ?? ''}
                    onChange={e => updateStep(i, 'tips', e.target.value)}
                    placeholder="Tips / watch-outs (optional)"
                    className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[12px] text-[#474747] focus:outline-none focus:border-[#1A1C1C]"
                  />
                </div>
              ))}
              <button
                onClick={addStep}
                className="w-full border border-dashed border-[#C6C6C6] rounded-[4px] py-2 text-[12px] text-[#474747] hover:border-[#1A1C1C] hover:text-[#1A1C1C] transition-colors"
              >
                + Add step
              </button>
            </div>
          )}

          {/* QUALITY CRITERIA */}
          {activeTab === 'quality' && (
            <div className="space-y-5">
              <p className="text-[12px] text-[#474747]">Define what good looks like, what bad looks like, and what to check before calling it done.</p>
              {(['good', 'bad', 'checkBefore'] as const).map(group => (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${group === 'good' ? 'bg-green-500' : group === 'bad' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <label className="text-[12px] font-semibold text-[#1A1C1C]">
                      {group === 'good' ? '✅ What good looks like' : group === 'bad' ? '❌ What bad looks like' : '🔍 Check before done'}
                    </label>
                  </div>
                  <div className="space-y-2">
                    {form.qualityCriteria[group].map((v: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={v}
                          onChange={e => updateCriteria(group, i, e.target.value)}
                          placeholder={group === 'good' ? 'e.g. At least 5 credible sources cited' : group === 'bad' ? 'e.g. Only one source used' : 'e.g. Sources are from the last 12 months'}
                          className="flex-1 border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C]"
                        />
                        {form.qualityCriteria[group].length > 1 && (
                          <button onClick={() => removeCriteria(group, i)} className="text-[#474747] hover:text-red-600 px-2 text-sm">✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addCriteria(group)} className="text-[12px] text-[#474747] hover:text-[#1A1C1C]">+ Add</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EXAMPLES */}
          {activeTab === 'examples' && (
            <div className="space-y-5">
              <p className="text-[12px] text-[#474747]">Optional: give concrete good/bad examples to make the quality bar tangible.</p>
              {(['good', 'bad'] as const).map(group => (
                <div key={group}>
                  <label className="block text-[12px] font-semibold text-[#1A1C1C] mb-2">
                    {group === 'good' ? '✅ Good examples' : '❌ Bad examples'}
                  </label>
                  <div className="space-y-2">
                    {(form.examples as any)[group].map((v: string, i: number) => (
                      <textarea
                        key={i}
                        value={v}
                        onChange={e => updateExample(group, i, e.target.value)}
                        rows={2}
                        placeholder={group === 'good' ? 'Describe a good output...' : 'Describe a bad output...'}
                        className="w-full border border-[#C6C6C6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#1A1C1C] resize-none"
                      />
                    ))}
                    <button
                      onClick={() => setForm(f => ({ ...f, examples: { ...f.examples, [group]: [...(f.examples as any)[group], ''] } }))}
                      className="text-[12px] text-[#474747] hover:text-[#1A1C1C]"
                    >
                      + Add example
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#C6C6C6]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-[#474747] border border-[#C6C6C6] rounded-[4px] hover:bg-[#F3F3F3]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim()}
            className="px-4 py-2 text-[13px] font-medium bg-[#1A1C1C] text-white rounded-[4px] hover:bg-[#333] disabled:opacity-40"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create Skill' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function SkillDetail({ skill, onEdit, onClose }: { skill: Skill; onEdit: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[4px] shadow-[0px_20px_40px_rgba(0,0,0,0.12)] w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#C6C6C6]">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] border ${categoryBadge(skill.category)}`}>
                {categoryLabel(skill.category)}
              </span>
              <span className="text-[11px] text-[#474747] border border-[#C6C6C6] px-2 py-0.5 rounded-[4px]">
                {skill.skillType}
              </span>
              <span className="text-[11px] text-[#474747]">v{skill.version}</span>
            </div>
            <h2 className="text-[16px] font-semibold text-[#1A1C1C] leading-tight">{skill.title}</h2>
            {skill.description && <p className="text-[13px] text-[#474747] mt-1">{skill.description}</p>}
            {skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skill.tags.map(tag => (
                  <span key={tag} className="text-[11px] bg-[#F3F3F3] text-[#474747] px-2 py-0.5 rounded-[4px]">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit} className="text-[12px] text-[#474747] border border-[#C6C6C6] rounded-[4px] px-3 py-1.5 hover:bg-[#F3F3F3]">Edit</button>
            <button onClick={onClose} className="text-[#474747] hover:text-[#1A1C1C] text-lg">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Steps */}
          {skill.steps.length > 0 && (
            <div>
              <h3 className="text-[12px] font-semibold text-[#1A1C1C] uppercase tracking-wide mb-3">Steps</h3>
              <div className="space-y-3">
                {skill.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1C1C] text-white flex items-center justify-center text-[11px] font-semibold mt-0.5">
                      {step.order}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1A1C1C]">{step.title}</p>
                      <p className="text-[13px] text-[#474747] mt-0.5">{step.description}</p>
                      {step.tips && <p className="text-[12px] text-[#474747] italic mt-1">💡 {step.tips}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Criteria */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#1A1C1C] uppercase tracking-wide mb-3">Quality Criteria</h3>
            <div className="space-y-4">
              {skill.qualityCriteria.good.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium text-green-700 mb-1">✅ What good looks like</p>
                  <ul className="space-y-1">
                    {skill.qualityCriteria.good.map((item, i) => (
                      <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-green-500 shrink-0">•</span>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {skill.qualityCriteria.bad.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium text-red-700 mb-1">❌ What bad looks like</p>
                  <ul className="space-y-1">
                    {skill.qualityCriteria.bad.map((item, i) => (
                      <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-red-500 shrink-0">•</span>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {skill.qualityCriteria.checkBefore.length > 0 && (
                <div>
                  <p className="text-[12px] font-medium text-blue-700 mb-1">🔍 Check before done</p>
                  <ul className="space-y-1">
                    {skill.qualityCriteria.checkBefore.map((item, i) => (
                      <li key={i} className="text-[13px] text-[#474747] flex gap-2"><span className="text-blue-500 shrink-0">•</span>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Examples */}
          {skill.examples && (skill.examples.good.length > 0 || skill.examples.bad.length > 0) && (
            <div>
              <h3 className="text-[12px] font-semibold text-[#1A1C1C] uppercase tracking-wide mb-3">Examples</h3>
              <div className="space-y-3">
                {skill.examples.good.map((ex, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-[4px] p-3">
                    <p className="text-[11px] font-semibold text-green-700 mb-1">✅ Good</p>
                    <p className="text-[13px] text-[#474747]">{ex}</p>
                  </div>
                ))}
                {skill.examples.bad.map((ex, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-[4px] p-3">
                    <p className="text-[11px] font-semibold text-red-700 mb-1">❌ Bad</p>
                    <p className="text-[13px] text-[#474747]">{ex}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [editSkill, setEditSkill] = useState<Skill | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!workspaceLoading && workspaceId) loadSkills()
  }, [workspaceId, workspaceLoading, filterCat])

  const loadSkills = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ workspaceId, status: 'all' })
      if (filterCat !== 'all') params.set('category', filterCat)
      const res = await fetch(`/api/skills?${params}`)
      const data = await res.json()
      setSkills(data.skills ?? [])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (form: any) => {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, workspaceId }),
    })
    if (res.ok) {
      setShowCreate(false)
      loadSkills()
    }
  }

  const handleEdit = async (form: any) => {
    if (!editSkill) return
    const res = await fetch(`/api/skills/${editSkill.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setEditSkill(null)
      setSelectedSkill(null)
      loadSkills()
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this skill?')) return
    await fetch(`/api/skills/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) })
    setSelectedSkill(null)
    loadSkills()
  }

  const filtered = skills.filter(s =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(s => s.category === cat.value)
    if (items.length > 0) acc[cat.value] = items
    return acc
  }, {} as Record<string, Skill[]>)

  const totalActive = skills.filter(s => s.status === 'active').length
  const totalDraft  = skills.filter(s => s.status === 'draft').length

  return (
    <div className="flex h-screen bg-[#F9F9F9]">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#C6C6C6] px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-[#1A1C1C]">Skills</h1>
              <p className="text-[13px] text-[#474747] mt-0.5">
                Playbooks and procedures your agents follow to the letter
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#1A1C1C] text-white text-[13px] font-medium px-4 py-2 rounded-[4px] hover:bg-[#333] transition-colors"
            >
              <span className="text-base leading-none">+</span> New Skill
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#1A1C1C]">{totalActive}</p>
              <p className="text-[11px] text-[#474747]">Active</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#1A1C1C]">{totalDraft}</p>
              <p className="text-[11px] text-[#474747]">Draft</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#1A1C1C]">{CATEGORIES.filter(c => grouped[c.value]).length}</p>
              <p className="text-[11px] text-[#474747]">Categories</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-[#C6C6C6] px-8 py-3 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills…"
              className="w-full border border-[#C6C6C6] rounded-[4px] pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-[#1A1C1C]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C6C6C6] text-sm">🔍</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterCat('all')}
              className={`text-[12px] px-3 py-1.5 rounded-[4px] border whitespace-nowrap transition-colors ${
                filterCat === 'all'
                  ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                  : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setFilterCat(cat.value)}
                className={`text-[12px] px-3 py-1.5 rounded-[4px] border whitespace-nowrap transition-colors ${
                  filterCat === cat.value
                    ? 'bg-[#1A1C1C] text-white border-[#1A1C1C]'
                    : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#C6C6C6] border-t-[#1A1C1C] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[32px] mb-3">📖</p>
              <p className="text-[15px] font-medium text-[#1A1C1C] mb-1">No skills yet</p>
              <p className="text-[13px] text-[#474747] mb-4">Create your first skill so your agents know exactly how to do things</p>
              <button
                onClick={() => setShowCreate(true)}
                className="bg-[#1A1C1C] text-white text-[13px] px-4 py-2 rounded-[4px] hover:bg-[#333]"
              >
                New Skill
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {CATEGORIES.filter(cat => grouped[cat.value]).map(cat => (
                <div key={cat.value}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] border ${cat.color}`}>{cat.label}</span>
                    <span className="text-[12px] text-[#474747]">{grouped[cat.value].length} skill{grouped[cat.value].length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {grouped[cat.value].map(skill => (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
                        className="bg-white border border-[#C6C6C6] rounded-[4px] p-4 cursor-pointer hover:border-[#1A1C1C] hover:shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] font-medium text-[#1A1C1C] leading-snug flex-1">{skill.title}</p>
                          {skill.status === 'draft' && (
                            <span className="text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-[4px] shrink-0">Draft</span>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-[12px] text-[#474747] mt-1 line-clamp-2">{skill.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-[#474747]">
                          <span className="border border-[#C6C6C6] px-1.5 py-0.5 rounded-[4px]">{skill.skillType}</span>
                          <span>v{skill.version}</span>
                          {skill._count?.tasks ? <span>{skill._count.tasks} task{skill._count.tasks !== 1 ? 's' : ''}</span> : null}
                        </div>
                        {skill.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {skill.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] bg-[#F3F3F3] text-[#474747] px-1.5 py-0.5 rounded-[4px]">{tag}</span>
                            ))}
                            {skill.tags.length > 3 && <span className="text-[10px] text-[#474747]">+{skill.tags.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <SkillModal mode="create" onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editSkill && (
        <SkillModal mode="edit" skill={editSkill} onClose={() => setEditSkill(null)} onSave={handleEdit} />
      )}
      {selectedSkill && !editSkill && (
        <SkillDetail
          skill={selectedSkill}
          onEdit={() => { setEditSkill(selectedSkill); setSelectedSkill(null) }}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  )
}
