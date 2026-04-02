'use client'

import { useState } from 'react'
import { FaChevronDown, FaChevronRight, FaRobot } from 'react-icons/fa'

const AGENTS = ['harvey', 'theo', 'doug', 'casper']
const WAITING_ON = ['none', 'ben', 'harvey', 'theo', 'doug', 'casper', 'external']
const TASK_TYPES = ['strategy', 'research', 'build', 'ops', 'routine', 'admin', 'review', 'bug', 'briefing']

export interface AgentFieldValues {
  ownerAgent:       string | null
  reviewerAgent:    string | null
  handoffToAgent:   string | null
  requestedBy:      string | null
  taskType:         string | null
  decisionNeeded:   boolean
  decisionSummary:  string | null
  waitingOn:        string | null
  blockedReason:    string | null
  definitionOfDone: string | null
  nextAction:       string | null
}

interface Props {
  values: AgentFieldValues
  onChange: (values: AgentFieldValues) => void
}

function sel(label: string, value: string | null, options: string[], onChange: (v: string | null) => void, placeholder = 'unassigned') {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">{label}</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full px-3 py-2 text-[13px] rounded-md border border-[#E5E5E5] bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#DD3A44] min-h-[38px]"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o} className="capitalize">{o}</option>
        ))}
      </select>
    </div>
  )
}

function textarea(label: string, value: string | null, onChange: (v: string | null) => void, placeholder?: string) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">{label}</label>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 text-[13px] rounded-md border border-[#E5E5E5] bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#DD3A44] resize-none placeholder-[#C4C4C4]"
      />
    </div>
  )
}

export default function TaskAgentFields({ values, onChange }: Props) {
  // Auto-expand if any agent field is populated
  const hasAgentData = !!(
    values.ownerAgent || values.taskType || values.decisionNeeded ||
    values.waitingOn || values.blockedReason || values.definitionOfDone || values.nextAction
  )
  const [open, setOpen] = useState(hasAgentData)

  const set = (patch: Partial<AgentFieldValues>) => onChange({ ...values, ...patch })

  return (
    <div className="border border-[#E5E5E5] rounded overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F9F9F9] hover:bg-[#F3F3F3] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FaRobot size={12} className="text-[#737373]" />
          <span className="text-[13px] font-semibold text-[#525252]">Agent & Workflow</span>
          {hasAgentData && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD3A44]" />
          )}
        </div>
        {open ? <FaChevronDown size={11} className="text-[#A3A3A3]" /> : <FaChevronRight size={11} className="text-[#A3A3A3]" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">

          {/* Row 1: ownerAgent + taskType */}
          <div className="grid grid-cols-2 gap-3">
            {sel('Owner agent', values.ownerAgent, AGENTS, v => set({ ownerAgent: v }))}
            {sel('Task type', values.taskType, TASK_TYPES, v => set({ taskType: v }), 'unclassified')}
          </div>

          {/* Row 2: reviewerAgent + requestedBy */}
          <div className="grid grid-cols-2 gap-3">
            {sel('Reviewer', values.reviewerAgent, AGENTS, v => set({ reviewerAgent: v }))}
            {sel('Requested by', values.requestedBy, ['ben', ...AGENTS, 'system'], v => set({ requestedBy: v }))}
          </div>

          {/* Definition of done */}
          {textarea('Definition of done', values.definitionOfDone, v => set({ definitionOfDone: v }), 'What does "done" look like?')}

          {/* Next action */}
          <div>
            <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">Next action</label>
            <input
              type="text"
              value={values.nextAction ?? ''}
              onChange={e => set({ nextAction: e.target.value || null })}
              placeholder="Immediate next step…"
              className="w-full px-3 py-2 text-[13px] rounded-md border border-[#E5E5E5] bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#DD3A44] min-h-[38px] placeholder-[#C4C4C4]"
            />
          </div>

          {/* Row 3: waitingOn + handoffToAgent */}
          <div className="grid grid-cols-2 gap-3">
            {sel('Waiting on', values.waitingOn, WAITING_ON, v => set({ waitingOn: v }), 'nobody')}
            {sel('Handoff target', values.handoffToAgent, AGENTS, v => set({ handoffToAgent: v }))}
          </div>

          {/* Blocked reason — shown when waitingOn is set or blockedReason exists */}
          {(values.waitingOn && values.waitingOn !== 'none') || values.blockedReason ? (
            textarea('Blocked reason', values.blockedReason, v => set({ blockedReason: v }), 'What is blocking this task?')
          ) : null}

          {/* Decision needed toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[13px] font-medium text-[#1A1A1A]">Decision needed from Ben</p>
              <p className="text-[11px] text-[#A3A3A3]">Surfaces this in the founder decision inbox</p>
            </div>
            <button
              type="button"
              onClick={() => set({ decisionNeeded: !values.decisionNeeded, decisionSummary: values.decisionNeeded ? null : values.decisionSummary })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${values.decisionNeeded ? 'bg-[#DD3A44]' : 'bg-[#E5E5E5]'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${values.decisionNeeded ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Decision summary — shown when decisionNeeded */}
          {values.decisionNeeded && (
            textarea('Decision summary', values.decisionSummary, v => set({ decisionSummary: v }), 'What does Ben need to decide?')
          )}

        </div>
      )}
    </div>
  )
}
