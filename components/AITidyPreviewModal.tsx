'use client'

import { useState } from 'react'
import { FaTimes, FaCheck, FaTimes as FaReject, FaUndo } from 'react-icons/fa'
import { TidyMode } from '@/app/actions/ai-tidy'

interface AITidyPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  original: string
  rewritten: string
  mode: TidyMode
  onAccept: (rewrittenText: string) => void
  isLoading?: boolean
}

const MODE_LABELS: Record<TidyMode, string> = {
  development: '👨‍💻 Development',
  marketing: '📢 Marketing',
  'business-dev': '💼 Business Development',
  overview: '📋 Task Overview',
  clarity: '✨ General Clarity',
}

export default function AITidyPreviewModal({
  isOpen,
  onClose,
  original,
  rewritten,
  mode,
  onAccept,
  isLoading = false,
}: AITidyPreviewModalProps) {
  const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | null>(null)

  if (!isOpen) return null

  const handleAccept = () => {
    setSelectedAction('accept')
    setTimeout(() => {
      onAccept(rewritten)
      onClose()
    }, 300)
  }

  const handleReject = () => {
    setSelectedAction('reject')
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-[#1A1C1C]">AI Tidy Preview</h2>
            <p className="text-sm text-[#A3A3A3] mt-1">{MODE_LABELS[mode]}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#C4C0C0] hover:text-[#474747] transition"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-500 rounded-full" />
              </div>
              <span className="ml-3 text-[#474747]">Tidying your description...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <h3 className="text-sm font-semibold text-[#1A1C1C] mb-3">Original</h3>
                <div className="p-4 bg-[#F3F3F3] rounded min-h-[300px] whitespace-pre-wrap text-sm text-[#474747]">
                  {original}
                </div>
              </div>

              {/* Rewritten */}
              <div>
                <h3 className="text-sm font-semibold text-[#1A1C1C] mb-3">
                  Rewritten ({MODE_LABELS[mode]})
                </h3>
                <div className="p-4 bg-accent-50 rounded border border-accent-200 min-h-[300px] whitespace-pre-wrap text-sm text-[#474747]">
                  {rewritten}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="sticky bottom-0 bg-[#F3F3F3] px-6 py-4 flex justify-end gap-3">
            <button
              onClick={handleReject}
              disabled={selectedAction === 'accept'}
              className={`px-4 py-2 rounded font-medium transition flex items-center gap-2 ${
                selectedAction === 'reject'
                  ? 'bg-red-100 text-red-700 opacity-50'
                  : 'bg-[#F3F3F3] text-[#1A1C1C] hover:bg-[#e8e4e4]'
              }`}
            >
              <FaReject className="text-sm" />
              Reject
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedAction === 'reject'}
              className={`px-4 py-2 rounded font-medium transition flex items-center gap-2 ${
                selectedAction === 'accept'
                  ? 'bg-[#e6f4f4] text-[#006766]'
                  : 'bg-accent-500 text-white hover:bg-accent-600'
              }`}
            >
              <FaCheck className="text-sm" />
              Accept & Apply
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
