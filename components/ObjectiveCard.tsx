'use client'

import Link from 'next/link'

interface ObjectiveCardProps {
  id: string
  title: string
  spaceName?: string
  companyId?: string
  currentValue: number
  targetValue: number
  unit?: string
  deadline: Date
  status: string
  progressPercent: number
  quarter?: string
  nextMilestone?: {
    title: string
    targetDate: Date
    daysUntil: number
  }
  aiWork?: string
  humanWork?: string
  activeBlockers?: number
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; filled: boolean }> = {
  on_track:  { label: 'ON TRACK',  filled: false },
  at_risk:   { label: 'AT RISK',   filled: true  },
  blocked:   { label: 'BLOCKED',   filled: false },
  completed: { label: 'COMPLETED', filled: false },
  active:    { label: 'ACTIVE',    filled: false },
  draft:     { label: 'DRAFT',     filled: false },
  paused:    { label: 'PAUSED',    filled: false },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status.toUpperCase(), filled: false }
  if (cfg.filled) {
    return (
      <span className="inline-block px-2.5 py-1 bg-[#1A1C1C] text-white text-[10px] font-bold tracking-[0.1em] rounded-[2px]">
        {cfg.label}
      </span>
    )
  }
  return (
    <span className="inline-block px-2.5 py-1 border border-[#1A1C1C] text-[#1A1C1C] text-[10px] font-bold tracking-[0.1em] rounded-[2px]">
      {cfg.label}
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-[3px] bg-[#E8E8E8] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#1A1C1C] rounded-full transition-all duration-300"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(date: Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase()
}

function formatTarget(value: number, unit?: string) {
  if (!unit || unit === 'percent') return `${value}%`
  if (unit === 'GBP') return `£${(value / 1000).toFixed(1)}M REV`
  return value.toLocaleString()
}

function guessQuarter(deadline: Date): string {
  const d = new Date(deadline)
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `Q${q} ${d.getFullYear()}`
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export default function ObjectiveCard({
  id,
  title,
  currentValue,
  targetValue,
  unit,
  deadline,
  status,
  progressPercent,
  quarter,
}: ObjectiveCardProps) {
  const pct = Math.round(Math.min(Math.max(progressPercent, 0), 100))
  const displayQuarter = quarter ?? guessQuarter(new Date(deadline))

  return (
    <Link href={`/objectives/${id}`} className="block group">
      <div
        className="bg-white border border-[#E5E5E5] rounded p-6 h-full flex flex-col transition-shadow group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] cursor-pointer"
        style={{ minHeight: 240 }}
      >
        {/* ── Row 1: badge + quarter ── */}
        <div className="flex items-start justify-between mb-5">
          <StatusBadge status={status} />
          <span className="text-[11px] font-semibold text-[#A3A3A3] tracking-[0.06em]">
            {displayQuarter}
          </span>
        </div>

        {/* ── Title ── */}
        <h3 className="text-[20px] font-bold leading-[1.25] text-[#1A1C1C] mb-6 flex-1">
          {title}
        </h3>

        {/* ── Progress ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#474747]">
              Progress
            </span>
            <span className="text-[13px] font-semibold text-[#1A1C1C]">{pct}%</span>
          </div>
          <ProgressBar pct={pct} />
        </div>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Bottom meta: deadline + target ── */}
        <div className="flex items-start justify-between pt-4 border-t border-[#F3F3F3]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">
              Deadline
            </p>
            <p className="text-[13px] font-bold text-[#1A1C1C]">
              {formatDeadline(new Date(deadline))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">
              Target
            </p>
            <p className="text-[13px] font-bold text-[#1A1C1C]">
              {formatTarget(targetValue, unit)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Create placeholder card ──────────────────────────────────────────────────

export function CreateObjectiveCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[240px] bg-white border border-dashed border-[#C6C6C6] rounded p-6 flex flex-col items-center justify-center gap-3 hover:border-[#1A1C1C] hover:bg-[#FAFAFA] transition-all group"
    >
      <div className="w-10 h-10 rounded-full border-2 border-[#C6C6C6] group-hover:border-[#1A1C1C] flex items-center justify-center transition-colors">
        <svg className="w-5 h-5 text-[#C6C6C6] group-hover:text-[#1A1C1C] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div>
        <p className="text-[15px] font-bold text-[#474747] group-hover:text-[#1A1C1C] transition-colors">
          Create Objective
        </p>
        <p className="text-[12px] text-[#A3A3A3] mt-0.5">
          Define new institutional target
        </p>
      </div>
    </button>
  )
}
