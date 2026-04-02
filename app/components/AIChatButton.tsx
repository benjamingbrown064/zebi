'use client'

import { useState } from 'react'
import { FaCommentDots } from 'react-icons/fa'
import { Button } from '@heroui/react'
import AIChat from './AIChat'

interface AIChatButtonProps {
  workspaceId: string
  userId: string
}

export default function AIChatButton({ workspaceId, userId }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Zebi Chat"
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded-full shadow-[0_4px_20px_rgba(221,58,68,0.4)] flex items-center justify-center z-40 transition-all hover:scale-105 active:scale-95"
        >
          <FaCommentDots size={22} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <AIChat
          workspaceId={workspaceId}
          userId={userId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
