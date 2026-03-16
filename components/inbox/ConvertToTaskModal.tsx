'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faSpinner, faArrowRight } from '@fortawesome/pro-duotone-svg-icons'
import { getStatuses, Status } from '@/app/actions/statuses'
import { getProjects } from '@/app/actions/projects'

interface InboxItem {
  id: string
  rawText: string
  sourceType: string
  status: string
  capturedAt: string
  cleanedText?: string
  assigneeId?: string
  projectId?: string
  dueDate?: string
  priority?: number
  project?: { id: string; name: string }
}

interface ConvertToTaskModalProps {
  isOpen: boolean
  onClose: () => void
  inboxItem: InboxItem
  workspaceId: string
  onComplete: () => void
}

interface Project {
  id: string
  name: string
}

export default function ConvertToTaskModal({
  isOpen,
  onClose,
  inboxItem,
  workspaceId,
  onComplete,
}: ConvertToTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState(3)
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Pre-fill form from inbox item
      const text = inboxItem.cleanedText || inboxItem.rawText
      const firstLine = text.split('\n')[0]
      setTitle(firstLine.substring(0, 100))
      setDescription(text)
      setProjectId(inboxItem.projectId || '')
      setPriority(inboxItem.priority || 3)
      setDueDate(inboxItem.dueDate ? new Date(inboxItem.dueDate).toISOString().split('T')[0] : '')

      // Load statuses and projects
      loadData()
    } else {
      // Reset form
      setTitle('')
      setDescription('')
      setStatusId('')
      setProjectId('')
      setPriority(3)
      setDueDate('')
      setError('')
    }
  }, [isOpen, inboxItem])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [fetchedStatuses, fetchedProjects] = await Promise.all([
        getStatuses(workspaceId),
        getProjects(workspaceId),
      ])

      setStatuses(fetchedStatuses)
      setProjects(fetchedProjects)

      // Set default status (first non-completed status)
      const defaultStatus = fetchedStatuses.find(s => 
        !['Done', 'Complete', 'Completed'].includes(s.name)
      ) || fetchedStatuses[0]
      
      if (defaultStatus) {
        setStatusId(defaultStatus.id)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load form data')
    } finally {
      setLoadingData(false)
    }
  }

  const handleConvert = async () => {
    if (!title.trim() || !statusId) {
      setError('Title and status are required')
      return
    }

    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/api/inbox/${inboxItem.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          statusId,
          projectId: projectId || undefined,
          priority,
          dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to convert to task')
      }

      onComplete()
    } catch (err: any) {
      console.error('Failed to convert:', err)
      setError(err.message || 'Failed to convert to task')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowRight} className="text-green-600" />
                Convert to Task
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Turn this inbox item into a structured task
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FontAwesomeIcon icon={faTimes} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Task Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-gray-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-gray-900 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Status <span className="text-red-600">*</span>
                </label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-gray-900"
                >
                  <option value="">Select status...</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-gray-900"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-gray-900"
                  >
                    <option value={1}>1 - Critical</option>
                    <option value={2}>2 - High</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Low</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-gray-900"
                  />
                </div>
              </div>

              {/* Original Capture Info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs font-semibold text-gray-900 mb-2">Original Capture</div>
                <div className="text-sm text-gray-700">{inboxItem.rawText}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Captured {new Date(inboxItem.capturedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={loading || loadingData || !title.trim() || !statusId}
            className={`px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              loading || loadingData || !title.trim() || !statusId
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#DD3A44] text-white hover:opacity-90'
            }`}
          >
            {loading && <FontAwesomeIcon icon={faSpinner} spin />}
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}
