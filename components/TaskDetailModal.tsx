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
import TaskOutcomeFields from './TaskOutcomeFields'
import TaskAgentFields, { AgentFieldValues } from './TaskAgentFields'
import TaskHandoffPanel from './TaskHandoffPanel'
import TaskSkillPanel from './TaskSkillPanel'
import TaskSkillEvaluationModal from './TaskSkillEvaluationModal'
import TaskDependencyPanel from './TaskDependencyPanel'
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
  { num: 4, label: 'P4 - Low', color: 'bg-[#F3F3F3] text-[#474747]' },
]

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-[#F3F3F3] text-[#474747]',
  planned: 'bg-[#F3F3F3] text-[#474747]',
  doing: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-[#1A1A1A] text-white',
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
  
  // Phase 2: Outcome fields
  const [expectedOutcome, setExpectedOutcome] = useState<string | null>(null)
  const [completionNote, setCompletionNote] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)

  // Dependencies
  const [dependencyIds, setDependencyIds] = useState<string[]>([])

  // Skill linking
  const [skillId, setSkillId] = useState<string | null>(null)
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)

  // Multi-agent OS fields
  const [agentFields, setAgentFields] = useState<AgentFieldValues>({
    ownerAgent:       null,
    reviewerAgent:    null,
    handoffToAgent:   null,
    requestedBy:      null,
    taskType:         null,
    decisionNeeded:   false,
    decisionSummary:  null,
    waitingOn:        null,
    blockedReason:    null,
    definitionOfDone: null,
    nextAction:       null,
  })

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
      
      // Phase 2: Load outcome fields
      setExpectedOutcome((task as any).expectedOutcome || null)
      setCompletionNote((task as any).completionNote || null)
      setOutputUrl((task as any).outputUrl || null)

      // Dependencies
      setDependencyIds((task as any).dependencyIds || [])

      // Skill linking
      setSkillId((task as any).skillId || null)

      // Multi-agent OS fields
      setAgentFields({
        ownerAgent:       (task as any).ownerAgent       ?? null,
        reviewerAgent:    (task as any).reviewerAgent    ?? null,
        handoffToAgent:   (task as any).handoffToAgent   ?? null,
        requestedBy:      (task as any).requestedBy      ?? null,
        taskType:         (task as any).taskType         ?? null,
        decisionNeeded:   (task as any).decisionNeeded   ?? false,
        decisionSummary:  (task as any).decisionSummary  ?? null,
        waitingOn:        (task as any).waitingOn        ?? null,
        blockedReason:    (task as any).blockedReason    ?? null,
        definitionOfDone: (task as any).definitionOfDone ?? null,
        nextAction:       (task as any).nextAction       ?? null,
      })
      
      console.log(`[TaskDetailModal] Task ${task.id} loaded. Description: "${taskDescription.substring(0, 30)}${taskDescription.length > 30 ? '...' : ''}"`)
    } else {
      // Reset all form fields when no task is selected
      setTitle('')
      setPriority(3)
      setStatusId('')
      setDescription('')
      setDueDate('')
      setAssigneeId(null)
      
      // Phase 2: Reset outcome fields
      setExpectedOutcome(null)
      setCompletionNote(null)
      setOutputUrl(null)

      // Dependencies
      setDependencyIds([])

      // Skill linking
      setSkillId(null)

      // Multi-agent OS fields reset
      setAgentFields({
        ownerAgent: null, reviewerAgent: null, handoffToAgent: null,
        requestedBy: null, taskType: null, decisionNeeded: false,
        decisionSummary: null, waitingOn: null, blockedReason: null,
        definitionOfDone: null, nextAction: null,
      })
    }
  }, [task?.id])

  if (!isOpen) return null

  // Phase 2: Determine when to show outcome fields
  const isHighPriority = priority <= 2
  const isLinkedToObjective = !!(task as any)?.objectiveId
  const isAIAssigned = !!(task as any)?.botAssignee
  const isCompleted = !!task?.completedAt
  const showOutcomeFields = isHighPriority || isLinkedToObjective || isAIAssigned || isCompleted

  const handleSave = () => {
    if (!task) return

    const updates: Partial<Task> = {
      title,
      priority,
      statusId,
      description: description || undefined,
      dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      assigneeId: assigneeId || undefined,
      // Phase 2: Include outcome fields when they should be shown
      ...(showOutcomeFields ? {
        expectedOutcome: expectedOutcome || undefined,
        completionNote: completionNote || undefined,
        outputUrl: outputUrl || undefined,
      } : {}),
      // Multi-agent OS fields (always save)
      ...agentFields,
      // Dependencies
      dependencyIds,
      // Skill linking
      skillId: skillId || undefined,
    }

    onUpdate?.(task.id, updates)
    onClose()
  }

  // Called when evaluation is submitted or skipped from eval modal
  const handleEvaluationComplete = (skipped: boolean, skipReason?: string) => {
    setShowEvalModal(false)
    if (pendingStatusId) {
      setStatusId(pendingStatusId)
      setPendingStatusId(null)
      // Save immediately with new status + skip info if applicable
      if (task && workspaceId) {
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            statusId: pendingStatusId,
            ...(skipped ? { skipEvaluation: true, skipEvaluationReason: skipReason } : {}),
          }),
        }).catch(err => console.error('Failed to update task status:', err))
      }
    }
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
      <div className={`bg-white w-full shadow-[0_20px_40px_rgba(28,27,27,0.06)] flex flex-col ${
        isMobile 
          ? 'h-full rounded-none' 
          : 'max-w-2xl max-h-[90vh] rounded'
      }`}>
        {/* Header - Mobile: sticky with explicit back button, Desktop: modal close */}
        <div className={`sticky top-0 bg-white px-4 md:px-6 py-4 flex justify-between items-center min-h-[56px] md:min-h-auto`}>
          {isMobile ? (
            <>
              <button
                onClick={onClose}
                className="text-[#474747] hover:bg-[#F3F3F3] rounded transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Go back"
              >
                <FaTimes className="text-lg" />
              </button>
              <h2 className="text-lg font-semibold text-[#1A1C1C] flex-1 text-center">
                {task ? 'Edit Task' : 'New Task'}
              </h2>
              <div className="w-[44px]" />
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-[#1A1C1C]">
                {task ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={onClose}
                className="text-[#C4C0C0] hover:text-[#474747] transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full max-w-full break-words bg-[#F9F9F9] border border-[#E5E5E5] rounded px-3 py-2 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] min-h-[44px]"
            />
          </div>

          {/* Priority & Status */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {/* Priority */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full bg-[#F9F9F9] border border-[#E5E5E5] rounded px-3 py-2 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] min-h-[44px]"
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
                Status
              </label>
              {statuses.length > 0 ? (
                <select
                  value={statusId}
                  onChange={(e) => {
                    const newStatusId = e.target.value
                    const newStatus = statuses.find(s => s.id === newStatusId)
                    // If moving to Review and a skill is linked, trigger evaluation modal
                    if (newStatus?.name?.toLowerCase() === 'review' && skillId && task) {
                      setPendingStatusId(newStatusId)
                      setShowEvalModal(true)
                    } else {
                      setStatusId(newStatusId)
                    }
                  }}
                  className="w-full bg-[#F9F9F9] border border-[#E5E5E5] rounded px-3 py-2 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] min-h-[44px]"
                >
                  <option value="">Select a status</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-3 bg-[#F3F3F3] text-[#474747] rounded min-h-[44px] flex items-center">
                  Loading statuses...
                </div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
                Assign to
              </label>
              <select
                value={assigneeId || ''}
                onChange={(e) => setAssigneeId(e.target.value || null)}
                className="w-full bg-[#F9F9F9] border border-[#E5E5E5] rounded px-3 py-2 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] min-h-[44px]"
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
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#F9F9F9] border border-[#E5E5E5] rounded px-3 py-2 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
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

          {/* Phase 2: Outcome Fields - Only show when relevant */}
          {showOutcomeFields && task && (
            <TaskOutcomeFields
              expectedOutcome={expectedOutcome}
              completionNote={completionNote}
              outputUrl={outputUrl}
              isCompleted={isCompleted}
              onUpdate={(fields) => {
                if ('expectedOutcome' in fields) setExpectedOutcome(fields.expectedOutcome ?? null)
                if ('completionNote' in fields) setCompletionNote(fields.completionNote ?? null)
                if ('outputUrl' in fields) setOutputUrl(fields.outputUrl ?? null)
                // Save immediately on field update
                if (task && workspaceId) {
                  fetch(`/api/tasks/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...fields, workspaceId }),
                  }).catch(err => console.error('Failed to save outcome fields:', err))
                }
              }}
            />
          )}

          {/* Dependencies */}
          {task && workspaceId && (
            <TaskDependencyPanel
              workspaceId={workspaceId}
              taskId={task.id}
              dependencyIds={dependencyIds}
              dependencies={(task as any).dependencies}
              onChange={(ids) => {
                setDependencyIds(ids)
                // Auto-save
                fetch(`/api/tasks/${task.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workspaceId, dependencyIds: ids }),
                }).catch(err => console.error('Failed to save dependencies:', err))
              }}
            />
          )}

          {/* Skill linking */}
          {task && workspaceId && (
            <TaskSkillPanel
              workspaceId={workspaceId}
              skillId={skillId}
              onSkillChange={(id) => {
                setSkillId(id)
                // Auto-save
                fetch(`/api/tasks/${task.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workspaceId, skillId: id || null }),
                }).catch(err => console.error('Failed to save skill link:', err))
              }}
            />
          )}

          {/* Agent & Workflow fields */}
          {task && (
            <TaskAgentFields
              values={agentFields}
              onChange={values => {
                setAgentFields(values)
                // Auto-save agent fields immediately on change
                if (workspaceId) {
                  fetch(`/api/tasks/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, workspaceId }),
                  }).catch(err => console.error('Failed to save agent fields:', err))
                }
              }}
            />
          )}

          {/* Handoff panel */}
          {task && workspaceId && (
            <TaskHandoffPanel
              taskId={task.id}
              workspaceId={workspaceId}
              ownerAgent={agentFields.ownerAgent}
            />
          )}

          {/* Attachments */}
          {task && workspaceId && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1 block">
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
        <div className={`sticky bottom-0 bg-[#F3F3F3] px-4 md:px-6 py-4 flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3 md:gap-0 ${isMobile ? 'safe-area-inset-bottom' : ''}`}>
          <div className={`flex gap-2 ${isMobile ? 'w-full md:w-auto' : ''}`}>
            <button
              onClick={handleDelete}
              className="p-3 text-[#A3A3A3] hover:text-red-600 transition rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Delete task"
            >
              <FaTrash />
            </button>
            {task && workspaceId && userId && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-3 text-[#A3A3A3] hover:text-[#474747] transition rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Share task"
              >
                <FaShareAlt />
              </button>
            )}
          </div>
          <div className={`flex gap-3 w-full md:w-auto ${isMobile ? 'flex-col-reverse' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-[#F3F3F3] text-[#1A1C1C] rounded hover:bg-[#e8e4e4] transition font-medium min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-[#000000] hover:bg-[#1A1C1C] text-white rounded px-5 py-2.5 text-[13px] font-medium transition-colors min-h-[44px] flex items-center justify-center"
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

      {/* Skill Evaluation Modal — shown when moving to Review with a skill linked */}
      {showEvalModal && task && skillId && workspaceId && (
        <TaskSkillEvaluationModal
          isOpen={showEvalModal}
          onClose={() => { setShowEvalModal(false); setPendingStatusId(null) }}
          onSubmit={(_evalData, skipped, skipReason) => handleEvaluationComplete(skipped, skipReason)}
          skillId={skillId}
          taskId={task.id}
          workspaceId={workspaceId}
          agentId={(agentFields.ownerAgent as string) || 'doug'}
        />
      )}
    </div>
  )
}
