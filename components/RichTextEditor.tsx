'use client'

import { useRef, useState, useEffect } from 'react'
import { FaBold, FaItalic, FaList, FaQuoteLeft, FaMagic } from 'react-icons/fa'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onAITidyClick?: () => void
  placeholder?: string
}

export default function RichTextEditor({
  value,
  onChange,
  onAITidyClick,
  placeholder = 'Add notes...',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [hasContent, setHasContent] = useState(!!value)

  useEffect(() => {
    // Only update editor if:
    // 1. Value changed externally (e.g., from AI tidy accept)
    // 2. AND editor is not currently focused (user is not actively typing)
    if (editorRef.current && !isFocused) {
      // Only update if different from current content
      // Important: Update even when value is empty to clear stale content
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
      setHasContent(value.length > 0)
    }
  }, [value, isFocused])

  const handleInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText
      setHasContent(text.length > 0)
      onChange(editorRef.current.innerHTML)
    }
  }

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;')
    }
  }

  return (
    <div className="w-full">
      {/* Toolbar - appears on focus */}
      {isFocused && (
        <div className="mb-2 flex flex-wrap gap-1 p-2 bg-[#F3F3F3] rounded-t-lg border border-b-0 border-gray-200">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="p-2 text-sm text-[#474747] hover:text-[#1A1C1C] hover:bg-[#e8e4e4] rounded transition"
            title="Bold (Cmd+B)"
          >
            <FaBold />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="p-2 text-sm text-[#474747] hover:text-[#1A1C1C] hover:bg-[#e8e4e4] rounded transition"
            title="Italic (Cmd+I)"
          >
            <FaItalic />
          </button>
          <div className="w-px bg-gray-300" />
          <button
            type="button"
            onClick={() => applyFormat('insertUnorderedList')}
            className="p-2 text-sm text-[#474747] hover:text-[#1A1C1C] hover:bg-[#e8e4e4] rounded transition"
            title="Bullet list"
          >
            <FaList />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('formatBlock', '<blockquote>')}
            className="p-2 text-sm text-[#474747] hover:text-[#1A1C1C] hover:bg-[#e8e4e4] rounded transition"
            title="Quote"
          >
            <FaQuoteLeft />
          </button>
          <div className="flex-1" />
          {onAITidyClick && (
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent blur of the editor when clicking this button
                e.preventDefault()
              }}
              onClick={onAITidyClick}
              className="px-3 py-2 text-sm bg-accent-50 text-accent-600 hover:bg-accent-100 rounded transition font-medium flex items-center gap-2 border border-accent-200"
            >
              <FaMagic className="text-sm" />
              AI Tidy
            </button>
          )}
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-3 border rounded focus:outline-none text-[#1A1C1C] placeholder-gray-500 resize-none overflow-auto transition ${
          isFocused
            ? 'border-accent-500 ring-1 ring-accent-500/20 bg-white'
            : 'border-gray-200 bg-[#F3F3F3]'
        }`}
        style={{
          minHeight: '120px',
          maxHeight: '400px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        data-placeholder={!hasContent ? placeholder : ''}
      />

      {/* Placeholder styling */}
      <style jsx>{`
        div[contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: rgb(107, 114, 128);
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
