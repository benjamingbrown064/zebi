'use client'

import { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'

interface ObjectiveFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (objective: ObjectiveInput) => Promise<void>
  workspaceId: string
  companies?: Array<{ id: string; name: string }>
  goals?: Array<{ id: string; name: string }>
  initialData?: Partial<ObjectiveInput>
}

interface ObjectiveInput {
  title: string
  description?: string
  companyId?: string
  goalId?: string
  objectiveType: string
  metricType: string
  targetValue: number
  unit?: string
  startDate: string
  deadline: string
  priority: number
}

export default function ObjectiveForm({
  isOpen,
  onClose,
  onSave,
  workspaceId,
  companies = [],
  goals = [],
  initialData,
}: ObjectiveFormProps) {
  console.log('[ObjectiveForm] Received props:', { 
    companiesCount: companies.length, 
    goalsCount: goals.length,
    companies,
    goals 
  })

  const [formData, setFormData] = useState<ObjectiveInput>({
    title: '',
    description: '',
    companyId: '',
    goalId: '',
    objectiveType: 'general',
    metricType: 'count',
    targetValue: 0,
    unit: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    priority: 3,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.companyId) {
      setError('Company is required')
      return
    }
    if (formData.targetValue <= 0) {
      setError('Target value must be greater than 0')
      return
    }
    if (new Date(formData.deadline) <= new Date(formData.startDate)) {
      setError('Deadline must be after start date')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      onClose()
      // Reset form
      setFormData({
        title: '',
        description: '',
        companyId: '',
        goalId: '',
        objectiveType: 'general',
        metricType: 'count',
        targetValue: 0,
        unit: '',
        startDate: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 3,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save objective')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {initialData ? 'Edit Objective' : 'Create Objective'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objective Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Reach £50k MRR by June"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional context..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          {/* Company & Goal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                required
              >
                <option value="">Select a company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
              <select
                value={formData.goalId}
                onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value="">None</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objective Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.objectiveType}
                onChange={(e) => setFormData({ ...formData, objectiveType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="revenue">Revenue</option>
                <option value="users">Users</option>
                <option value="features">Features</option>
                <option value="launches">Launches</option>
                <option value="operational">Operational</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value={1}>P1 - Urgent</option>
                <option value={2}>P2 - High</option>
                <option value={3}>P3 - Medium</option>
                <option value={4}>P4 - Low</option>
              </select>
            </div>
          </div>

          {/* Metric */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric Type *
              </label>
              <select
                value={formData.metricType}
                onChange={(e) => {
                  const newMetricType = e.target.value
                  setFormData({
                    ...formData,
                    metricType: newMetricType,
                    unit: newMetricType === 'currency' ? 'GBP' : newMetricType === 'percentage' ? '%' : '',
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value="count">Count</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Value *
              </label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                min="0"
                step={formData.metricType === 'currency' ? '1000' : '1'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., users, £, %"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline *
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
