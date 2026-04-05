'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FaTimes, FaFolder, FaTasks, FaFile, FaStickyNote, FaBullseye, FaBox } from 'react-icons/fa'

interface SearchResult {
  type: 'space' | 'project' | 'objective' | 'task' | 'document' | 'note'
  id: string
  title: string
  subtitle?: string
  href: string
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

const ENTITY_CONFIG = {
  space: { label: 'SPACES', icon: FaBox, color: 'text-[#DD3A44]' },
  project: { label: 'PROJECTS', icon: FaFolder, color: 'text-[#DD3A44]' },
  objective: { label: 'OBJECTIVES', icon: FaBullseye, color: 'text-[#DD3A44]' },
  task: { label: 'TASKS', icon: FaTasks, color: 'text-[#DD3A44]' },
  document: { label: 'DOCUMENTS', icon: FaFile, color: 'text-[#DD3A44]' },
  note: { label: 'NOTES', icon: FaStickyNote, color: 'text-[#DD3A44]' },
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout>()

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        router.push(results[selectedIndex].href)
        onClose()
      }
    },
    [isOpen, results, selectedIndex, onClose, router]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] flex items-start justify-center pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded max-w-2xl w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative px-5 py-4 border-b border-[#E5E5E5]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search spaces, projects, tasks, documents..."
            className="w-full text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] outline-none"
          />
          {loading && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-5 py-12 text-center text-[13px] text-[#A3A3A3]">
              Type to search...
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-5 py-12 text-center text-[13px] text-[#A3A3A3]">
              No results found
            </div>
          ) : (
            Object.entries(groupedResults).map(([type, items]) => {
              const config = ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG]
              if (!config) return null

              return (
                <div key={type}>
                  {/* Section Header */}
                  <div className="px-5 py-2 bg-[#F9F9F9] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
                    {config.label}
                  </div>

                  {/* Results */}
                  {items.map((result, idx) => {
                    const globalIndex = results.indexOf(result)
                    const Icon = config.icon
                    return (
                      <button
                        key={result.id}
                        onClick={() => {
                          router.push(result.href)
                          onClose()
                        }}
                        className={`w-full px-5 py-3 flex items-center gap-3 hover:bg-[#F9F9F9] cursor-pointer transition ${
                          globalIndex === selectedIndex ? 'bg-[#F9F9F9]' : ''
                        }`}
                      >
                        <Icon className={`${config.color} flex-shrink-0`} size={14} />
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                            {result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-[11px] text-[#737373] truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Bottom Bar */}
        <div className="px-5 py-2.5 border-t border-[#E5E5E5] flex items-center gap-4 text-[11px] text-[#A3A3A3]">
          <span>↩ open</span>
          <span>↑↓ navigate</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
