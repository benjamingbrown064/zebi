'use client'

import { useState, useRef, useEffect } from 'react'
import { FaTimes, FaSpinner, FaPaperPlane, FaTrash, FaStickyNote, FaTasks, FaArrowRight } from 'react-icons/fa'

interface ObjectRef {
  type: 'task' | 'note' | 'document' | 'project' | 'objective'
  id: string
  title: string
  meta?: Record<string, any>
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    model?: string
    tokens?: number
    cost?: number
    plan?: PlanMetadata
    mode?: string
  }
  objects?: ObjectRef[]
  createdAt: string
}

interface PlanMetadata {
  noteId: string
  noteTitle: string
  tasksCreated: Array<{ id: string; title: string }>
  needsConfirmation: boolean
  confirmationQuestion?: string
}

interface AIChatProps {
  workspaceId: string
  userId: string
  onClose?: () => void
}

const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'Make a plan for the Zebi launch',
  'What are my active priorities?',
]

export default function AIChat({ workspaceId, userId, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (messageText?: string) => {
    const userMessage = (messageText ?? input).trim()
    if (!userMessage || loading) return
    setInput('')
    setLoading(true)

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversationId }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (!conversationId) setConversationId(data.conversationId)

      // Attach plan result to message metadata
      const msg = data.message
      if (data.plan && msg.metadata) {
        msg.metadata.plan = data.plan
      } else if (data.plan) {
        msg.metadata = { plan: data.plan }
      }
      // Attach resolved objects (Pass B)
      if (data.objects?.length) {
        msg.objects = data.objects
      }
      setMessages(prev => [...prev, msg])
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'Something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearConversation = () => {
    if (confirm('Clear this conversation?')) {
      setMessages([])
      setConversationId(null)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-white flex flex-col z-50 shadow-[−20px_0_40px_rgba(28,27,27,0.08)] border-l border-[#F0F0F0]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0] flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Zebi · Chat</h2>
          <p className="text-[11px] text-[#A3A3A3] mt-0.5">Plans, tasks, and context — all from conversation</p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="p-2 text-[#A3A3A3] hover:text-[#DD3A44] hover:bg-[#FEF2F2] rounded-[8px] transition"
              title="Clear conversation"
            >
              <FaTrash size={13} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-[8px] transition"
            >
              <FaTimes size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-[#FEF2F2] rounded-full flex items-center justify-center mb-4">
              <FaStickyNote className="text-[#DD3A44] text-xl" />
            </div>
            <p className="text-[14px] font-medium text-[#1A1A1A] mb-1">What do you need to get done?</p>
            <p className="text-[12px] text-[#A3A3A3] mb-6">Chat naturally — I'll capture plans, create tasks, and keep context as we go.</p>
            <div className="w-full space-y-2">
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="w-full text-left px-4 py-3 bg-[#F5F5F5] hover:bg-[#F0F0F0] rounded-[10px] text-[13px] text-[#525252] transition flex items-center justify-between group"
                >
                  <span>{p}</span>
                  <FaArrowRight className="text-[#D4D4D4] group-hover:text-[#A3A3A3] transition text-[11px]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(message => (
          <div key={message.id} className="space-y-2">
            {/* Message bubble */}
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-[14px] px-4 py-3 text-[14px] leading-relaxed ${
                message.role === 'user'
                  ? 'bg-[#DD3A44] text-white rounded-br-[4px]'
                  : 'bg-[#F5F5F5] text-[#1A1A1A] rounded-bl-[4px]'
              }`}>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>

            {/* Object cards (Pass B — task list / resolved objects) */}
            {message.role === 'assistant' && message.objects && message.objects.length > 0 && (
              <div className="space-y-1.5 mt-1">
                {message.objects.map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      if (obj.type === 'task') window.location.href = '/tasks'
                      else if (obj.type === 'note') window.location.href = '/notes'
                      else if (obj.type === 'document') window.location.href = '/documents'
                    }}
                    className="w-full text-left flex items-center justify-between px-3 py-2.5 bg-white border border-[#E5E5E5] hover:border-[#DD3A44] rounded-[10px] group transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide w-10 flex-shrink-0">
                        {obj.type === 'task' ? (
                          obj.meta?.priority === 1 ? '🔴' : obj.meta?.priority === 2 ? '🟡' : '⚪'
                        ) : obj.type === 'note' ? '📝' : '📄'}
                      </span>
                      <span className="text-[13px] text-[#1A1A1A] truncate">{obj.title}</span>
                    </div>
                    <FaArrowRight className="text-[#D4D4D4] group-hover:text-[#DD3A44] transition text-[10px] flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}

            {/* Plan card */}
            {message.role === 'assistant' && message.metadata?.plan && (
              <div className="bg-[#fcf9f8] border border-[#E5E5E5] rounded-[14px] p-4 mx-0">
                {message.metadata.plan.needsConfirmation ? (
                  <>
                    <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">
                      {message.metadata.plan.confirmationQuestion || 'Which company is this for?'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Love Warranty', 'Zebi', 'Other'].map(name => (
                        <button
                          key={name}
                          onClick={() => sendMessage(`This is for ${name}`)}
                          className="px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#DD3A44] hover:text-[#DD3A44] rounded-[8px] text-[12px] font-medium text-[#525252] transition"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <FaStickyNote className="text-[#DD3A44] flex-shrink-0" />
                      <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                        {message.metadata.plan.noteTitle}
                      </p>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-[12px] text-[#525252]">
                        <span className="text-[#006766]">✓</span>
                        <span>Note saved</span>
                      </div>
                      {message.metadata.plan.tasksCreated.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 text-[12px] text-[#525252]">
                            <span className="text-[#006766]">✓</span>
                            <span>{message.metadata.plan.tasksCreated.length} tasks created</span>
                          </div>
                          <ul className="ml-5 space-y-1 mt-1">
                            {message.metadata.plan.tasksCreated.map(task => (
                              <li key={task.id} className="text-[11px] text-[#737373] flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-[#D4D4D4] flex-shrink-0" />
                                {task.title}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => window.location.href = '/companies'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#DD3A44] hover:text-[#DD3A44] rounded-[8px] text-[11px] font-medium text-[#525252] transition"
                      >
                        <FaStickyNote size={10} /> View Note
                      </button>
                      {message.metadata.plan.tasksCreated.length > 0 && (
                        <button
                          onClick={() => window.location.href = '/tasks'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-[#DD3A44] hover:text-[#DD3A44] rounded-[8px] text-[11px] font-medium text-[#525252] transition"
                        >
                          <FaTasks size={10} /> View Tasks
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#F5F5F5] rounded-[14px] rounded-bl-[4px] px-4 py-3 flex items-center gap-2">
              <FaSpinner className="animate-spin text-[#A3A3A3] text-[12px]" />
              <span className="text-[13px] text-[#A3A3A3]">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-[#F0F0F0] flex-shrink-0">
        <div className="flex items-end gap-2 bg-[#F5F5F5] rounded-[12px] px-4 py-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message Zebi…"
            disabled={loading}
            className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none resize-none leading-snug max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 bg-[#DD3A44] disabled:bg-[#E5E5E5] text-white disabled:text-[#A3A3A3] rounded-[8px] flex items-center justify-center transition"
          >
            <FaPaperPlane size={13} />
          </button>
        </div>
        <p className="text-[10px] text-[#D4D4D4] text-center mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
