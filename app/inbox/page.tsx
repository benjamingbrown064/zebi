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
  FaCheckCircle,
  FaSync 
} from 'react-icons/fa'
import { useWorkspace } from '@/lib/use-workspace'
import LoadingScreen from '@/components/LoadingScreen'

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

  // Load inbox data
  useEffect(() => {
    if (workspaceLoading || !workspaceId) return
    loadInbox()
    loadStats()
  }, [workspaceId, workspaceLoading, statusFilter])

  const loadInbox = async () => {
    try {
      setLoading(true)
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const res = await fetch(`/api/inbox?workspaceId=${workspaceId}${statusParam}`)
      
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
      const res = await fetch(`/api/inbox?workspaceId=${workspaceId}&action=stats`)
      
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
        body: JSON.stringify({
          workspaceId,
          rawText: text,
          sourceType,
        }),
      })

      if (!res.ok) throw new Error('Failed to create inbox item')

      // Reload inbox
      await loadInbox()
      await loadStats()
      setIsQuickAddOpen(false)
    } catch (err) {
      console.error('Failed to add inbox item:', err)
      alert('Failed to add item. Please try again.')
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

      // Reload inbox
      await loadInbox()
      await loadStats()
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const res = await fetch(`/api/inbox/${itemId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete item')

      // Reload inbox
      await loadInbox()
      await loadStats()
    } catch (err) {
      console.error('Failed to delete item:', err)
      alert('Failed to delete item. Please try again.')
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

  if (workspaceLoading || loading) {
    return (
      <div className="flex h-screen bg-[#FAFAFA]">
        <Sidebar
          workspaceName="Loading..."
          isCollapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <div className="flex-1">
          <LoadingScreen message="Loading inbox..." />
        </div>
      </div>
    )
  }

  const mainPaddingClass = sidebarCollapsed
    ? 'md:ml-[72px] ml-0 transition-all duration-200'
    : 'md:ml-64 ml-0 transition-all duration-200'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Inbox"
          subtitle="Capture first, organize later"
          primaryAction={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <FaFilter />
                {!isMobile && <span>Filter</span>}
              </button>
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="px-4 py-2 bg-[#DD3A44] text-white rounded-lg hover:opacity-90 transition flex items-center gap-2 font-medium"
              >
                <FaPlus />
                {!isMobile && <span>Quick Add</span>}
              </button>
            </div>
          }
        />

        <div className="p-4 md:p-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Unprocessed</div>
            <div className="text-2xl font-bold text-[#DD3A44]">{stats.unprocessed}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Processed</div>
            <div className="text-2xl font-bold text-blue-600">{stats.processed}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Converted</div>
            <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Completed</div>
            <div className="text-2xl font-bold text-gray-400">{stats.completed}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-2">
            {(['all', 'unprocessed', 'processed', 'converted', 'completed'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  statusFilter === status
                    ? 'bg-[#DD3A44] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <FaInbox className="text-6xl text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No inbox items yet</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'all' 
              ? 'Click Quick Add to capture your first thought'
              : `No ${statusFilter} items`}
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-6 py-3 bg-[#DD3A44] text-white rounded-lg hover:opacity-90 transition inline-flex items-center gap-2 font-medium"
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#DD3A44] text-white rounded-full shadow-lg hover:opacity-90 transition flex items-center justify-center z-40"
        >
          <FaPlus className="text-xl" />
        </button>
      )}
        </div>
      </div>
    </div>
  )
}
