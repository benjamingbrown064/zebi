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
}

const STAGES = ['idea', 'startup', 'growth', 'mature']
const BUSINESS_MODELS = ['SaaS', 'Marketplace', 'E-commerce', 'Consulting', 'Product', 'Other']

export default function SpaceForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = 'Create Space',
  isLoading = false,
}: SpaceFormProps) {
  const [formData, setFormData] = useState<SpaceFormData>({
    name: initialData.name || '',
    industry: initialData.industry || '',
    stage: initialData.stage || 'startup',
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
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1c1b1b]">Basic Information</h3>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Space Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Love Warranty"
            required
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              placeholder="e.g., SaaS, E-commerce"
              className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
              Stage
            </label>
            <select
              value={formData.stage}
              onChange={(e) => updateField('stage', e.target.value)}
              className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
              Business Model
            </label>
            <select
              value={formData.businessModel}
              onChange={(e) => updateField('businessModel', e.target.value)}
              className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
            >
              <option value="">Select...</option>
              {BUSINESS_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
              Monthly Revenue (£)
            </label>
            <input
              type="number"
              value={formData.revenue}
              onChange={(e) => updateField('revenue', e.target.value)}
              placeholder="0"
              className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => updateField('websiteUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
            />
          </div>
        </div>
      </div>

      {/* Strategy */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1c1b1b]">Strategy</h3>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Mission Statement
          </label>
          <input
            type="text"
            value={formData.missionStatement}
            onChange={(e) => updateField('missionStatement', e.target.value)}
            placeholder="What's the space's mission?"
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Executive Summary
          </label>
          <textarea
            value={formData.executiveSummary}
            onChange={(e) => updateField('executiveSummary', e.target.value)}
            placeholder="Brief overview of the space..."
            rows={3}
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Vision
          </label>
          <textarea
            value={formData.vision}
            onChange={(e) => updateField('vision', e.target.value)}
            placeholder="Long-term vision..."
            rows={2}
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>
      </div>

      {/* Market */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1c1b1b]">Market</h3>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Target Customers
          </label>
          <textarea
            value={formData.targetCustomers}
            onChange={(e) => updateField('targetCustomers', e.target.value)}
            placeholder="Who are the ideal customers?"
            rows={2}
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Market Size
          </label>
          <input
            type="text"
            value={formData.marketSize}
            onChange={(e) => updateField('marketSize', e.target.value)}
            placeholder="e.g., £500M TAM"
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>
      </div>

      {/* Product */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[#1c1b1b]">Product</h3>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Core Product
          </label>
          <textarea
            value={formData.coreProduct}
            onChange={(e) => updateField('coreProduct', e.target.value)}
            placeholder="What does the product do?"
            rows={2}
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5a5757] uppercase mb-2">
            Positioning
          </label>
          <textarea
            value={formData.positioning}
            onChange={(e) => updateField('positioning', e.target.value)}
            placeholder="How do you position vs competitors?"
            rows={2}
            className="w-full px-4 py-2 rounded-[10px] focus:focus-ring"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-[#f0eded] text-[#1c1b1b] rounded-[10px] hover:bg-[#e8e4e4] transition font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.name}
          className="flex-1 px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] transition font-medium disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
