'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaLightbulb,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
  FaChartLine,
  FaBullseye,
  FaCogs,
} from 'react-icons/fa'
import {
  getAIInsights,
  AIInsight,
  createAIInsight,
  updateAIInsight,
  deleteAIInsight,
  reviewAIInsight,
  implementAIInsight,
  dismissAIInsight,
} from '@/app/actions/ai-insights'
import { useWorkspace } from '@/lib/use-workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export default function InsightsPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['new'])
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([])

  const insightTypes = ['opportunity', 'risk', 'strategy', 'optimization']
  const insightStatuses = ['new', 'reviewed', 'implemented', 'dismissed']

  // Load insights
  useEffect(() => {
    if (!workspaceLoading && workspaceId) {
      loadInsights()
    }
  }, [workspaceId, workspaceLoading, searchQuery, selectedTypes, selectedStatuses, selectedPriorities])

  const loadInsights = async () => {
    if (!workspaceId) return
    
    try {
      setLoading(true)
      const filters: any = {}

      if (searchQuery) {
        filters.search = searchQuery
      }

      // For multiple filters, we'll filter client-side for simplicity
      const data = await getAIInsights(workspaceId, filters)

      // Client-side filtering
      let filtered = data

      if (selectedTypes.length > 0) {
        filtered = filtered.filter((i) => selectedTypes.includes(i.insightType))
      }

      if (selectedStatuses.length > 0) {
        filtered = filtered.filter((i) => selectedStatuses.includes(i.status))
      }

      if (selectedPriorities.length > 0) {
        filtered = filtered.filter((i) => selectedPriorities.includes(i.priority))
      }

      setInsights(filtered)
    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInsight = async (input: {
    title: string
    summary: string
    insightType: string
    priority: number
    detailedAnalysis: any
    suggestedActions?: any
    companyId?: string
  }) => {
    if (!workspaceId) return
    try {
      await createAIInsight(workspaceId, input)
      loadInsights()
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Failed to create insight:', error)
    }
  }

  const handleReview = async (insightId: string) => {
    if (!workspaceId) return
    try {
      await reviewAIInsight(workspaceId, insightId, PLACEHOLDER_USER_ID)
      loadInsights()
      if (selectedInsight?.id === insightId) {
        const updated = await getAIInsights(workspaceId, {})
        const found = updated.find((i) => i.id === insightId)
        if (found) setSelectedInsight(found)
      }
    } catch (error) {
      console.error('Failed to review insight:', error)
    }
  }

  const handleImplement = async (insightId: string) => {
    if (!workspaceId) return
    try {
      await implementAIInsight(workspaceId, insightId, PLACEHOLDER_USER_ID)
      loadInsights()
      if (selectedInsight?.id === insightId) {
        const updated = await getAIInsights(workspaceId, {})
        const found = updated.find((i) => i.id === insightId)
        if (found) setSelectedInsight(found)
      }
    } catch (error) {
      console.error('Failed to implement insight:', error)
    }
  }

  const handleDismiss = async (insightId: string) => {
    if (!workspaceId) return
    try {
      await dismissAIInsight(workspaceId, insightId, PLACEHOLDER_USER_ID)
      loadInsights()
      setIsDetailModalOpen(false)
      setSelectedInsight(null)
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    }
  }

  const handleDelete = async (insightId: string) => {
    if (!workspaceId) return
    try {
      await deleteAIInsight(workspaceId, insightId)
      loadInsights()
      setIsDetailModalOpen(false)
      setSelectedInsight(null)
    } catch (error) {
      console.error('Failed to delete insight:', error)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <FaChartLine className="text-green-500" />
      case 'risk':
        return <FaExclamationTriangle className="text-red-500" />
      case 'strategy':
        return <FaBullseye className="text-[#006766]" />
      case 'optimization':
        return <FaCogs className="text-purple-500" />
      default:
        return <FaLightbulb className="text-yellow-500" />
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'border-red-300 bg-red-50'
      case 2:
        return 'border-orange-300 bg-orange-50'
      case 3:
        return 'border-transparent bg-[#f0fafa]'
      case 4:
        return 'border-gray-300 bg-[#f6f3f2]'
      default:
        return 'border-gray-300 bg-white'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'P1 - Critical'
      case 2:
        return 'P2 - High'
      case 3:
        return 'P3 - Medium'
      case 4:
        return 'P4 - Low'
      default:
        return 'Unknown'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-1 text-xs rounded-full bg-[#e6f4f4] text-[#006766]">New</span>
      case 'reviewed':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Reviewed</span>
      case 'implemented':
        return <span className="px-2 py-1 text-xs rounded-full bg-[#e6f4f4] text-[#006766]">Implemented</span>
      case 'dismissed':
        return <span className="px-2 py-1 text-xs rounded-full bg-[#f0eded] text-[#5a5757]">Dismissed</span>
      default:
        return null
    }
  }

  if (workspaceLoading || (loading && insights.length === 0) || !workspaceId) {
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-[#5a5757]">Loading insights...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-cream">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}>
        <header className="bg-white sticky top-0 z-10">
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#1c1b1b] flex items-center gap-2">
                <FaLightbulb className="text-yellow-500" />
                AI Insights
              </h1>
              <p className="text-[#5a5757] text-sm mt-1">
                {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
                {(searchQuery || selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedPriorities.length > 0) && ' (filtered)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search insights..."
                  className="pl-10 pr-4 py-2 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <FaSearch className="absolute left-3 top-3 text-[#C4C0C0]" size={16} />
              </div>

              {/* Filters Button */}
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#e0dbdb] hover:bg-[#d4cecd] text-[#1c1b1b]  rounded-[10px] font-medium text-[13px] transition-colors min-h-[44px]"
              >
                <FaFilter size={16} />
                Filters
              </button>

              {/* Add Insight Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] transition-colors min-h-[44px]"
              >
                <FaPlus /> Add Insight
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {isFiltersOpen && (
            <div className="px-8 pb-6 bg-[#f6f3f2] space-y-4">
              <div className="grid grid-cols-3 gap-6">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1c1b1b] mb-3">
                    Insight Type
                  </label>
                  <div className="space-y-2">
                    {insightTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => {
                            if (selectedTypes.includes(type)) {
                              setSelectedTypes(selectedTypes.filter((t) => t !== type))
                            } else {
                              setSelectedTypes([...selectedTypes, type])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-[#5a5757] capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1c1b1b] mb-3">
                    Status
                  </label>
                  <div className="space-y-2">
                    {insightStatuses.map((status) => (
                      <label key={status} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status)}
                          onChange={() => {
                            if (selectedStatuses.includes(status)) {
                              setSelectedStatuses(selectedStatuses.filter((s) => s !== status))
                            } else {
                              setSelectedStatuses([...selectedStatuses, status])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-[#5a5757] capitalize">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1c1b1b] mb-3">
                    Priority
                  </label>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((priority) => (
                      <label key={priority} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPriorities.includes(priority)}
                          onChange={() => {
                            if (selectedPriorities.includes(priority)) {
                              setSelectedPriorities(selectedPriorities.filter((p) => p !== priority))
                            } else {
                              setSelectedPriorities([...selectedPriorities, priority])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-[#5a5757]">{getPriorityLabel(priority)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedPriorities.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTypes([])
                    setSelectedStatuses(['new'])
                    setSelectedPriorities([])
                  }}
                  className="px-3 py-1 text-sm bg-white text-[#5a5757] rounded hover:bg-[#f6f3f2] transition"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </header>

        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            {insights.length === 0 ? (
              <div className="text-center py-12">
                <FaLightbulb className="mx-auto text-gray-300" size={48} />
                <h3 className="mt-4 text-lg font-medium text-[#1c1b1b]">No insights yet</h3>
                <p className="mt-2 text-[#5a5757]">
                  AI-generated insights will appear here to help you make better decisions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    onClick={() => {
                      setSelectedInsight(insight)
                      setIsDetailModalOpen(true)
                    }}
                    className={`p-5 rounded-[10px] border-2 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer ${getPriorityColor(insight.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getInsightIcon(insight.insightType)}
                        <span className="text-xs font-medium text-[#5a5757] capitalize">
                          {insight.insightType}
                        </span>
                      </div>
                      {getStatusBadge(insight.status)}
                    </div>

                    <h3 className="font-semibold text-[#1c1b1b] mb-2 line-clamp-2">
                      {insight.title}
                    </h3>

                    <p className="text-[#5a5757] text-sm line-clamp-3 mb-3">
                      {insight.summary}
                    </p>

                    {insight.space && (
                      <div className="mb-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-white text-[#5a5757] border border-gray-300">
                          📦 {insight.space.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[#A3A3A3] pt-3">
                      <span>{getPriorityLabel(insight.priority)}</span>
                      <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Quick Actions */}
                    {insight.status === 'new' && (
                      <div className="flex items-center gap-2 mt-3 pt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReview(insight.id)
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white text-[#5a5757] border border-gray-300 rounded hover:bg-[#f6f3f2] transition"
                        >
                          Review
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleImplement(insight.id)
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition"
                        >
                          Implement
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Detail Modal */}
        {isDetailModalOpen && selectedInsight && (
          <InsightDetailModal
            insight={selectedInsight}
            onClose={() => {
              setIsDetailModalOpen(false)
              setSelectedInsight(null)
            }}
            onReview={handleReview}
            onImplement={handleImplement}
            onDismiss={handleDismiss}
            onDelete={handleDelete}
          />
        )}

        {/* Create Modal */}
        {isCreateModalOpen && (
          <CreateInsightModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateInsight}
          />
        )}
      </div>
    </div>
  )
}

// Insight Detail Modal Component
function InsightDetailModal({
  insight,
  onClose,
  onReview,
  onImplement,
  onDismiss,
  onDelete,
}: {
  insight: AIInsight
  onClose: () => void
  onReview: (id: string) => void
  onImplement: (id: string) => void
  onDismiss: (id: string) => void
  onDelete: (id: string) => void
}) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <FaChartLine className="text-green-500" size={24} />
      case 'risk':
        return <FaExclamationTriangle className="text-red-500" size={24} />
      case 'strategy':
        return <FaBullseye className="text-[#006766]" size={24} />
      case 'optimization':
        return <FaCogs className="text-purple-500" size={24} />
      default:
        return <FaLightbulb className="text-yellow-500" size={24} />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[10px] shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getInsightIcon(insight.insightType)}
            <h2 className="text-xl font-semibold text-[#1c1b1b]">Insight Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#C4C0C0] hover:text-[#5a5757] transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Header Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 text-sm rounded-full bg-[#f0eded] text-[#5a5757] capitalize">
                {insight.insightType}
              </span>
              <span className="px-3 py-1 text-sm rounded-full bg-[#e6f4f4] text-[#006766]">
                Priority {insight.priority}
              </span>
              {insight.space && (
                <span className="px-3 py-1 text-sm rounded-full bg-accent-50 text-accent-700">
                  📦 {insight.space.name}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-[#1c1b1b] mb-2">{insight.title}</h3>
          </div>

          {/* Summary */}
          <div className="bg-[#f6f3f2] p-4 rounded-[10px]">
            <h4 className="text-sm font-semibold text-[#5a5757] mb-2">Summary</h4>
            <p className="text-[#1c1b1b]">{insight.summary}</p>
          </div>

          {/* Detailed Analysis */}
          <div>
            <h4 className="text-sm font-semibold text-[#5a5757] mb-3">Detailed Analysis</h4>
            <div className="bg-white p-4 rounded-[10px]">
              {typeof insight.detailedAnalysis === 'string' ? (
                <p className="text-[#1c1b1b] whitespace-pre-wrap">{insight.detailedAnalysis}</p>
              ) : (
                <pre className="text-[#1c1b1b] text-sm whitespace-pre-wrap">
                  {JSON.stringify(insight.detailedAnalysis, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Suggested Actions */}
          {insight.suggestedActions && (
            <div>
              <h4 className="text-sm font-semibold text-[#5a5757] mb-3">Suggested Actions</h4>
              <div className="bg-accent-50 border border-accent-200 p-4 rounded-[10px]">
                {typeof insight.suggestedActions === 'string' ? (
                  <p className="text-[#1c1b1b]">{insight.suggestedActions}</p>
                ) : Array.isArray(insight.suggestedActions) ? (
                  <ul className="list-disc list-inside space-y-2">
                    {insight.suggestedActions.map((action: any, idx: number) => (
                      <li key={idx} className="text-[#1c1b1b]">
                        {typeof action === 'string' ? action : JSON.stringify(action)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <pre className="text-[#1c1b1b] text-sm whitespace-pre-wrap">
                    {JSON.stringify(insight.suggestedActions, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Status & Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-5">
            <div>
              <h4 className="text-sm font-medium text-[#5a5757] mb-1">Status</h4>
              <p className="text-[#1c1b1b] capitalize">{insight.status}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#5a5757] mb-1">Created</h4>
              <p className="text-[#1c1b1b]">{new Date(insight.createdAt).toLocaleString()}</p>
            </div>
            {insight.reviewedAt && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-[#5a5757] mb-1">Reviewed</h4>
                  <p className="text-[#1c1b1b]">{new Date(insight.reviewedAt).toLocaleString()}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-[#f6f3f2] px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this insight?')) {
                onDelete(insight.id)
              }
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-[10px] transition"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            {insight.status === 'new' && (
              <>
                <button
                  onClick={() => onDismiss(insight.id)}
                  className="px-4 py-2 text-[#5a5757] hover:bg-[#f0eded] rounded-[10px] transition"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => onReview(insight.id)}
                  className="px-4 py-2 bg-[#e8e4e4] text-[#1c1b1b] rounded-[10px] hover:bg-gray-300 transition"
                >
                  Mark Reviewed
                </button>
                <button
                  onClick={() => onImplement(insight.id)}
                  className="px-4 py-2 bg-accent-500 text-white rounded-[10px] hover:bg-accent-600 transition"
                >
                  <FaCheckCircle className="inline mr-2" />
                  Implement
                </button>
              </>
            )}
            {insight.status === 'reviewed' && (
              <button
                onClick={() => onImplement(insight.id)}
                className="px-4 py-2 bg-accent-500 text-white rounded-[10px] hover:bg-accent-600 transition"
              >
                <FaCheckCircle className="inline mr-2" />
                Mark Implemented
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Create Insight Modal Component
function CreateInsightModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: any) => void
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [insightType, setInsightType] = useState('opportunity')
  const [priority, setPriority] = useState(3)
  const [detailedAnalysis, setDetailedAnalysis] = useState('')
  const [suggestedActions, setSuggestedActions] = useState('')


  const handleSubmit = () => {
    if (!title || !summary || !detailedAnalysis) {
      alert('Please fill in title, summary, and detailed analysis')
      return
    }

    onCreate({
      title,
      summary,
      insightType,
      priority,
      detailedAnalysis,
      suggestedActions: suggestedActions || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[10px] shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1c1b1b]">Create New Insight</h2>
          <button
            onClick={onClose}
            className="text-[#C4C0C0] hover:text-[#5a5757] transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5a5757] mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for this insight"
              className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5a5757] mb-2">Summary *</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="2-3 sentence summary"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5a5757] mb-2">
              Detailed Analysis *
            </label>
            <textarea
              value={detailedAnalysis}
              onChange={(e) => setDetailedAnalysis(e.target.value)}
              placeholder="Full analysis and reasoning..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5a5757] mb-2">
              Suggested Actions (optional)
            </label>
            <textarea
              value={suggestedActions}
              onChange={(e) => setSuggestedActions(e.target.value)}
              placeholder="What should be done? One action per line."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#5a5757] mb-2">Type</label>
              <select
                value={insightType}
                onChange={(e) => setInsightType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                {['opportunity', 'risk', 'strategy', 'optimization'].map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5a5757] mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                <option value={1}>P1 - Critical</option>
                <option value={2}>P2 - High</option>
                <option value={3}>P3 - Medium</option>
                <option value={4}>P4 - Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[#f6f3f2] px-6 py-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#5a5757] hover:bg-[#f0eded] rounded-[10px] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-accent-500 text-white rounded-[10px] hover:bg-accent-600 transition"
          >
            Create Insight
          </button>
        </div>
      </div>
    </div>
  )
}
