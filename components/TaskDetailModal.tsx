'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaTrash, FaShareAlt } from 'react-icons/fa'
import { Task } from '@/app/actions/tasks'
import TaskComments from './TaskComments'
import ShareModal from './ShareModal'
import RichTextEditor from './RichTextEditor'
import AITidyMenu from './AITidyMenu'
import AITidyPreviewModal from './AITidyPreviewModal'
import FileUpload from './FileUpload'
import { tidyDescription, TidyMode } from '@/app/actions/ai-tidy'

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task & { goalTag?: string }
  onUpdate?: (taskId: string, updates: Partial<Task>) => void
  onDelete?: (taskId: string) => void
  workspaceId?: string
  userId?: string
  userName?: string
  statuses?: Array<{ id: string; name: string; type: string }>
}

const PRIORITIES = [
  { num: 1, label: 'P1 - Urgent', color: 'bg-red-100 text-red-700' },
  { num: 2, label: 'P2 - High', color: 'bg-orange-100 text-orange-700' },
  { num: 3, label: 'P3 - Medium', color: 'bg-yellow-100 text-yellow-700' },
  { num: 4, label: 'P4 - Low', color: 'bg-gray-100 text-gray-700' },
]

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-gray-100 text-gray-700',
  planned: 'bg-blue-100 text-blue-700',
  doing: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  workspaceId,
  userId,
  userName = 'You',
  statuses = [],
}: TaskDetailModalProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(3)
  const [statusId, setStatusId] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // AI Tidy state
  const [isAITidyMenuOpen, setIsAITidyMenuOpen] = useState(false)
  const [isAITidyPreviewOpen, setIsAITidyPreviewOpen] = useState(false)
  const [aiTidyResult, setAiTidyResult] = useState<{
    original: string
    rewritten: string
    mode: TidyMode
  } | null>(null)
  const [isAITidyLoading, setIsAITidyLoading] = useState(false)
  const [aiTidyError, setAiTidyError] = useState<string | null>(null)

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([])

  // Load attachments when task changes
  useEffect(() => {
    if (task?.id && workspaceId) {
      fetch(`/api/attachments?taskId=${task.id}&workspaceId=${workspaceId}`)
        .then(res => res.json())
        .then(data => setAttachments(data.attachments || []))
        .catch(err => console.error('Failed to load attachments:', err))
    } else {
      setAttachments([])
    }
  }, [task?.id, workspaceId])

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setPriority(task.priority || 3)
      setStatusId(task.statusId || '')
      // Use the actual description value from task, or empty string if not present
      const taskDescription = task.description || ''
      setDescription(taskDescription)
      setDueDate(task.dueAt ? (typeof task.dueAt === 'string' ? task.dueAt.split('T')[0] : new Date(task.dueAt).toISOString().split('T')[0]) : '')
      setAssigneeId(task.assigneeId || null)
      
      console.log(`[TaskDetailModal] Task ${task.id} loaded. Description: "${taskDescription.substring(0, 30)}${taskDescription.length > 30 ? '...' : ''}"`)
    } else {
      // Reset all form fields when no task is selected
      setTitle('')
      setPriority(3)
      setStatusId('')
      setDescription('')
      setDueDate('')
      setAssigneeId(null)
    }
  }, [task?.id])

  if (!isOpen) return null

  const handleSave = () => {
    if (!task) return

    const updates: Partial<Task> = {
      title,
      priority,
      statusId,
      description: description || undefined,
      dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      assigneeId: assigneeId || undefined,
    }

    onUpdate?.(task.id, updates)
    onClose()
  }

  const handleDelete = () => {
    if (!task) return
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete?.(task.id)
      onClose()
    }
  }

  const handleAITidy = async (mode: TidyMode) => {
    if (!description.trim()) {
      setAiTidyError('Description cannot be empty')
      return
    }

    setIsAITidyLoading(true)
    setAiTidyError(null)

    try {
      const result = await tidyDescription(description, mode)
      setAiTidyResult(result)
      setIsAITidyPreviewOpen(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to tidy description'
      setAiTidyError(errorMessage)
      console.error('AI tidy error:', error)
    } finally {
      setIsAITidyLoading(false)
    }
  }

  const handleAITidyAccept = (rewrittenText: string) => {
    setDescription(rewrittenText)
    setAiTidyResult(null)
    setIsAITidyPreviewOpen(false)
    
    // Auto-save immediately after accepting changes
    setTimeout(() => {
      if (!task) return
      const updates: Partial<Task> = {
        title,
        priority,
        statusId,
        description: rewrittenText || undefined,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      }
      onUpdate?.(task.id, updates)
    }, 100)
  }

  return (
    <div className={`fixed inset-0 bg-black z-50 flex items-end md:items-center justify-center ${isMobile ? 'bg-opacity-0 p-0' : 'bg-opacity-50 p-4'}`}>
      <div className={`bg-white w-full shadow-lg overflow-y-auto flex flex-col ${
        isMobile 
          ? 'h-full rounded-none' 
          : 'max-w-2xl max-h-[90vh] rounded-[14px]'
      }`}>
        {/* Header - Mobile: sticky with explicit back button, Desktop: modal close */}
        <div className={`sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center min-h-[56px] md:min-h-auto`}>
          {isMobile ? (
            <>
              <button
                onClick={onClose}
                className="text-gray-700 hover:bg-gray-100 rounded-lg transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Go back"
              >
                <FaTimes className="text-lg" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 flex-1 text-center">
                {task ? 'Edit Task' : 'New Task'}
              </h2>
              <div className="w-[44px]" />
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900">
                {task ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <FaTimes className="text-lg" />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:focus-ring text-gray-900 placeholder-gray-500 min-h-[44px]"
            />
          </div>

          {/* Priority & Status */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:focus-ring text-gray-900 min-h-[44px]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.num} value={p.num}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Status
              </label>
              {statuses.length > 0 ? (
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:focus-ring text-gray-900 min-h-[44px]"
                >
                  <option value="">Select a status</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg min-h-[44px] flex items-center">
                  Loading statuses...
                </div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Assign to
              </label>
              <select
                value={assigneeId || ''}
                onChange={(e) => setAssigneeId(e.target.value || null)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:focus-ring text-gray-900 min-h-[44px]"
              >
                <option value="">Unassigned</option>
                <option value="doug">Doug</option>
                <option value="ben">Ben</option>
                <option value="other">Other</option>
              </select>
            </div>
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
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:focus-ring text-gray-900 min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <div className="relative">
              <RichTextEditor
                key={`editor-${task?.id}`}
                value={description}
                onChange={setDescription}
                onAITidyClick={() => setIsAITidyMenuOpen(!isAITidyMenuOpen)}
                placeholder="Add notes..."
              />
              {isAITidyMenuOpen && (
                <AITidyMenu
                  isOpen={isAITidyMenuOpen}
                  onClose={() => setIsAITidyMenuOpen(false)}
                  onSelect={handleAITidy}
                  isLoading={isAITidyLoading}
                />
              )}
            </div>
            {aiTidyError && (
              <p className="mt-2 text-sm text-red-600">{aiTidyError}</p>
            )}
          </div>

          {/* Attachments */}
          {task && workspaceId && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Attachments
              </label>
              <FileUpload
                taskId={task.id}
                workspaceId={workspaceId}
                attachments={attachments}
                onUploadComplete={(attachment) => setAttachments([...attachments, attachment])}
                onDelete={(attachmentId) => setAttachments(attachments.filter(a => a.id !== attachmentId))}
              />
            </div>
          )}

          {/* Comments Section */}
          {task && workspaceId && userId && (
            <TaskComments
              taskId={task.id}
              workspaceId={workspaceId}
              userId={userId}
              userName={userName}
            />
          )}
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 md:px-6 py-4 flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3 md:gap-0 ${isMobile ? 'safe-area-inset-bottom' : ''}`}>
          <div className={`flex gap-2 ${isMobile ? 'w-full md:w-auto' : ''}`}>
            <button
              onClick={handleDelete}
              className="p-3 text-gray-500 hover:text-red-600 transition rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Delete task"
            >
              <FaTrash />
            </button>
            {task && workspaceId && userId && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-3 text-gray-500 hover:text-accent-600 transition rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Share task"
              >
                <FaShareAlt />
              </button>
            )}
          </div>
          <div className={`flex gap-3 w-full md:w-auto ${isMobile ? 'flex-col-reverse' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-medium min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition font-medium min-h-[44px] flex items-center justify-center"
            >
              Save Task
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {task && workspaceId && userId && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          taskId={task.id}
          taskTitle={task.title}
          workspaceId={workspaceId}
          userId={userId}
        />
      )}

      {/* AI Tidy Preview Modal */}
      {aiTidyResult && (
        <AITidyPreviewModal
          isOpen={isAITidyPreviewOpen}
          onClose={() => {
            setIsAITidyPreviewOpen(false)
            setAiTidyResult(null)
          }}
          original={aiTidyResult.original}
          rewritten={aiTidyResult.rewritten}
          mode={aiTidyResult.mode}
          onAccept={handleAITidyAccept}
          isLoading={isAITidyLoading}
        />
      )}
    </div>
  )
}
