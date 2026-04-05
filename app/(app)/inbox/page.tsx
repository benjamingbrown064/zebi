'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import InboxQuickAddModal from '@/components/inbox/InboxQuickAddModal'
import InboxItemCard from '@/components/inbox/InboxItemCard'
import ConvertToTaskModal from '@/components/inbox/ConvertToTaskModal'
import {
  FaPlus,
  FaFilter,
  FaInbox,
} from 'react-icons/fa'
import { useWorkspace } from '@/lib/use-workspace'
import { cachedFetch } from '@/lib/client-cache'

interface InboxItem {
  id: string
  rawText: string
  sourceType: string
  status: string
  capturedAt: string
  processedAt?: string
  transcript?: string
  cleanedText?: string
  assigneeId?: string
  projectId?: string
  dueDate?: string
  priority?: number
  aiProcessed: boolean
  aiSummary?: string
  aiSuggestions?: any
  convertedTaskIds?: string[]
  workspace?: { id: string; name: string }
  project?: { id: string; name: string }
}

interface InboxStats {
  total: number
  unprocessed: number
  processed: number
  converted: number
  completed: number
  archived: number
}

type StatusFilter = 'all' | 'unprocessed' | 'processed' | 'converted' | 'completed'

export default function InboxPage() {
  const router = useRouter()
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [items, setItems] = useState<InboxItem[]>([])
  const [stats, setStats] = useState<InboxStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (workspaceLoading || !workspaceId) return
    loadInbox()
    loadStats()
  }, [workspaceId, workspaceLoading, statusFilter])

  const loadInbox = async () => {
    try {
      setLoading(true)
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const res = await cachedFetch<any>(`/api/inbox?workspaceId=${workspaceId}${statusParam}`)
      if (!res.ok) throw new Error('Failed to fetch inbox items')
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('Failed to load inbox:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await cachedFetch<any>(`/api/inbox?workspaceId=${workspaceId}&action=stats`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleQuickAdd = async (text: string, sourceType: 'text' | 'voice') => {
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, rawText: text, sourceType }),
      })
      if (!res.ok) throw new Error('Failed to create inbox item')
      await loadInbox()
      await loadStats()
      setIsQuickAddOpen(false)
    } catch (err) {
      console.error('Failed to add inbox item:', err)
    }
  }

  const handleUpdateStatus = async (itemId: string, status: string) => {
    try {
      const res = await fetch(`/api/inbox/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await loadInbox()
      await loadStats()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      const res = await fetch(`/api/inbox/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete item')
      await loadInbox()
      await loadStats()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  const handleConvert = (item: InboxItem) => {
    setSelectedItem(item)
    setIsConvertModalOpen(true)
  }

  const handleConvertComplete = async () => {
    setIsConvertModalOpen(false)
    setSelectedItem(null)
    await loadInbox()
    await loadStats()
  }


  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Single Sidebar render */}
      <Sidebar
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

        <ResponsiveHeader
          title="Inbox"
          subtitle="Capture first, organize later"
          primaryAction={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F3F3F3] hover:bg-[#E5E5E5] text-[#474747] border border-[#E5E5E5] rounded font-medium text-[13px] transition-colors min-h-[44px]"
              >
                <FaFilter />
                {!isMobile && <span>Filter</span>}
              </button>
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]"
              >
                <FaPlus />
                {!isMobile && <span>Quick Add</span>}
              </button>
            </div>
          }
        />

        {/* Loading state - inside layout, not a separate full-screen render */}
        {(workspaceLoading || loading) ? (
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                  <div className="h-8 w-10 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-20" />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">

            {/* Stats Cards — tonal surfaces, no borders */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
                <div className="bg-white rounded-xl p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-1">Total</div>
                  <div className="text-2xl font-bold text-[#1A1C1C]">{stats.total}</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-1">Unprocessed</div>
                  <div className="text-2xl font-bold text-[#1A1C1C]">{stats.unprocessed}</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-1">Processed</div>
                  <div className="text-2xl font-bold text-[#1A1C1C]">{stats.processed}</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-1">Converted</div>
                  <div className="text-2xl font-bold text-[#1A1C1C]">{stats.converted}</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-1">Completed</div>
                  <div className="text-2xl font-bold text-[#A3A3A3]">{stats.completed}</div>
                </div>
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <div className="bg-white rounded-xl p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'unprocessed', 'processed', 'converted', 'completed'] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 text-[13px] rounded-md transition font-medium ${
                        statusFilter === status
                          ? 'bg-[#000000] text-white'
                          : 'bg-[#F3F3F3] text-[#474747] hover:bg-[#E5E5E5]'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Inbox Items */}
            {items.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <FaInbox className="text-5xl text-[#E5E5E5] mx-auto mb-4" />
                <h3 className="text-[17px] font-semibold text-[#1A1C1C] mb-2">
                  {statusFilter === 'all' ? 'Your inbox is empty' : `No ${statusFilter} items`}
                </h3>
                <p className="text-[13px] text-[#A3A3A3] mb-6">
                  {statusFilter === 'all' ? 'Capture a thought, idea, or task to get started.' : 'Try a different filter.'}
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]"
                  >
                    <FaPlus />
                    Quick Add
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <InboxItemCard
                    key={item.id}
                    item={item}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                    onConvert={handleConvert}
                  />
                ))}
              </div>
            )}

            {/* Modals */}
            <InboxQuickAddModal
              isOpen={isQuickAddOpen}
              onClose={() => setIsQuickAddOpen(false)}
              onAdd={handleQuickAdd}
              isMobile={isMobile}
            />

            {selectedItem && (
              <ConvertToTaskModal
                isOpen={isConvertModalOpen}
                onClose={() => {
                  setIsConvertModalOpen(false)
                  setSelectedItem(null)
                }}
                inboxItem={selectedItem}
                workspaceId={workspaceId!}
                onComplete={handleConvertComplete}
              />
            )}

            {/* Floating Action Button (Mobile) */}
            {isMobile && (
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-[#000000] text-white rounded-full shadow-lg hover:bg-[#1A1C1C] transition flex items-center justify-center z-40"
              >
                <FaPlus className="text-xl" />
              </button>
            )}
          </div>
        )}    </div>
  )
}
