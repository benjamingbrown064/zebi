'use client'

import { useState, useRef, useEffect } from 'react'
import { FaTimes, FaSpinner, FaPaperPlane, FaTrash, FaStickyNote, FaTasks } from 'react-icons/fa'
import { Button } from '@heroui/react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: AIAction[]
  metadata?: {
    model: string
    tokens: number
    cost: number
    plan?: PlanMetadata
  }
  createdAt: string
}

interface AIAction {
  type: string
  label: string
  params: Record<string, any>
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

export default function AIChat({ workspaceId, userId, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (messageText?: string) => {
    const userMessage = messageText || input.trim()
    if (!userMessage || loading) return

    setInput('')
    setLoading(true)

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Set conversation ID from first response
      if (!conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant message
      setMessages((prev) => [...prev, data.message])
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
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

  const handleCompanySelection = (companyName: string) => {
    sendMessage(`This is for ${companyName}`)
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-50 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Zebi · Chat
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Plans, tasks, and context — all from conversation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              title="Clear conversation"
            >
              <FaTrash size={14} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              title="Close"
            >
              <FaTimes size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-sm">Ask me anything about your workspace!</p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="text-gray-400">Try asking:</p>
              <button
                onClick={() => setInput('What should I work on today?')}
                className="block w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                "What should I work on today?"
              </button>
              <button
                onClick={() => setInput('Make a plan for launching my new feature')}
                className="block w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                "Make a plan for launching my new feature"
              </button>
              <button
                onClick={() => setInput('What are my active goals?')}
                className="block w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                "What are my active goals?"
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-accent-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                {message.metadata && !message.metadata.plan && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs opacity-70">
                    {message.metadata.tokens} tokens • ${message.metadata.cost.toFixed(5)}
                  </div>
                )}
              </div>
            </div>

            {/* Plan Card */}
            {message.role === 'assistant' && message.metadata?.plan && (
              <div className="mt-3 ml-0">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 dark:text-blue-400 mt-1">
                      <FaStickyNote size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        📋 Plan created: "{message.metadata.plan.noteTitle}"
                      </h3>

                      {message.metadata.plan.needsConfirmation ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            ❓ {message.metadata.plan.confirmationQuestion || 'Which company is this for?'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              onPress={() => handleCompanySelection('Love Warranty')}
                            >
                              Love Warranty
                            </Button>
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              onPress={() => handleCompanySelection('Zebi')}
                            >
                              Zebi
                            </Button>
                            <Button
                              size="sm"
                              color="default"
                              variant="flat"
                              onPress={() => handleCompanySelection('Other')}
                            >
                              Other
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 dark:text-green-400">✅</span>
                              <span>Note saved</span>
                            </div>
                            {message.metadata.plan.tasksCreated.length > 0 && (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 dark:text-green-400">✅</span>
                                  <span>{message.metadata.plan.tasksCreated.length} tasks created</span>
                                </div>
                                <ul className="ml-6 mt-2 space-y-1">
                                  {message.metadata.plan.tasksCreated.map((task) => (
                                    <li key={task.id} className="text-xs text-gray-600 dark:text-gray-400">
                                      · {task.title}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              startContent={<FaStickyNote />}
                              onPress={() => window.location.href = `/notes`}
                            >
                              View Note
                            </Button>
                            {message.metadata.plan.tasksCreated.length > 0 && (
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                startContent={<FaTasks />}
                                onPress={() => window.location.href = `/tasks`}
                              >
                                View Tasks
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <FaSpinner className="animate-spin text-gray-500" />
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="p-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Send message"
          >
            <FaPaperPlane size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
