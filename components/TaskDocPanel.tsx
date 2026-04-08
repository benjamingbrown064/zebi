'use client'

import { useState, useEffect, useRef } from 'react'

interface Doc {
  id: string
  title: string
  documentType?: string
  updatedAt?: string
}

interface TaskDocPanelProps {
  workspaceId: string
  outputDocId?: string | null
  linkedDocIds?: string[]
  onOutputDocChange: (docId: string | null) => void
  onLinkedDocIdsChange: (ids: string[]) => void
}

export default function TaskDocPanel({
  workspaceId,
  outputDocId,
  linkedDocIds = [],
  onOutputDocChange,
  onLinkedDocIdsChange,
}: TaskDocPanelProps) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [outputDoc, setOutputDoc] = useState<Doc | null>(null)
  const [linkedDocs, setLinkedDocs] = useState<Doc[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Doc[]>([])
  const [searchMode, setSearchMode] = useState<'output' | 'linked' | null>(null)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load named docs for output + linked IDs
  useEffect(() => {
    const ids = [outputDocId, ...linkedDocIds].filter(Boolean) as string[]
    if (ids.length === 0) return
    Promise.all(
      ids.map(id =>
        fetch(`/api/documents/${id}`, { headers: { 'x-workspace-id': workspaceId } })
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.document ?? d ?? null)
          .catch(() => null)
      )
    ).then(results => {
      const valid = results.filter(Boolean) as Doc[]
      if (outputDocId) setOutputDoc(valid.find(d => d.id === outputDocId) || null)
      setLinkedDocs(valid.filter(d => d.id !== outputDocId))
    })
  }, [outputDocId, linkedDocIds.join(','), workspaceId])

  // Search docs
  useEffect(() => {
    if (!search.trim() || !searchMode) { setResults([]); return }
    setSearching(true)
    const timer = setTimeout(() => {
      fetch(`/api/documents?workspaceId=${workspaceId}&search=${encodeURIComponent(search)}&limit=8`)
        .then(r => r.json())
        .then(d => setResults(d.documents ?? d ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [search, searchMode, workspaceId])

  const handleSelectOutput = (doc: Doc) => {
    setOutputDoc(doc)
    onOutputDocChange(doc.id)
    setSearch('')
    setSearchMode(null)
    setResults([])
  }

  const handleAddLinked = (doc: Doc) => {
    if (linkedDocIds.includes(doc.id) || doc.id === outputDocId) return
    const newIds = [...linkedDocIds, doc.id]
    setLinkedDocs(prev => [...prev, doc])
    onLinkedDocIdsChange(newIds)
    setSearch('')
    setResults([])
  }

  const handleRemoveLinked = (docId: string) => {
    const newIds = linkedDocIds.filter(id => id !== docId)
    setLinkedDocs(prev => prev.filter(d => d.id !== docId))
    onLinkedDocIdsChange(newIds)
  }

  const handleClearOutput = () => {
    setOutputDoc(null)
    onOutputDocChange(null)
  }

  const openDoc = (docId: string) => {
    window.open(`/documents/${docId}`, '_blank')
  }

  return (
    <div className="border-t border-[#E8E8E8] pt-5 mt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-4">Linked Documents</p>

      {/* Output Doc */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-[#474747] mb-2">Output Document</p>
        {outputDoc ? (
          <div className="flex items-center gap-2 bg-[#F3F3F3] rounded px-3 py-2.5">
            <svg className="w-3.5 h-3.5 text-[#474747] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <button
              onClick={() => openDoc(outputDoc.id)}
              className="flex-1 text-[12px] font-medium text-[#1A1C1C] text-left hover:underline truncate"
            >
              {outputDoc.title}
            </button>
            {outputDoc.documentType && (
              <span className="text-[10px] text-[#A3A3A3] bg-white px-1.5 py-0.5 rounded capitalize flex-shrink-0">
                {outputDoc.documentType}
              </span>
            )}
            <button onClick={handleClearOutput} className="text-[#C6C6C6] hover:text-[#474747] flex-shrink-0 transition">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          searchMode === 'output' ? (
            <div className="relative">
              <input
                ref={searchRef}
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full text-[12px] border border-[#C6C6C6] rounded px-3 py-2 outline-none focus:border-[#1A1C1C] bg-white"
                onBlur={() => setTimeout(() => { setSearchMode(null); setSearch(''); setResults([]) }, 150)}
              />
              {results.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-[#E5E5E5] rounded shadow-sm overflow-hidden">
                  {results.map(doc => (
                    <button
                      key={doc.id}
                      onMouseDown={() => handleSelectOutput(doc)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#F9F9F9] transition"
                    >
                      <svg className="w-3 h-3 text-[#A3A3A3] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-[12px] text-[#1A1C1C] truncate">{doc.title}</span>
                      {doc.documentType && <span className="text-[10px] text-[#A3A3A3] ml-auto capitalize flex-shrink-0">{doc.documentType}</span>}
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-[11px] text-[#A3A3A3] mt-1">Searching…</p>}
            </div>
          ) : (
            <button
              onClick={() => { setSearchMode('output'); setTimeout(() => searchRef.current?.focus(), 50) }}
              className="flex items-center gap-2 text-[12px] text-[#A3A3A3] hover:text-[#1A1C1C] border border-dashed border-[#D4D4D4] rounded px-3 py-2 w-full transition hover:border-[#A3A3A3]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Link output document
            </button>
          )
        )}
      </div>

      {/* Linked Docs */}
      <div>
        <p className="text-[11px] font-semibold text-[#474747] mb-2">References</p>
        <div className="space-y-1.5 mb-2">
          {linkedDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 bg-[#F9F9F9] rounded px-3 py-2">
              <svg className="w-3 h-3 text-[#A3A3A3] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <button
                onClick={() => openDoc(doc.id)}
                className="flex-1 text-[12px] text-[#1A1C1C] text-left hover:underline truncate"
              >
                {doc.title}
              </button>
              <button onClick={() => handleRemoveLinked(doc.id)} className="text-[#C6C6C6] hover:text-[#474747] flex-shrink-0 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add reference */}
        {searchMode === 'linked' ? (
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full text-[12px] border border-[#C6C6C6] rounded px-3 py-2 outline-none focus:border-[#1A1C1C] bg-white"
              onBlur={() => setTimeout(() => { setSearchMode(null); setSearch(''); setResults([]) }, 150)}
            />
            {results.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-[#E5E5E5] rounded shadow-sm overflow-hidden">
                {results.map(doc => (
                  <button
                    key={doc.id}
                    onMouseDown={() => handleAddLinked(doc)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#F9F9F9] transition"
                  >
                    <svg className="w-3 h-3 text-[#A3A3A3] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[12px] text-[#1A1C1C] truncate">{doc.title}</span>
                    {doc.documentType && <span className="text-[10px] text-[#A3A3A3] ml-auto capitalize flex-shrink-0">{doc.documentType}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setSearchMode('linked')}
            className="flex items-center gap-2 text-[12px] text-[#A3A3A3] hover:text-[#1A1C1C] border border-dashed border-[#D4D4D4] rounded px-3 py-2 w-full transition hover:border-[#A3A3A3]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add reference doc
          </button>
        )}
      </div>
    </div>
  )
}
