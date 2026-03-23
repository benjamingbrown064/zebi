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
        <Button
          isIconOnly
          color="primary"
          size="lg"
          radius="full"
          className="fixed bottom-6 right-6 w-14 h-14 shadow-lg z-40"
          onPress={() => setIsOpen(true)}
          aria-label="Open Zebi Chat"
        >
          <FaCommentDots size={24} />
        </Button>
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
