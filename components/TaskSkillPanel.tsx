'use client'

import { useState, useEffect, useRef } from 'react'
import { FaChevronDown, FaChevronRight, FaTimes, FaSearch } from 'react-icons/fa'

interface Skill {
  id: string
  title: string
  category: string
  skillType: string
  description?: string
  steps?: Array<{ order: number; title: string; description: string; tips?: string[] }>
  qualityCriteria?: { good?: string[]; bad?: string[]; checkBefore?: string[] }
}

interface TaskSkillPanelProps {
  workspaceId: string
  skillId: string | null
  onSkillChange: (skillId: string | null) => void
  readOnly?: boolean
}

export default function TaskSkillPanel({
  workspaceId,
  skillId,
  onSkillChange,
  readOnly = false,
}: TaskSkillPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [linkedSkill, setLinkedSkill] = useState<Skill | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Load linked skill detail
  useEffect(() => {
    if (!skillId) { setLinkedSkill(null); return }
    fetch(`/api/skills/${skillId}`)
      .then(r => r.json())
      .then(d => setLinkedSkill(d.skill || null))
      .catch(() => setLinkedSkill(null))
  }, [skillId])

  // Load skills list when picker opens
  useEffect(() => {
    if (!pickerOpen) return
    setLoading(true)
    fetch(`/api/skills?workspaceId=${workspaceId}&status=active&limit=100`)
      .then(r => r.json())
      .then(d => setSkills(d.skills || []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false))
  }, [pickerOpen, workspaceId])

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setSearch('')
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const filtered = skills.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const steps = linkedSkill?.steps || []
  const criteria = linkedSkill?.qualityCriteria || {}

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
          Linked Skill
        </label>
        {!readOnly && (
          <button
            onClick={() => setPickerOpen(true)}
            className="text-[11px] text-[#474747] hover:text-[#1A1C1C] underline underline-offset-2"
          >
            {skillId ? 'Change' : '+ Link skill'}
          </button>
        )}
      </div>

      {/* Skill picker dropdown */}
      {pickerOpen && (
        <div ref={pickerRef} className="relative z-20">
          <div className="absolute top-0 left-0 right-0 bg-white border border-[#C6C6C6] rounded shadow-[0_8px_24px_rgba(0,0,0,0.08)] max-h-72 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E8E8E8]">
              <FaSearch className="text-[#A3A3A3] text-[10px] shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search skills…"
                className="flex-1 text-sm outline-none text-[#1A1C1C] placeholder:text-[#A3A3A3]"
              />
            </div>
            <div className="overflow-y-auto">
              {loading && (
                <div className="px-3 py-3 text-sm text-[#A3A3A3]">Loading…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-[#A3A3A3]">No skills found</div>
              )}
              {!loading && filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onSkillChange(s.id); setPickerOpen(false); setSearch('') }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F3F3F3] flex items-center justify-between group"
                >
                  <span className="text-sm text-[#1A1C1C] font-medium">{s.title}</span>
                  <span className="text-[10px] text-[#A3A3A3] ml-2 shrink-0">{s.category}</span>
                </button>
              ))}
              {skillId && (
                <button
                  onClick={() => { onSkillChange(null); setPickerOpen(false); setSearch('') }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-sm text-red-500 border-t border-[#E8E8E8] flex items-center gap-2"
                >
                  <FaTimes className="text-[10px]" /> Remove skill link
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No skill linked */}
      {!skillId && (
        <div className="text-sm text-[#A3A3A3] italic">No skill linked — evaluation not required at Review.</div>
      )}

      {/* Skill linked — compact card */}
      {skillId && linkedSkill && (
        <div className="border border-[#C6C6C6] rounded" style={{ borderRadius: 4 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F9F9F9] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1A1C1C]">{linkedSkill.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#F3F3F3] text-[#474747] rounded" style={{ borderRadius: 2 }}>
                {linkedSkill.category}
              </span>
              <span className="text-[10px] text-[#A3A3A3]">{steps.length} steps</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" style={{ borderRadius: 2 }}>
                Evaluation required at Review
              </span>
              {expanded ? (
                <FaChevronDown className="text-[#A3A3A3] text-[10px]" />
              ) : (
                <FaChevronRight className="text-[#A3A3A3] text-[10px]" />
              )}
            </div>
          </button>

          {expanded && (
            <div className="border-t border-[#E8E8E8] px-3 py-3 space-y-3">
              {linkedSkill.description && (
                <p className="text-sm text-[#474747]">{linkedSkill.description}</p>
              )}

              {steps.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Steps</p>
                  <ol className="space-y-1.5">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[11px] font-semibold text-[#A3A3A3] w-4 shrink-0 pt-0.5">{step.order ?? i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-[#1A1C1C]">{step.title}</p>
                          {step.description && <p className="text-xs text-[#474747] mt-0.5">{step.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {criteria.good && criteria.good.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Quality Criteria</p>
                  <ul className="space-y-1">
                    {criteria.good.map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-[#474747]">
                        <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {criteria.checkBefore && criteria.checkBefore.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Check Before Review</p>
                  <ul className="space-y-1">
                    {criteria.checkBefore.map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-[#474747]">
                        <span className="text-amber-500 mt-0.5 shrink-0">□</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Skill linked but still loading */}
      {skillId && !linkedSkill && (
        <div className="border border-[#C6C6C6] rounded px-3 py-2 text-sm text-[#A3A3A3]" style={{ borderRadius: 4 }}>
          Loading skill…
        </div>
      )}
    </div>
  )
}
