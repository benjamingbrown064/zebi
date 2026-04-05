'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import { getFilters, createFilter, deleteFilter, SavedFilter, FilterDefinition } from '@/app/actions/filters'
import { useWorkspace } from '@/lib/use-workspace'

export default function FiltersPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newFilter, setNewFilter] = useState({ 
    name: '', 
    description: '',
    priorities: [] as number[],
    tags: [] as string[],
    tagInput: '',
  })

  // Load filters on mount
  useEffect(() => {
    if (!workspaceId) return
    
    async function loadFilters() {
      try {
        const fetchedFilters = await getFilters(workspaceId!)
        setFilters(fetchedFilters)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFilters()
  }, [workspaceId])

  const handleAddFilter = async () => {
    if (!workspaceId || !newFilter.name) {
      alert('Filter name is required')
      return
    }

    // Build filter definition
    const definition: FilterDefinition = {}
    if (newFilter.priorities.length > 0) {
      definition.priorities = newFilter.priorities
    }
    if (newFilter.tags.length > 0) {
      definition.tags = newFilter.tags
    }

    const created = await createFilter(workspaceId, {
      name: newFilter.name,
      definition,
      defaultView: 'list',
    })

    if (created) {
      setFilters([...filters, created])
    }

    setNewFilter({ name: '', description: '', priorities: [], tags: [], tagInput: '' })
    setIsAdding(false)
  }

  const handleDeleteFilter = async (id: string) => {
    if (!workspaceId) return
    const success = await deleteFilter(workspaceId, id)
    if (success) {
      setFilters(filters.filter((f) => f.id !== id))
    }
  }

  const togglePriority = (p: number) => {
    if (newFilter.priorities.includes(p)) {
      setNewFilter({ ...newFilter, priorities: newFilter.priorities.filter(x => x !== p) })
    } else {
      setNewFilter({ ...newFilter, priorities: [...newFilter.priorities, p] })
    }
  }

  const addTag = () => {
    const tag = newFilter.tagInput.trim()
    if (tag && !newFilter.tags.includes(tag)) {
      setNewFilter({ ...newFilter, tags: [...newFilter.tags, tag], tagInput: '' })
    }
  }

  const removeTag = (tag: string) => {
    setNewFilter({ ...newFilter, tags: newFilter.tags.filter(t => t !== tag) })
  }

  // Format filter criteria for display
  const formatCriteria = (def: FilterDefinition): string => {
    const parts: string[] = []
    if (def.priorities?.length) {
      parts.push(`Priority: ${def.priorities.map(p => `P${p}`).join(', ')}`)
    }
    if (def.tags?.length) {
      parts.push(`Tags: ${def.tags.map(t => `#${t}`).join(', ')}`)
    }
    if (def.statuses?.length) {
      parts.push(`Status: ${def.statuses.join(', ')}`)
    }
    return parts.join(' • ') || 'No criteria set'
  }

  if (workspaceLoading || loading || !workspaceId) {
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-cream">
      <Sidebar 
        workspaceName="My Workspace"
        isCollapsed={false}
        onCollapsedChange={() => {}}
      />
      <div>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Saved Filters</h1>
              <p className="text-gray-600 text-sm mt-1">Manage your task filters</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition flex items-center gap-2"
            >
              <FaPlus /> New filter
            </button>
          </div>
        </header>

        <main className="p-8">
          <div className="max-w-4xl space-y-4">
            {filters.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600">No filters yet. Create one to get started.</p>
              </div>
            ) : (
              filters.map((filter) => (
                <div
                  key={filter.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-card-hover transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{filter.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{formatCriteria(filter.definition)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-500 hover:text-blue-600 transition">
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteFilter(filter.id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {isAdding && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Create new filter</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Filter name
                  </label>
                  <input
                    type="text"
                    value={newFilter.name}
                    onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                    placeholder="e.g., P1 tasks"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Priority filter
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePriority(p)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          newFilter.priorities.includes(p)
                            ? 'bg-accent-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        P{p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFilter.tagInput}
                      onChange={(e) => setNewFilter({ ...newFilter, tagInput: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tag..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:focus-ring"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Add
                    </button>
                  </div>
                  {newFilter.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newFilter.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center gap-1"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFilter}
                  className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
