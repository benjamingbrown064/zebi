'use client'

import { useState, useEffect } from 'react'
import { FaTrash } from 'react-icons/fa'
import { getTaskComments, createComment, deleteComment, TaskComment } from '@/app/actions/comments'
import { getWorkspaceMembers, WorkspaceMember } from '@/app/actions/members'
import MentionInput, { MentionUser } from './MentionInput'

interface TaskCommentsProps {
  taskId: string
  workspaceId: string
  userId: string
  userName: string
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getInitials(userId: string): string {
  // Simple initials from first two chars of userId
  return userId.slice(0, 2).toUpperCase()
}

export default function TaskComments({
  taskId,
  workspaceId,
  userId,
  userName,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [members, setMembers] = useState<MentionUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load comments and members
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const [loadedComments, loadedMembers] = await Promise.all([
        getTaskComments(taskId, workspaceId),
        getWorkspaceMembers(workspaceId),
      ])
      setComments(loadedComments)
      // Add current user to members list for mentions if not already there
      const memberUsers: MentionUser[] = loadedMembers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
      }))
      // Ensure current user is in list
      if (!memberUsers.find(m => m.id === userId)) {
        memberUsers.unshift({ id: userId, name: userName })
      }
      setMembers(memberUsers)
      setIsLoading(false)
    }
    loadData()
  }, [taskId, workspaceId, userId, userName])

  const handleSubmit = async (body: string) => {
    if (!body.trim() || isSubmitting) return

    setIsSubmitting(true)
    // Pass members for mention parsing and notification creation
    const comment = await createComment(taskId, workspaceId, userId, body.trim(), members)
    
    if (comment) {
      setComments((prev) => [...prev, comment])
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    const success = await deleteComment(commentId, workspaceId, userId)
    if (success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-sm font-medium text-[#1c1b1b] mb-3">Comments</h3>

      {/* Comments List */}
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-[#A3A3A3]">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[#A3A3A3]">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {getInitials(comment.createdBy)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1c1b1b]">
                    {comment.createdBy === userId ? userName : 'Team Member'}
                  </span>
                  <span className="text-xs text-[#A3A3A3]">
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                  {comment.createdBy === userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#C4C0C0] hover:text-red-500 transition"
                      title="Delete comment"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-[#5a5757] whitespace-pre-wrap break-words">
                  {comment.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input with Mention Support */}
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
          {userName.slice(0, 2).toUpperCase()}
        </div>
        <MentionInput
          onSubmit={handleSubmit}
          workspaceMembers={members}
          disabled={isSubmitting}
          placeholder="Add a comment... (type @ to mention)"
        />
      </div>
    </div>
  )
}
