'use client'

import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faMicrophone, faKeyboard } from '@fortawesome/pro-duotone-svg-icons'

interface InboxQuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (text: string, sourceType: 'text' | 'voice') => void
  isMobile?: boolean
}

export default function InboxQuickAddModal({
  isOpen,
  onClose,
  onAdd,
  isMobile = false,
}: InboxQuickAddModalProps) {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [mode, setMode] = useState<'text' | 'voice'>('text')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, mode])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInput('')
      setMode('text')
      setIsRecording(false)
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (!input.trim()) return
    onAdd(input.trim(), 'text')
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    // Escape to close
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        
        // For now, just use a placeholder text
        // TODO: Integrate with speech-to-text API
        const transcriptText = '[Voice recording captured - transcription pending]'
        setInput(transcriptText)
        setMode('text')
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Failed to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1A1C1C]">Quick Add</h2>
              <p className="text-sm text-[#474747] mt-1">Capture anything, organize later</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F3F3F3] rounded transition"
            >
              <FontAwesomeIcon icon={faTimes} className="text-[#474747]" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setMode('text')}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition ${
                mode === 'text'
                  ? 'bg-[#000000] text-white'
                  : 'bg-[#F3F3F3] text-[#474747] hover:bg-[#e8e4e4]'
              }`}
            >
              <FontAwesomeIcon icon={faKeyboard} className="mr-2" />
              Text
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition ${
                mode === 'voice'
                  ? 'bg-[#000000] text-white'
                  : 'bg-[#F3F3F3] text-[#474747] hover:bg-[#e8e4e4]'
              }`}
            >
              <FontAwesomeIcon icon={faMicrophone} className="mr-2" />
              Voice
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {mode === 'text' ? (
            <div>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type anything... notes, tasks, ideas, reminders"
                className="w-full h-48 p-4 rounded resize-none focus:outline-none focus:ring-2 focus:ring-[#DD3A44] text-[#1A1C1C] placeholder-gray-400"
              />
              <div className="text-xs text-[#A3A3A3] mt-2">
                Tip: Press Cmd/Ctrl + Enter to save quickly
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              {!isRecording ? (
                <>
                  <div className="w-24 h-24 bg-[#000000]/10 rounded-full flex items-center justify-center mb-4">
                    <FontAwesomeIcon 
                      icon={faMicrophone} 
                      className="text-4xl text-[#1A1C1C]" 
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A1C1C] mb-2">
                    Ready to capture voice
                  </h3>
                  <p className="text-[#474747] text-center mb-6 max-w-sm">
                    Tap the button below and speak your thoughts. We'll transcribe and save it for you.
                  </p>
                  <button
                    onClick={startRecording}
                    className="px-8 py-4 bg-[#000000] text-white rounded hover:opacity-90 transition font-medium"
                  >
                    Start Recording
                  </button>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <FontAwesomeIcon 
                      icon={faMicrophone} 
                      className="text-4xl text-red-600" 
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A1C1C] mb-2">
                    Recording...
                  </h3>
                  <p className="text-[#474747] text-center mb-6">
                    Speak clearly and tap stop when finished
                  </p>
                  <button
                    onClick={stopRecording}
                    className="px-8 py-4 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
                  >
                    Stop Recording
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-[#474747] hover:bg-[#F3F3F3] rounded transition font-medium"
          >
            Cancel
          </button>
          {mode === 'text' && (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={`px-6 py-2 rounded font-medium transition ${
                input.trim()
                  ? 'bg-[#000000] text-white hover:opacity-90'
                  : 'bg-[#F3F3F3] text-[#C4C0C0] cursor-not-allowed'
              }`}
            >
              Save to Inbox
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
