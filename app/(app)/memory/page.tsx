'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { FaPlus, FaSearch, FaFilter, FaBrain, FaStar, FaTimes } from 'react-icons/fa'
import {
  getAIMemories,
  AIMemory,
  createAIMemory,
  updateAIMemory,
  deleteAIMemory,
} from '@/app/actions/ai-memory'
import { useWorkspace } from '@/lib/use-workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export default function MemoryPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [memories, setMemories] = useState<AIMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<AIMemory | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [minConfidence, setMinConfidence] = useState<number>(1)

  // Use inline array for memory types
  const memoryTypes = ["space", "project", "strategic", "research", "conversation"]

  // Load memories
  useEffect(() => {
    if (!workspaceLoading && workspaceId) {
      loadMemories()
    }
  }, [workspaceId, workspaceLoading, searchQuery, selectedTypes, minConfidence])

  const loadMemories = async () => {
    if (!workspaceId) return
    
    try {
      setLoading(true)
      const filters: any = {}

      if (searchQuery) {
        filters.search = searchQuery
      }

      if (selectedTypes.length > 0) {
        // For multiple types, we'll filter client-side for simplicity
        // In production, you'd want to enhance the API
      }

      if (minConfidence > 1) {
        filters.minConfidence = minConfidence
      }

      const data = await getAIMemories(workspaceId, filters)

      // Client-side filter for types if needed
      let filtered = data
      if (selectedTypes.length > 0) {
        filtered = data.filter((m) => selectedTypes.includes(m.memoryType))
      }

      setMemories(filtered)
    } catch (error) {
      console.error('Failed to load memories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMemory = async (input: {
    title: string
    description: string
    memoryType: string
    confidenceScore: number
    companyId?: string
    projectId?: string
    source?: string
  }) => {
    if (!workspaceId) return
    try {
      await createAIMemory(workspaceId, PLACEHOLDER_USER_ID, input)
      loadMemories()
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Failed to create memory:', error)
    }
  }

  const handleUpdateMemory = async (memoryId: string, updates: any) => {
    if (!workspaceId) return
    try {
      await updateAIMemory(workspaceId, memoryId, updates)
      loadMemories()
    } catch (error) {
      console.error('Failed to update memory:', error)
    }
  }

  const handleDeleteMemory = async (memoryId: string) => {
    if (!workspaceId) return
    try {
      await deleteAIMemory(workspaceId, memoryId)
      loadMemories()
      setIsDetailModalOpen(false)
      setSelectedMemory(null)
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 5) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 8) return 'High'
    if (score >= 5) return 'Medium'
    return 'Low'
  }

  if (workspaceLoading || (loading && memories.length === 0) || !workspaceId) {
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-gray-600">Loading memories...</div>
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
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <FaBrain className="text-accent-500" />
                AI Memory
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
                {(searchQuery || selectedTypes.length > 0 || minConfidence > 1) && ' (filtered)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" size={16} />
              </div>

              {/* Filters Button */}
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`px-3 py-2 rounded-lg border transition flex items-center gap-2 ${
                  isFiltersOpen
                    ? 'bg-accent-50 border-accent-200 text-accent-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FaFilter size={16} />
                Filters
              </button>

              {/* Add Memory Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white font-medium rounded-lg hover:bg-accent-600 transition"
              >
                <FaPlus /> Add Memory
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {isFiltersOpen && (
            <div className="px-8 pb-6 border-t border-gray-200 bg-gray-50 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Memory Type
                  </label>
                  <div className="space-y-2">
                    {memoryTypes.map((type) => (
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
                        <span className="text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Confidence Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Minimum Confidence: {minConfidence}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Low (1)</span>
                    <span>High (10)</span>
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedTypes.length > 0 || minConfidence > 1) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTypes([])
                    setMinConfidence(1)
                  }}
                  className="px-3 py-1 text-sm bg-white text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </header>

        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            {memories.length === 0 ? (
              <div className="text-center py-12">
                <FaBrain className="mx-auto text-gray-300" size={48} />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No memories yet</h3>
                <p className="mt-2 text-gray-600">
                  Create your first memory to help AI remember important context.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition"
                >
                  Add Memory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    onClick={() => {
                      setSelectedMemory(memory)
                      setIsDetailModalOpen(true)
                    }}
                    className="bg-white p-5 rounded-lg border border-gray-200 hover:border-accent-300 hover:shadow-sm transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{memory.title}</h3>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">
                            {memory.memoryType}
                          </span>
                          {memory.space && (
                            <span className="px-2 py-1 text-xs rounded-full bg-accent-50 text-accent-700">
                              {memory.space.name}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{memory.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <FaStar className={getConfidenceColor(memory.confidenceScore)} />
                            <span className={getConfidenceColor(memory.confidenceScore)}>
                              {getConfidenceLabel(memory.confidenceScore)} ({memory.confidenceScore}/10)
                            </span>
                          </div>
                          {memory.source && <span>Source: {memory.source}</span>}
                          <span>
                            {new Date(memory.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Detail Modal */}
        {isDetailModalOpen && selectedMemory && (
          <MemoryDetailModal
            memory={selectedMemory}
            onClose={() => {
              setIsDetailModalOpen(false)
              setSelectedMemory(null)
            }}
            onUpdate={handleUpdateMemory}
            onDelete={handleDeleteMemory}
          />
        )}

        {/* Create Modal */}
        {isCreateModalOpen && (
          <CreateMemoryModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateMemory}
          />
        )}
      </div>
    </div>
  )
}

// Memory Detail Modal Component
function MemoryDetailModal({
  memory,
  onClose,
  onUpdate,
  onDelete,
}: {
  memory: AIMemory
  onClose: () => void
  onUpdate: (id: string, updates: any) => void
  onDelete: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(memory.title)
  const [editDescription, setEditDescription] = useState(memory.description)
  const [editConfidence, setEditConfidence] = useState(memory.confidenceScore)

  const handleSave = () => {
    onUpdate(memory.id, {
      title: editTitle,
      description: editDescription,
      confidenceScore: editConfidence,
    })
    setIsEditing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Memory Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence: {editConfidence}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editConfidence}
                  onChange={(e) => setEditConfidence(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-medium text-gray-900 text-lg">{memory.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">
                    {memory.memoryType}
                  </span>
                  {memory.space && (
                    <span className="px-2 py-1 text-xs rounded-full bg-accent-50 text-accent-700">
                      📦 {memory.space.name}
                    </span>
                  )}
                  {memory.project && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                      📁 {memory.project.name}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{memory.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Confidence Score</h4>
                  <div className="flex items-center gap-2">
                    <FaStar className="text-yellow-500" />
                    <span className="text-gray-900 font-medium">
                      {memory.confidenceScore}/10
                    </span>
                  </div>
                </div>

                {memory.source && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Source</h4>
                    <p className="text-gray-900">{memory.source}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created: {new Date(memory.createdAt).toLocaleString()}</span>
                  <span>Updated: {new Date(memory.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this memory?')) {
                onDelete(memory.id)
              }
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Create Memory Modal Component
function CreateMemoryModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: any) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [memoryType, setMemoryType] = useState('space')
  const [confidenceScore, setConfidenceScore] = useState(7)
  const [source, setSource] = useState('')

  // Use inline array for memory types
  const memoryTypes = ["space", "project", "strategic", "research", "conversation"]

  const handleSubmit = () => {
    if (!title || !description) {
      alert('Please fill in title and description')
      return
    }

    onCreate({
      title,
      description,
      memoryType,
      confidenceScore,
      source: source || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Memory</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this memory about?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed memory description..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              >
                {memoryTypes.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source (optional)
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., meeting, email, research"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence: {confidenceScore}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={confidenceScore}
              onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Low confidence</span>
              <span>High confidence</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition"
          >
            Create Memory
          </button>
        </div>
      </div>
    </div>
  )
}
