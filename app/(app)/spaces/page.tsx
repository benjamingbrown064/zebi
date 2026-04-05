'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CaptureBar from '@/components/CaptureBar'
import SpaceForm from '@/components/SpaceForm'
import VoiceEntityModal from '@/components/voice-entity/VoiceEntityModal'
import { useWorkspace } from '@/lib/use-workspace'
import { cachedFetch, invalidateCache, STABLE_TTL } from '@/lib/client-cache'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Space {
  id: string
  name: string
  industry: string | null
  stage: string | null
  revenue: number | null
  logoUrl: string | null
  websiteUrl: string | null
  _count: {
    projects: number
    tasks: number
    documents: number
    insights: number
  }
}

type ViewMode = 'list' | 'grid'

// ─── Icons ────────────────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[#1A1C1C]' : 'text-[#A3A3A3]'}>
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[#1A1C1C]' : 'text-[#A3A3A3]'}>
      <line x1="5" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="2" cy="4" r="1" fill="currentColor"/>
      <circle cx="2" cy="8" r="1" fill="currentColor"/>
      <circle cx="2" cy="12" r="1" fill="currentColor"/>
    </svg>
  )
}

// ─── Space Avatar ─────────────────────────────────────────────────────────────

function SpaceAvatar({ name, logoUrl, size = 'md' }: { name: string; logoUrl: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'w-8 h-8 text-[12px]' : size === 'lg' ? 'w-14 h-14 text-[18px]' : 'w-10 h-10 text-[14px]'
  return (
    <div className={`${dims} rounded bg-[#F3F3F3] border border-[#E5E5E5] flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-[#A3A3A3]">{name[0]?.toUpperCase()}</span>
      )}
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[13px] font-semibold text-[#1A1C1C]">{n}</span>
      <span className="text-[12px] text-[#A3A3A3]">{label}</span>
    </div>
  )
}

// ─── Stage badge ──────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.07em] text-[#474747] bg-[#F3F3F3] border border-[#E5E5E5] px-2 py-0.5 rounded">
      {stage}
    </span>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function SpaceListRow({ space }: { space: Space }) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/spaces/${space.id}`)}
      className="group flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#FAFAFA] cursor-pointer transition-colors border-b border-[#F3F3F3] last:border-b-0"
    >
      {/* Avatar */}
      <SpaceAvatar name={space.name} logoUrl={space.logoUrl} size="md" />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="text-[14px] font-semibold text-[#1A1C1C] truncate">{space.name}</p>
          {space.stage && <StageBadge stage={space.stage} />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {space.industry && (
            <span className="text-[12px] text-[#A3A3A3]">{space.industry}</span>
          )}
          {space.websiteUrl && (
            <>
              {space.industry && <span className="text-[#D4D4D4]">·</span>}
              <span className="text-[12px] text-[#A3A3A3] truncate">
                {space.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stats row — hidden on mobile */}
      <div className="hidden md:flex items-center gap-6 flex-shrink-0">
        <StatPill n={space._count.tasks} label="tasks" />
        <StatPill n={space._count.projects} label="projects" />
        <StatPill n={space._count.documents} label="docs" />
        <StatPill n={space._count.insights} label="insights" />
      </div>

      {/* Revenue */}
      {space.revenue && Number(space.revenue) > 0 && (
        <div className="hidden sm:block flex-shrink-0 text-right w-20">
          <p className="text-[14px] font-bold text-[#1A1C1C]">£{(Number(space.revenue) / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">MRR</p>
        </div>
      )}

      {/* Chevron */}
      <svg className="w-4 h-4 text-[#C6C6C6] group-hover:text-[#474747] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function SpaceGridCard({ space }: { space: Space }) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/spaces/${space.id}`)}
      className="group bg-white border border-[#E5E5E5] rounded p-5 cursor-pointer hover:border-[#C6C6C6] transition-all"
      style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <SpaceAvatar name={space.name} logoUrl={space.logoUrl} size="lg" />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[14px] font-semibold text-[#1A1C1C] truncate">{space.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {space.industry && <span className="text-[12px] text-[#A3A3A3]">{space.industry}</span>}
            {space.industry && space.stage && <span className="text-[#D4D4D4]">·</span>}
            {space.stage && <StageBadge stage={space.stage} />}
          </div>
        </div>
        {space.revenue && Number(space.revenue) > 0 && (
          <div className="flex-shrink-0 text-right">
            <p className="text-[14px] font-bold text-[#1A1C1C]">£{(Number(space.revenue) / 1000).toFixed(1)}k</p>
            <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">MRR</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#F3F3F3] mb-3" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-y-2">
        {[
          { n: space._count.tasks, label: 'tasks' },
          { n: space._count.projects, label: 'projects' },
          { n: space._count.documents, label: 'docs' },
          { n: space._count.insights, label: 'insights' },
        ].map(s => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-bold text-[#1A1C1C]">{s.n}</span>
            <span className="text-[11px] text-[#A3A3A3]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="bg-white rounded border border-[#E5E5E5] overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F3F3F3] last:border-b-0 animate-pulse">
          <div className="w-10 h-10 rounded bg-[#F3F3F3] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#F3F3F3] rounded w-1/3" />
            <div className="h-3 bg-[#F3F3F3] rounded w-1/4" />
          </div>
          <div className="hidden md:flex gap-6">
            {[1, 2, 3, 4].map(j => <div key={j} className="h-3 w-12 bg-[#F3F3F3] rounded" />)}
          </div>
          <div className="w-4 h-4 bg-[#F3F3F3] rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SpacesPage() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (workspaceLoading || !workspaceId) return
    loadSpaces()
  }, [workspaceId, workspaceLoading])

  async function loadSpaces() {
    if (!workspaceId) return
    try {
      invalidateCache(`/api/spaces?workspaceId=${workspaceId}`)
      const data = await cachedFetch<Space[]>(`/api/spaces?workspaceId=${workspaceId}`, { ttl: STABLE_TTL })
      setSpaces(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSpace(formData: any) {
    if (!workspaceId) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, workspaceId }),
      })
      if (res.ok) {
        const newSpace = await res.json()
        setSpaces(prev => [newSpace, ...prev])
        setIsAdding(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const mainClass = ''

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar workspaceName="My Workspace" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      <div className={`${mainClass} transition-all duration-200`}>

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-30 bg-[#F9F9F9] border-b border-[#E5E5E5] px-4 md:px-8 py-3">
          <div className="max-w-[1400px] mx-auto">
            <CaptureBar onCaptured={loadSpaces} />
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-12">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-[#1A1C1C]">Spaces</h1>
              <p className="text-[13px] text-[#A3A3A3] mt-0.5">Your businesses and ventures</p>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-white border border-[#E5E5E5] rounded p-0.5">
                <button
                  onClick={() => setView('list')}
                  className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-[#F3F3F3]' : 'hover:bg-[#F9F9F9]'}`}
                  title="List view"
                >
                  <ListIcon active={view === 'list'} />
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-[#F3F3F3]' : 'hover:bg-[#F9F9F9]'}`}
                  title="Grid view"
                >
                  <GridIcon active={view === 'grid'} />
                </button>
              </div>

              {/* Add space */}
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#000000] hover:bg-[#1A1C1C] text-white text-[13px] font-medium rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Space</span>
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <SkeletonList />
          ) : spaces.length === 0 ? (
            <div className="bg-white rounded border border-dashed border-[#E5E5E5] py-16 text-center">
              <div className="w-12 h-12 rounded bg-[#F3F3F3] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#C6C6C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-[14px] font-medium text-[#1A1C1C] mb-1">No spaces yet</p>
              <p className="text-[13px] text-[#A3A3A3] mb-5">Create your first business unit to get started</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#000000] text-white text-[13px] font-medium rounded hover:bg-[#1A1C1C] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                Create First Space
              </button>
            </div>

          ) : view === 'list' ? (
            /* ── LIST VIEW ── */
            <div>
              {/* Column headers */}
              <div className="hidden md:flex items-center gap-4 px-5 mb-1.5">
                <div className="w-10 flex-shrink-0" />
                <div className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Space</div>
                <div className="flex items-center gap-6 flex-shrink-0 pr-8">
                  {['Tasks', 'Projects', 'Docs', 'Insights'].map(h => (
                    <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] w-[64px]">{h}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded border border-[#E5E5E5] overflow-hidden" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
                {spaces.map(space => (
                  <SpaceListRow key={space.id} space={space} />
                ))}
              </div>
            </div>

          ) : (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map(space => (
                <SpaceGridCard key={space.id} space={space} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Add Space modal ── */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end">
          <div className="w-full max-w-xl h-screen bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-[16px] font-semibold text-[#1A1C1C]">Add a new space</h2>
              <button onClick={() => setIsAdding(false)} className="text-[#A3A3A3] hover:text-[#1A1C1C] transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6 flex-1">
              <SpaceForm
                onSubmit={handleCreateSpace}
                onCancel={() => setIsAdding(false)}
                submitLabel="Create Space"
                isLoading={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      <VoiceEntityModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        entityType="space"
        onSuccess={loadSpaces}
      />
    </div>
  )
}
