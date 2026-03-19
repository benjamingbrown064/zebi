'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaCopy, FaCheck, FaTrash, FaLink } from 'react-icons/fa'
import { createShareLink, getShareLink, revokeShareLink, ShareLink } from '@/app/actions/sharing'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  workspaceId: string
  userId: string
}

export default function ShareModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  workspaceId,
  userId,
}: ShareModalProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  // Load existing share link
  useEffect(() => {
    async function loadShareLink() {
      if (!isOpen) return
      setIsLoading(true)
      const link = await getShareLink(taskId, workspaceId)
      setShareLink(link)
      setIsLoading(false)
    }
    loadShareLink()
  }, [isOpen, taskId, workspaceId])

  if (!isOpen) return null

  const shareUrl = shareLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareLink.shareSlug}`
    : null

  const handleCreateLink = async () => {
    setIsCreating(true)
    const link = await createShareLink(taskId, workspaceId, userId)
    if (link) {
      setShareLink(link)
    }
    setIsCreating(false)
  }

  const handleRevokeLink = async () => {
    if (!shareLink) return
    if (!confirm('Revoke this share link? Anyone with the link will no longer be able to view this task.')) {
      return
    }

    setIsRevoking(true)
    const success = await revokeShareLink(shareLink.id, workspaceId, userId)
    if (success) {
      setShareLink(null)
    }
    setIsRevoking(false)
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[10px] shadow-[0_20px_40px_rgba(28,27,27,0.06)] max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaLink className="text-accent-500" />
            <h2 className="text-lg font-semibold text-[#1c1b1b]">Share Task</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#C4C0C0] hover:text-[#5a5757] transition"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Task Info */}
          <div className="mb-6">
            <p className="text-sm text-[#A3A3A3] mb-1">Sharing</p>
            <p className="text-[#1c1b1b] font-medium truncate">{taskTitle}</p>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-[#A3A3A3]">Loading...</p>
            </div>
          ) : shareLink ? (
            // Show existing share link
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5a5757] mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl || ''}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-[10px] text-sm bg-[#f6f3f2] text-[#5a5757]"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2 rounded-[10px] font-medium transition flex items-center gap-2 ${
                      isCopied
                        ? 'bg-[#e6f4f4] text-[#006766]'
                        : 'bg-accent-500 text-white hover:bg-accent-600'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <FaCheck className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <FaCopy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-[#A3A3A3] mb-3">
                  Anyone with this link can view this task (read-only). No sign-in required.
                </p>
                <button
                  onClick={handleRevokeLink}
                  disabled={isRevoking}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  <FaTrash className="w-3 h-3" />
                  {isRevoking ? 'Revoking...' : 'Revoke Link'}
                </button>
              </div>
            </div>
          ) : (
            // No share link exists - show create option
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[#f0eded] rounded-full flex items-center justify-center mx-auto mb-4">
                <FaLink className="w-6 h-6 text-[#C4C0C0]" />
              </div>
              <p className="text-[#5a5757] mb-4">
                Create a public link to share this task with anyone.
              </p>
              <button
                onClick={handleCreateLink}
                disabled={isCreating}
                className="px-6 py-2 bg-accent-500 text-white rounded-[10px] font-medium hover:bg-accent-600 transition disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#f0eded] text-[#1c1b1b] rounded-[10px] hover:bg-[#e8e4e4] transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
