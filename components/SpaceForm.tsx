'use client'

import { useState } from 'react'

interface SpaceFormData {
  name: string
  industry: string
  stage: string
  businessModel: string
  missionStatement: string
  executiveSummary: string
  vision: string
  targetCustomers: string
  marketSize: string
  coreProduct: string
  positioning: string
  logoUrl: string
  websiteUrl: string
  revenue: string
}

interface SpaceFormProps {
  initialData?: Partial<SpaceFormData>
  onSubmit: (data: SpaceFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  isLoading?: boolean
  /** If true, hides the action buttons (use when parent renders its own footer) */
  hideActions?: boolean
  /** Expose form data externally for parent-controlled submit */
  formRef?: React.MutableRefObject<SpaceFormData | null>
  onFormChange?: (data: SpaceFormData) => void
}

const STAGES = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'startup', label: 'Startup' },
  { value: 'series-a', label: 'Series A' },
  { value: 'growth', label: 'Growth' },
  { value: 'mature', label: 'Mature' },
]

// ─── Underline input components ───────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#474747] mb-2">
      {children}
    </label>
  )
}

const inputBase =
  'w-full bg-transparent border-0 border-b border-[#C6C6C6] focus:border-[#1A1C1C] outline-none pb-2 text-[14px] text-[#1A1C1C] placeholder-[#C6C6C6] transition-colors'

const selectBase =
  'w-full bg-transparent border-0 border-b border-[#C6C6C6] focus:border-[#1A1C1C] outline-none pb-2 text-[14px] text-[#1A1C1C] appearance-none cursor-pointer transition-colors pr-6'

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {/* Custom chevron */}
      <svg
        className="absolute right-0 bottom-3 w-4 h-4 text-[#A3A3A3] pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[18px] font-bold text-[#1A1C1C] mb-6">{children}</h3>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function SpaceForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = 'Create',
  isLoading = false,
  hideActions = false,
  onFormChange,
}: SpaceFormProps) {
  const [formData, setFormData] = useState<SpaceFormData>({
    name: initialData.name || '',
    industry: initialData.industry || '',
    stage: initialData.stage || 'pre-seed',
    businessModel: initialData.businessModel || '',
    missionStatement: initialData.missionStatement || '',
    executiveSummary: initialData.executiveSummary || '',
    vision: initialData.vision || '',
    targetCustomers: initialData.targetCustomers || '',
    marketSize: initialData.marketSize || '',
    coreProduct: initialData.coreProduct || '',
    positioning: initialData.positioning || '',
    logoUrl: initialData.logoUrl || '',
    websiteUrl: initialData.websiteUrl || '',
    revenue: initialData.revenue || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const updateField = (field: keyof SpaceFormData, value: string) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    onFormChange?.(next)
  }

  return (
    <form id="space-form" onSubmit={handleSubmit} className="space-y-10">

      {/* ── Basic Information ── */}
      <section>
        <SectionHeader>Basic Information</SectionHeader>

        <div className="grid grid-cols-2 gap-x-8 gap-y-8">
          {/* Space Name */}
          <div>
            <FieldLabel>Space Name</FieldLabel>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter entity name..."
              required
              className={inputBase}
            />
          </div>

          {/* Industry */}
          <div>
            <FieldLabel>Industry</FieldLabel>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              placeholder="e.g. Quantitative Finance"
              className={inputBase}
            />
          </div>

          {/* Stage */}
          <div>
            <FieldLabel>Stage</FieldLabel>
            <SelectWrapper>
              <select
                value={formData.stage}
                onChange={(e) => updateField('stage', e.target.value)}
                className={selectBase}
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </SelectWrapper>
          </div>

          {/* Business Model */}
          <div>
            <FieldLabel>Business Model</FieldLabel>
            <input
              type="text"
              value={formData.businessModel}
              onChange={(e) => updateField('businessModel', e.target.value)}
              placeholder="e.g. SaaS / B2B"
              className={inputBase}
            />
          </div>

          {/* Revenue */}
          <div>
            <FieldLabel>Current Revenue (Annual)</FieldLabel>
            <input
              type="number"
              value={formData.revenue}
              onChange={(e) => updateField('revenue', e.target.value)}
              placeholder="USD 0.00"
              className={inputBase}
            />
          </div>

          {/* Website URL */}
          <div>
            <FieldLabel>Website URL</FieldLabel>
            <input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => updateField('websiteUrl', e.target.value)}
              placeholder="https://..."
              className={inputBase}
            />
          </div>
        </div>
      </section>

      {/* ── Strategy ── */}
      <section>
        <SectionHeader>Strategy</SectionHeader>

        <div className="space-y-8">
          {/* Mission Statement */}
          <div>
            <FieldLabel>Mission Statement</FieldLabel>
            <textarea
              value={formData.missionStatement}
              onChange={(e) => updateField('missionStatement', e.target.value)}
              placeholder="Define the core purpose of this space..."
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>

          {/* Executive Summary */}
          <div>
            <FieldLabel>Executive Summary</FieldLabel>
            <textarea
              value={formData.executiveSummary}
              onChange={(e) => updateField('executiveSummary', e.target.value)}
              placeholder="Brief overview of the space..."
              rows={3}
              className={`${inputBase} resize-none`}
            />
          </div>

          {/* Vision */}
          <div>
            <FieldLabel>Vision</FieldLabel>
            <textarea
              value={formData.vision}
              onChange={(e) => updateField('vision', e.target.value)}
              placeholder="Long-term vision..."
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* ── Market ── */}
      <section>
        <SectionHeader>Market</SectionHeader>

        <div className="space-y-8">
          <div>
            <FieldLabel>Target Customers</FieldLabel>
            <textarea
              value={formData.targetCustomers}
              onChange={(e) => updateField('targetCustomers', e.target.value)}
              placeholder="Who are the ideal customers?"
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>

          <div>
            <FieldLabel>Market Size</FieldLabel>
            <input
              type="text"
              value={formData.marketSize}
              onChange={(e) => updateField('marketSize', e.target.value)}
              placeholder="e.g. £500M TAM"
              className={inputBase}
            />
          </div>
        </div>
      </section>

      {/* ── Product ── */}
      <section>
        <SectionHeader>Product</SectionHeader>

        <div className="space-y-8">
          <div>
            <FieldLabel>Core Product</FieldLabel>
            <textarea
              value={formData.coreProduct}
              onChange={(e) => updateField('coreProduct', e.target.value)}
              placeholder="What does the product do?"
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>

          <div>
            <FieldLabel>Positioning</FieldLabel>
            <textarea
              value={formData.positioning}
              onChange={(e) => updateField('positioning', e.target.value)}
              placeholder="How do you position vs competitors?"
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>

          <div>
            <FieldLabel>Logo URL</FieldLabel>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              placeholder="https://..."
              className={inputBase}
            />
          </div>
        </div>
      </section>

      {/* ── Standalone actions (only shown when not using modal footer) ── */}
      {!hideActions && (
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-[#F3F3F3] text-[#1A1C1C] rounded hover:bg-[#E5E5E5] transition font-medium text-[14px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.name}
            className="flex-1 px-5 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded transition font-medium text-[14px] disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : submitLabel}
          </button>
        </div>
      )}

    </form>
  )
}
