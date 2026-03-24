'use client'
import { cachedFetch } from '@/lib/client-cache'

import { useEffect, useState } from 'react'

// Renders TipTap JSON as readable styled HTML for preview
function DocumentContentPreview({ content }: { content: any }) {
  if (!content || !content.content || content.content.length === 0) {
    return <p className="text-[#A3A3A3] text-[14px] italic">No content yet.</p>
  }

  function renderNode(node: any, index: number): React.ReactNode {
    switch (node.type) {
      case 'heading': {
        const text = node.content?.map((n: any) => n.text).join('') ?? ''
        const level = node.attrs?.level ?? 1
        const cls = level === 1
          ? 'text-[20px] font-bold text-[#1A1A1A] mt-5 mb-2'
          : level === 2
          ? 'text-[17px] font-semibold text-[#1A1A1A] mt-4 mb-1'
          : 'text-[15px] font-semibold text-[#525252] mt-3 mb-1'
        return <p key={index} className={cls}>{text}</p>
      }
      case 'paragraph': {
        if (!node.content) return <br key={index} />
        const children = node.content.map((n: any, i: number) => {
          let el: React.ReactNode = n.text ?? ''
          if (n.marks) {
            n.marks.forEach((m: any) => {
              if (m.type === 'bold') el = <strong key={i}>{el}</strong>
              if (m.type === 'italic') el = <em key={i}>{el}</em>
              if (m.type === 'link') el = <a key={i} href={m.attrs.href} className="text-[#DD3A44] underline" target="_blank" rel="noopener noreferrer">{el}</a>
            })
          }
          return el
        })
        return <p key={index} className="text-[14px] text-[#525252] mb-2 leading-relaxed">{children}</p>
      }
      case 'bulletList':
        return <ul key={index} className="list-disc pl-5 mb-2 space-y-1">{node.content?.map((n: any, i: number) => renderNode(n, i))}</ul>
      case 'orderedList':
        return <ol key={index} className="list-decimal pl-5 mb-2 space-y-1">{node.content?.map((n: any, i: number) => renderNode(n, i))}</ol>
      case 'listItem':
        return <li key={index} className="text-[14px] text-[#525252]">{node.content?.map((n: any, i: number) => renderNode(n, i))}</li>
      case 'blockquote':
        return <blockquote key={index} className="border-l-4 border-[#E5E5E5] pl-4 italic text-[#737373] mb-2">{node.content?.map((n: any, i: number) => renderNode(n, i))}</blockquote>
      default:
        return null
    }
  }

  return (
    <div className="max-w-none">
      {content.content.map((node: any, i: number) => renderNode(node, i))}
    </div>
  )
}
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFolderOpen,
  faFileLines,
  faLightbulb,
  faBrain,
  faFolder,
  faHistory,
  faGlobe,
  faEdit,
  faBox,
  faListCheck,
  faBullseye,
  faEllipsisH,
  faPlus,
  faTimes,
  faExternalLink,
  faStickyNote,
} from '@fortawesome/pro-duotone-svg-icons'
import Sidebar from '@/components/Sidebar'
import SpaceForm from '@/components/SpaceForm'
import LoadingSpinner from '@/components/LoadingSpinner'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'

interface Space {
  id: string
  name: string
  industry: string | null
  stage: string | null
  businessModel: string | null
  missionStatement: string | null
  executiveSummary: string | null
  vision: string | null
  targetCustomers: string | null
  marketSize: string | null
  coreProduct: string | null
  positioning: string | null
  logoUrl: string | null
  websiteUrl: string | null
  revenue: number | null
  createdAt: string
  updatedAt: string
  projects: any[]
  documents: any[]
  notes: any[]
  insights: any[]
  memories: any[]
  files: any[]
  objectives: any[]
  tasks: any[]
  _count: {
    projects: number
    tasks: number
    documents: number
    notes: number
    insights: number
    memories: number
    files: number
    objectives: number
  }
}

type TabType = 'overview' | 'projects' | 'documents' | 'notes' | 'objectives' | 'tasks'
type MoreMenuType = 'insights' | 'memory' | 'files' | 'activity'

export default function SpaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [space, setSpace] = useState<Space | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [moreMenuTab, setMoreMenuTab] = useState<MoreMenuType | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  // Modal states
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [selectedInsight, setSelectedInsight] = useState<any>(null)
  const [selectedMemory, setSelectedMemory] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  
  // Creation modals
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [projectFormData, setProjectFormData] = useState({ title: '', description: '' })
  const [creatingProject, setCreatingProject] = useState(false)
  
  const [showCreateDocument, setShowCreateDocument] = useState(false)
  const [documentFormData, setDocumentFormData] = useState({ title: '', documentType: 'general' })
  const [creatingDocument, setCreatingDocument] = useState(false)
  
  const [showCreateObjective, setShowCreateObjective] = useState(false)
  const [objectiveFormData, setObjectiveFormData] = useState({ title: '', description: '' })
  const [creatingObjective, setCreatingObjective] = useState(false)
  
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '' })
  const [creatingTask, setCreatingTask] = useState(false)
  
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [noteFormData, setNoteFormData] = useState({ title: '', body: '', noteType: 'general' })
  const [creatingNote, setCreatingNote] = useState(false)
  const [editingNote, setEditingNote] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadSpace()
  }, [companyId])

  useEffect(() => {
    if (moreMenuTab === 'activity') {
      loadActivity()
    }
  }, [moreMenuTab])

  // Close More dropdown when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.more-menu-container')) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMoreMenu])

  async function loadSpace() {
    try {
      const data = await cachedFetch<Space>(`/api/spaces/${companyId}`)
      setSpace(data)
    } catch (error: any) {
      console.error('Failed to load space:', error)
      if (error?.message?.includes('404')) {
        router.push('/spaces')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadActivity() {
    setLoadingActivity(true)
    try {
      const response = await fetch(`/api/activity?companyId=${companyId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setActivityLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  async function handleUpdateSpace(formData: any) {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/spaces/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedSpace = await response.json()
        setSpace(updatedSpace)
        setIsEditing(false)
      } else {
        alert('Failed to update space')
      }
    } catch (error) {
      console.error('Failed to update space:', error)
      alert('Failed to update space')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateProject() {
    if (!projectFormData.title.trim()) {
      alert('Project title is required')
      return
    }

    setCreatingProject(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: projectFormData.title,
          description: projectFormData.description,
          createdBy: 'user-id', // TODO: Get from auth
        }),
      })

      if (response.ok) {
        await loadSpace()
        setShowCreateProject(false)
        setProjectFormData({ title: '', description: '' })
      } else {
        alert('Failed to create project')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleCreateDocument() {
    if (!documentFormData.title.trim()) {
      alert('Document title is required')
      return
    }

    setCreatingDocument(true)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: documentFormData.title,
          documentType: documentFormData.documentType,
        }),
      })

      if (response.ok) {
        await loadSpace()
        setShowCreateDocument(false)
        setDocumentFormData({ title: '', documentType: 'general' })
      } else {
        alert('Failed to create document')
      }
    } catch (error) {
      console.error('Failed to create document:', error)
      alert('Failed to create document')
    } finally {
      setCreatingDocument(false)
    }
  }

  async function handleCreateObjective() {
    if (!objectiveFormData.title.trim()) {
      alert('Objective title is required')
      return
    }

    setCreatingObjective(true)
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: objectiveFormData.title,
          description: objectiveFormData.description,
        }),
      })

      if (response.ok) {
        await loadSpace()
        setShowCreateObjective(false)
        setObjectiveFormData({ title: '', description: '' })
      } else {
        alert('Failed to create objective')
      }
    } catch (error) {
      console.error('Failed to create objective:', error)
      alert('Failed to create objective')
    } finally {
      setCreatingObjective(false)
    }
  }

  async function handleCreateTask() {
    if (!taskFormData.title.trim()) {
      alert('Task title is required')
      return
    }

    setCreatingTask(true)
    try {
      const response = await fetch('/api/tasks/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: taskFormData.title,
          description: taskFormData.description,
        }),
      })

      if (response.ok) {
        await loadSpace()
        setShowCreateTask(false)
        setTaskFormData({ title: '', description: '' })
      } else {
        alert('Failed to create task')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

  async function handleCreateNote() {
    if (!noteFormData.title.trim()) {
      alert('Note title is required')
      return
    }

    setCreatingNote(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          companyId: companyId,
          title: noteFormData.title,
          body: noteFormData.body,
          noteType: noteFormData.noteType,
        }),
      })

      if (response.ok) {
        await loadSpace()
        setShowCreateNote(false)
        setNoteFormData({ title: '', body: '', noteType: 'general' })
      } else {
        alert('Failed to create note')
      }
    } catch (error) {
      console.error('Failed to create note:', error)
      alert('Failed to create note')
    } finally {
      setCreatingNote(false)
    }
  }

  async function handleUpdateNote() {
    if (!selectedNote || !noteFormData.title.trim()) {
      alert('Note title is required')
      return
    }

    setEditingNote(true)
    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
          title: noteFormData.title,
          body: noteFormData.body,
          noteType: noteFormData.noteType,
        }),
      })

      if (response.ok) {
        await loadSpace()
        setSelectedNote(null)
        setNoteFormData({ title: '', body: '', noteType: 'general' })
      } else {
        alert('Failed to update note')
      }
    } catch (error) {
      console.error('Failed to update note:', error)
      alert('Failed to update note')
    } finally {
      setEditingNote(false)
    }
  }

  function handleMoreMenuClick(tab: MoreMenuType) {
    setActiveTab('overview' as any) // Reset main tab
    setMoreMenuTab(tab)
    setShowMoreMenu(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!space) {
    return null
  }

  const mainTabs = [
    { id: 'overview', label: 'Overview', icon: faBox },
    { id: 'projects', label: 'Projects', icon: faFolderOpen, count: space._count.projects },
    { id: 'documents', label: 'Documents', icon: faFileLines, count: space._count.documents },
    { id: 'notes', label: 'Notes', icon: faStickyNote, count: space._count.notes },
    { id: 'objectives', label: 'Objectives', icon: faBullseye, count: space._count.objectives },
    { id: 'tasks', label: 'Tasks', icon: faListCheck, count: space._count.tasks },
  ]

  const moreMenuItems = [
    { id: 'insights', label: 'Insights', icon: faLightbulb, count: space._count.insights },
    { id: 'memory', label: 'Memory', icon: faBrain, count: space._count.memories },
    { id: 'files', label: 'Files', icon: faFolder, count: space._count.files },
    { id: 'activity', label: 'Activity', icon: faHistory },
  ]

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-16' : 'ml-64'
  const activeView = moreMenuTab || activeTab

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={mainPaddingClass}>
        {/* Header - Tabs Only */}
        <header className="bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 md:px-12 py-4 md:py-6">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto flex-1 mr-4 scrollbar-hide">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType)
                    setMoreMenuTab(null)
                  }}
                  className={`px-3 md:px-4 py-2 rounded-[10px] text-[12px] md:text-[13px] font-medium flex items-center gap-2 whitespace-nowrap transition min-h-[44px] ${
                    activeTab === tab.id && !moreMenuTab
                      ? 'bg-[#FEF2F2] text-[#DD3A44]'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} />
                  <span className={isMobile ? 'hidden' : ''}>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-2 py-0.5 bg-[#E5E5E5] text-[#525252] rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}

              {/* More Menu */}
              <div className="relative more-menu-container">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`px-3 md:px-4 py-2 rounded-[10px] text-[12px] md:text-[13px] font-medium flex items-center gap-2 whitespace-nowrap transition min-h-[44px] ${
                    moreMenuTab
                      ? 'bg-[#FEF2F2] text-[#DD3A44]'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <FontAwesomeIcon icon={faEllipsisH} />
                  <span className={isMobile ? 'hidden' : ''}>More</span>
                </button>

                {showMoreMenu && (
                  <div className="absolute top-full mt-2 right-0 bg-white  rounded-[10px] shadow-[0_20px_40px_rgba(28,27,27,0.06)] min-w-[180px] py-2 z-20">
                    {moreMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleMoreMenuClick(item.id as MoreMenuType)}
                        className={`w-full px-4 py-2 text-left text-[13px] flex items-center gap-3 hover:bg-[#F5F5F5] transition ${
                          moreMenuTab === item.id ? 'text-[#DD3A44] bg-[#FEF2F2]' : 'text-[#525252]'
                        }`}
                      >
                        <FontAwesomeIcon icon={item.icon} className="w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="px-2 py-0.5 bg-[#E5E5E5] text-[#525252] rounded-full text-xs">
                            {item.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 md:px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-[10px] transition flex items-center gap-2 min-h-[44px] text-[12px] md:text-[13px] flex-shrink-0"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <ResponsivePageContainer>
          <main className="py-6 md:py-12 w-full">
            {/* Space Info */}
            <div className="max-w-full mb-6 md:mb-8">
              <div className="flex items-start gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#F5F5F5] rounded-[14px] flex items-center justify-center flex-shrink-0">
                  {space.logoUrl ? (
                    <img
                      src={space.logoUrl}
                      alt={space.name}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <FontAwesomeIcon icon={faBox} className="text-[#737373] text-2xl md:text-3xl" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-[20px] md:text-[30px] leading-[28px] md:leading-[36px] font-medium text-[#1A1A1A] mb-2">{space.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[12px] md:text-[13px] text-[#525252] mb-2">
                    {space.industry && <span>{space.industry}</span>}
                    {space.industry && space.stage && <span>•</span>}
                    {space.stage && <span className="capitalize">{space.stage}</span>}
                    {space.revenue && (
                      <>
                        <span>•</span>
                        <span className="font-semibold">£{(Number(space.revenue) / 1000).toFixed(1)}k MRR</span>
                      </>
                    )}
                  </div>
                  {space.websiteUrl && (
                    <a
                      href={space.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] text-[#DD3A44] hover:text-[#C7333D] transition"
                    >
                      <FontAwesomeIcon icon={faGlobe} />
                      {space.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Overview Tab */}
            {activeView === 'overview' && (
              <div className="w-full space-y-6">
                {space.missionStatement && (
                  <div className="bg-white  rounded-[14px] p-6">
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Mission Statement</h3>
                    <p className="text-[#525252] text-[15px]">{space.missionStatement}</p>
                  </div>
                )}

                {space.executiveSummary && (
                  <div className="bg-white  rounded-[14px] p-6">
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Executive Summary</h3>
                    <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{space.executiveSummary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {space.vision && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Vision</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{space.vision}</p>
                    </div>
                  )}

                  {space.businessModel && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Business Model</h3>
                      <p className="text-[#525252] text-[15px]">{space.businessModel}</p>
                    </div>
                  )}

                  {space.targetCustomers && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Target Customers</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{space.targetCustomers}</p>
                    </div>
                  )}

                  {space.marketSize && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Market Size</h3>
                      <p className="text-[#525252] text-[15px]">{space.marketSize}</p>
                    </div>
                  )}

                  {space.coreProduct && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Core Product</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{space.coreProduct}</p>
                    </div>
                  )}

                  {space.positioning && (
                    <div className="bg-white  rounded-[14px] p-6">
                      <h3 className="font-semibold text-[#1A1A1A] mb-2">Positioning</h3>
                      <p className="text-[#525252] text-[15px] whitespace-pre-wrap">{space.positioning}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeView === 'projects' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Projects</h2>
                  <button 
                    onClick={() => setShowCreateProject(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Project
                  </button>
                </div>

                {space.projects.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faFolderOpen} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No projects yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {space.projects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer">
                          <h3 className="font-semibold text-[#1A1A1A] mb-2">{project.name}</h3>
                          {project.description && (
                            <p className="text-[13px] text-[#525252] mb-3 line-clamp-2">{project.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[12px] text-[#A3A3A3]">
                            <span>{project.tasks?.length || 0} tasks</span>
                            {project.objective && (
                              <span className="px-2 py-1 bg-[#FEF2F2] text-[#DD3A44] rounded-[6px]">
                                🎯 {project.objective.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeView === 'documents' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Documents</h2>
                  <button 
                    onClick={() => setShowCreateDocument(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Document
                  </button>
                </div>

                {space.documents.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faFileLines} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No documents yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {space.documents.map((doc: any) => {
                      // Extract a short text preview from TipTap JSON
                      const previewText = (() => {
                        try {
                          const nodes = doc.contentRich?.content ?? []
                          for (const node of nodes) {
                            if (node.type === 'paragraph' && node.content) {
                              const text = node.content.map((n: any) => n.text ?? '').join('').trim()
                              if (text) return text.length > 120 ? text.slice(0, 120) + '…' : text
                            }
                          }
                        } catch {}
                        return null
                      })()
                      return (
                        <div 
                          key={doc.id} 
                          onClick={() => setSelectedDocument(doc)}
                          className="bg-white rounded-[14px] p-5 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer border border-transparent hover:border-[#F0F0F0]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[#1A1A1A] truncate">{doc.title}</h3>
                              <p className="text-[11px] text-[#A3A3A3] mt-0.5 capitalize">
                                {doc.documentType} · Updated {new Date(doc.updatedAt).toLocaleDateString()}
                              </p>
                              {previewText && (
                                <p className="text-[13px] text-[#737373] mt-2 leading-relaxed line-clamp-2">{previewText}</p>
                              )}
                            </div>
                            <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3] mt-1 flex-shrink-0" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeView === 'notes' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Notes</h2>
                  <button 
                    onClick={() => {
                      setNoteFormData({ title: '', body: '', noteType: 'general' })
                      setShowCreateNote(true)
                    }}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Note
                  </button>
                </div>

                {space.notes.length === 0 ? (
                  <div className="bg-white rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faStickyNote} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No notes yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {space.notes.map((note: any) => {
                      const previewText = note.body.length > 150 ? note.body.slice(0, 150) + '…' : note.body
                      return (
                        <div 
                          key={note.id} 
                          onClick={() => setSelectedNote(note)}
                          className="bg-white rounded-[14px] p-5 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer border border-transparent hover:border-[#F0F0F0]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-[#1A1A1A] truncate">{note.title}</h3>
                                <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-[#f6f3f2] text-[#5a5757] capitalize flex-shrink-0">
                                  {note.noteType}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                                Updated {new Date(note.updatedAt).toLocaleDateString()}
                                {note.author && ` · ${note.author}`}
                              </p>
                              {previewText && (
                                <p className="text-[13px] text-[#737373] mt-2 leading-relaxed line-clamp-2 whitespace-pre-wrap">{previewText}</p>
                              )}
                            </div>
                            <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3] mt-1 flex-shrink-0" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Objectives Tab */}
            {activeView === 'objectives' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Objectives</h2>
                  <button 
                    onClick={() => setShowCreateObjective(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Objective
                  </button>
                </div>

                {space.objectives.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faBullseye} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No objectives linked to this space.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {space.objectives.map((objective: any) => (
                      <Link key={objective.id} href={`/objectives/${objective.id}`}>
                        <div className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer">
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`px-2 py-1 rounded-[6px] text-[12px] font-medium ${
                                objective.status === 'active'
                                  ? 'bg-[#f0fafa] text-[#006766]'
                                  : objective.status === 'on_track'
                                  ? 'bg-[#f0fafa] text-[#006766]'
                                  : objective.status === 'at_risk'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-[#f6f3f2] text-[#5a5757]'
                              }`}
                            >
                              {objective.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="font-semibold text-[#1A1A1A] mb-2">{objective.title}</h3>
                          {objective.description && (
                            <p className="text-[13px] text-[#525252] line-clamp-2">{objective.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeView === 'tasks' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Tasks</h2>
                  <button 
                    onClick={() => setShowCreateTask(true)}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Task
                  </button>
                </div>

                {space.tasks.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faListCheck} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No tasks assigned to this space.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {space.tasks.map((task: any) => (
                      <div 
                        key={task.id}
                        className="bg-white  rounded-[14px] p-4 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!task.completedAt}
                            className="mt-1 w-4 h-4 rounded border-[#D4D4D4]"
                            readOnly
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-[#1A1A1A] mb-1">{task.title}</h3>
                            <div className="flex items-center gap-2 text-[12px] text-[#A3A3A3]">
                              {task.project && <span>{task.project.name}</span>}
                              {task.objective && (
                                <>
                                  <span>•</span>
                                  <span>{task.objective.title}</span>
                                </>
                              )}
                              {task.dueAt && (
                                <>
                                  <span>•</span>
                                  <span>Due {new Date(task.dueAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Insights (More Menu) */}
            {activeView === 'insights' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Insights</h2>
                  <button className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition">
                    <FontAwesomeIcon icon={faPlus} />
                    Add Insight
                  </button>
                </div>

                {space.insights.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faLightbulb} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No insights yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {space.insights.map((insight: any) => (
                      <div 
                        key={insight.id}
                        onClick={() => setSelectedInsight(insight)}
                        className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-[6px] text-[12px] font-medium ${
                                insight.status === 'new'
                                  ? 'bg-[#f0fafa] text-[#006766]'
                                  : 'bg-[#f6f3f2] text-[#5a5757]'
                              }`}
                            >
                              {insight.status}
                            </span>
                            <span className="text-[12px] text-[#A3A3A3]">{insight.insightType}</span>
                          </div>
                          <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                        </div>
                        <h3 className="font-semibold text-[#1A1A1A] mb-2">{insight.title}</h3>
                        <p className="text-[#525252] text-[15px]">{insight.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Memory (More Menu) */}
            {activeView === 'memory' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Memory</h2>
                  <button className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition">
                    <FontAwesomeIcon icon={faPlus} />
                    Add Memory
                  </button>
                </div>

                {space.memories.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faBrain} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No memories yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {space.memories.map((memory: any) => (
                      <div 
                        key={memory.id}
                        onClick={() => setSelectedMemory(memory)}
                        className="bg-white  rounded-[14px] p-6 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[12px] text-[#A3A3A3]">{memory.memoryType}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#A3A3A3]">
                              Confidence: {memory.confidenceScore}/10
                            </span>
                            <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                          </div>
                        </div>
                        <h3 className="font-semibold text-[#1A1A1A] mb-2">{memory.title}</h3>
                        <p className="text-[#525252] text-[15px]">{memory.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Files (More Menu) */}
            {activeView === 'files' && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-medium text-[#1A1A1A]">Files</h2>
                  <button className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] flex items-center gap-2 text-[13px] font-medium transition">
                    <FontAwesomeIcon icon={faPlus} />
                    Upload File
                  </button>
                </div>

                {space.files.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faFolder} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No files yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {space.files.map((file: any) => (
                      <div 
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className="bg-white  rounded-[14px] p-4 hover:shadow-[0_4px_12px_rgba(28,27,27,0.08)] transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-medium text-[#1A1A1A]">{file.filename}</h3>
                          <p className="text-[12px] text-[#A3A3A3] mt-1">
                            {(Number(file.sizeBytes) / 1024).toFixed(1)} KB • Uploaded{' '}
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <FontAwesomeIcon icon={faExternalLink} className="text-[#A3A3A3]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity (More Menu) */}
            {activeView === 'activity' && (
              <div className="w-full">
                <h2 className="text-[20px] font-medium text-[#1A1A1A] mb-6">Activity</h2>

                {loadingActivity ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="bg-white  rounded-[14px] p-8 text-center">
                    <FontAwesomeIcon icon={faHistory} className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                    <p className="text-[#A3A3A3] text-[15px]">No activity yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log: any) => (
                      <div key={log.id} className="bg-white  rounded-[14px] p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={faHistory} className="text-[#A3A3A3] text-xs" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[15px] text-[#1A1A1A]">
                              <span className="font-medium">{log.eventType.replace(/_/g, ' ')}</span>
                            </p>
                            <p className="text-[12px] text-[#A3A3A3] mt-1">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </ResponsivePageContainer>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className={`
              bg-white shadow-[0_20px_40px_rgba(28,27,27,0.06)] w-full overflow-y-auto
              ${isMobile 
                ? 'h-full rounded-none' 
                : 'rounded-[14px] max-w-2xl max-h-[90vh]'
              }
            `}>
              <div className="sticky top-0 bg-white px-4 md:px-8 py-4 md:py-6">
                <h2 className="text-lg md:text-xl font-semibold text-[#1A1A1A]">Edit {space.name}</h2>
              </div>
              <div className="px-4 md:px-8 py-4 md:py-6">
                <SpaceForm
                  initialData={{
                    name: space.name,
                    industry: space.industry || '',
                    stage: space.stage || 'startup',
                    businessModel: space.businessModel || '',
                    missionStatement: space.missionStatement || '',
                    executiveSummary: space.executiveSummary || '',
                    vision: space.vision || '',
                    targetCustomers: space.targetCustomers || '',
                    marketSize: space.marketSize || '',
                    coreProduct: space.coreProduct || '',
                    positioning: space.positioning || '',
                    logoUrl: space.logoUrl || '',
                    websiteUrl: space.websiteUrl || '',
                    revenue: space.revenue ? String(space.revenue) : '',
                  }}
                  onSubmit={handleUpdateSpace}
                  onCancel={() => setIsEditing(false)}
                  submitLabel="Save Changes"
                  isLoading={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Modal */}
        {selectedDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className={`bg-white w-full overflow-y-auto ${isMobile ? 'h-full rounded-none' : 'rounded-[14px] max-w-3xl max-h-[90vh]'}`}>
              <div className="sticky top-0 bg-white px-4 md:px-6 py-4 flex items-center justify-between border-b border-[#F0F0F0]">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-lg font-semibold text-[#1A1A1A] truncate">{selectedDocument.title}</h2>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5 capitalize">
                    {selectedDocument.documentType} · Updated {new Date(selectedDocument.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/documents/${selectedDocument.id}`}>
                    <button className="px-3 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition">
                      Open &amp; Edit
                    </button>
                  </Link>
                  <button 
                    onClick={() => setSelectedDocument(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <DocumentContentPreview content={selectedDocument.contentRich} />
              </div>
            </div>
          </div>
        )}

        {/* Insight Modal */}
        {selectedInsight && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedInsight.title}</h2>
                <div className="flex items-center gap-2">
                  <Link href={`/insights/${selectedInsight.id}`}>
                    <button className="px-3 py-2 text-[#DD3A44] hover:bg-[#FEF2F2] rounded-[10px] text-[13px] font-medium transition">
                      View Full
                    </button>
                  </Link>
                  <button 
                    onClick={() => setSelectedInsight(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-[6px] text-[12px] font-medium ${
                    selectedInsight.status === 'new' ? 'bg-[#f0fafa] text-[#006766]' : 'bg-[#f6f3f2] text-[#5a5757]'
                  }`}>
                    {selectedInsight.status}
                  </span>
                  <span className="text-[12px] text-[#A3A3A3]">{selectedInsight.insightType}</span>
                </div>
                <p className="text-[#525252] text-[15px]">{selectedInsight.summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Memory Modal */}
        {selectedMemory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedMemory.title}</h2>
                <div className="flex items-center gap-2">
                  <Link href={`/memory/${selectedMemory.id}`}>
                    <button className="px-3 py-2 text-[#DD3A44] hover:bg-[#FEF2F2] rounded-[10px] text-[13px] font-medium transition">
                      View Full
                    </button>
                  </Link>
                  <button 
                    onClick={() => setSelectedMemory(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] text-[#A3A3A3]">{selectedMemory.memoryType}</span>
                  <span className="text-[12px] text-[#525252]">
                    Confidence: {selectedMemory.confidenceScore}/10
                  </span>
                </div>
                <p className="text-[#525252] text-[15px]">{selectedMemory.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* File Modal */}
        {selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedFile.filename}</h2>
                <div className="flex items-center gap-2">
                  <a 
                    href={selectedFile.url}
                    download
                    className="px-3 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition"
                  >
                    Download
                  </a>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 text-[12px] text-[#A3A3A3]">
                  {(Number(selectedFile.sizeBytes) / 1024).toFixed(1)} KB • Uploaded{' '}
                  {new Date(selectedFile.uploadedAt).toLocaleDateString()}
                </div>
                <div className="bg-[#F5F5F5] rounded-[10px] p-8 text-center">
                  <p className="text-[#525252]">File preview coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Project</h2>
                <button 
                  onClick={() => {
                    setShowCreateProject(false)
                    setProjectFormData({ title: '', description: '' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectFormData.title}
                    onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                    placeholder="Enter project name"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={projectFormData.description}
                    onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                    placeholder="Enter project description (optional)"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition resize-none"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This project will be linked to <span className="font-medium text-[#1A1A1A]">{space?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateProject(false)
                    setProjectFormData({ title: '', description: '' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingProject}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={creatingProject || !projectFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Document Modal */}
        {showCreateDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Document</h2>
                <button 
                  onClick={() => {
                    setShowCreateDocument(false)
                    setDocumentFormData({ title: '', documentType: 'general' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={documentFormData.title}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, title: e.target.value })}
                    placeholder="Enter document title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Document Type
                  </label>
                  <select
                    value={documentFormData.documentType}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, documentType: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] focus:outline-none focus:border-[#DD3A44] transition"
                  >
                    <option value="general">General</option>
                    <option value="strategy">Strategy</option>
                    <option value="plan">Plan</option>
                    <option value="analysis">Analysis</option>
                    <option value="report">Report</option>
                  </select>
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This document will be linked to <span className="font-medium text-[#1A1A1A]">{space?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateDocument(false)
                    setDocumentFormData({ title: '', documentType: 'general' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingDocument}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDocument}
                  disabled={creatingDocument || !documentFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingDocument ? 'Creating...' : 'Create Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Objective Modal */}
        {showCreateObjective && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Objective</h2>
                <button 
                  onClick={() => {
                    setShowCreateObjective(false)
                    setObjectiveFormData({ title: '', description: '' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Objective Title *
                  </label>
                  <input
                    type="text"
                    value={objectiveFormData.title}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, title: e.target.value })}
                    placeholder="Enter objective title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={objectiveFormData.description}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, description: e.target.value })}
                    placeholder="Enter objective description (optional)"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition resize-none"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This objective will be linked to <span className="font-medium text-[#1A1A1A]">{space?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateObjective(false)
                    setObjectiveFormData({ title: '', description: '' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingObjective}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateObjective}
                  disabled={creatingObjective || !objectiveFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingObjective ? 'Creating...' : 'Create Objective'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-lg w-full">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Task</h2>
                <button 
                  onClick={() => {
                    setShowCreateTask(false)
                    setTaskFormData({ title: '', description: '' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    placeholder="Enter task title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Description
                  </label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition resize-none"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This task will be linked to <span className="font-medium text-[#1A1A1A]">{space?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateTask(false)
                    setTaskFormData({ title: '', description: '' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingTask}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !taskFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Note Modal */}
        {showCreateNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Create Note</h2>
                <button 
                  onClick={() => {
                    setShowCreateNote(false)
                    setNoteFormData({ title: '', body: '', noteType: 'general' })
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={noteFormData.title}
                    onChange={(e) => setNoteFormData({ ...noteFormData, title: e.target.value })}
                    placeholder="Enter note title"
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Note Type
                  </label>
                  <select
                    value={noteFormData.noteType}
                    onChange={(e) => setNoteFormData({ ...noteFormData, noteType: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] focus:outline-none focus:border-[#DD3A44] transition"
                  >
                    <option value="general">General</option>
                    <option value="strategy">Strategy</option>
                    <option value="plan">Plan</option>
                    <option value="meeting">Meeting</option>
                    <option value="briefing">Briefing</option>
                    <option value="ops">Ops</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Body
                  </label>
                  <textarea
                    value={noteFormData.body}
                    onChange={(e) => setNoteFormData({ ...noteFormData, body: e.target.value })}
                    placeholder="Write your note here... (supports basic markdown)"
                    rows={12}
                    className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition font-mono"
                  />
                </div>

                <div className="text-[13px] text-[#A3A3A3]">
                  This note will be linked to <span className="font-medium text-[#1A1A1A]">{space?.name}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => {
                    setShowCreateNote(false)
                    setNoteFormData({ title: '', body: '', noteType: 'general' })
                  }}
                  className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  disabled={creatingNote}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNote}
                  disabled={creatingNote || !noteFormData.title.trim()}
                  className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingNote ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View/Edit Note Modal */}
        {selectedNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-[#1A1A1A]">
                    {editingNote ? 'Edit Note' : 'Note'}
                  </h2>
                  <span className="px-2 py-1 rounded-[6px] text-[12px] font-medium bg-[#f6f3f2] text-[#5a5757] capitalize">
                    {selectedNote.noteType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!editingNote && (
                    <button 
                      onClick={() => {
                        setNoteFormData({
                          title: selectedNote.title,
                          body: selectedNote.body,
                          noteType: selectedNote.noteType,
                        })
                        setEditingNote(true)
                      }}
                      className="px-3 py-1.5 text-[#DD3A44] hover:bg-[#FFF5F5] rounded-[8px] text-[13px] font-medium transition"
                    >
                      <FontAwesomeIcon icon={faEdit} className="mr-1.5" />
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedNote(null)
                      setEditingNote(false)
                      setNoteFormData({ title: '', body: '', noteType: 'general' })
                    }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F5] rounded-[10px] transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[#A3A3A3]" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {editingNote ? (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={noteFormData.title}
                        onChange={(e) => setNoteFormData({ ...noteFormData, title: e.target.value })}
                        placeholder="Enter note title"
                        className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                        Note Type
                      </label>
                      <select
                        value={noteFormData.noteType}
                        onChange={(e) => setNoteFormData({ ...noteFormData, noteType: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] focus:outline-none focus:border-[#DD3A44] transition"
                      >
                        <option value="general">General</option>
                        <option value="strategy">Strategy</option>
                        <option value="plan">Plan</option>
                        <option value="meeting">Meeting</option>
                        <option value="briefing">Briefing</option>
                        <option value="ops">Ops</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                        Body
                      </label>
                      <textarea
                        value={noteFormData.body}
                        onChange={(e) => setNoteFormData({ ...noteFormData, body: e.target.value })}
                        placeholder="Write your note here..."
                        rows={12}
                        className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-[#1A1A1A]">{selectedNote.title}</h1>
                    <div className="text-[12px] text-[#A3A3A3]">
                      Updated {new Date(selectedNote.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {selectedNote.author && ` · ${selectedNote.author}`}
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-[15px] text-[#1A1A1A] leading-relaxed">
                        {selectedNote.body.split('\n').map((line: string, i: number) => {
                          // Basic markdown rendering
                          if (line.startsWith('# ')) {
                            return <h1 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h1>
                          }
                          if (line.startsWith('## ')) {
                            return <h2 key={i} className="text-xl font-bold mt-5 mb-2">{line.slice(3)}</h2>
                          }
                          if (line.startsWith('### ')) {
                            return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>
                          }
                          if (line.trim() === '') {
                            return <br key={i} />
                          }
                          // Simple bold/italic (very basic)
                          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g)
                          return (
                            <p key={i} className="mb-2">
                              {parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={j}>{part.slice(2, -2)}</strong>
                                }
                                if (part.startsWith('*') && part.endsWith('*')) {
                                  return <em key={j}>{part.slice(1, -1)}</em>
                                }
                                return part
                              })}
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {editingNote && (
                <div className="border-t border-[#E5E5E5] px-6 py-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                  <button
                    onClick={() => {
                      setEditingNote(false)
                      setNoteFormData({ title: '', body: '', noteType: 'general' })
                    }}
                    className="px-4 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] text-[13px] font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateNote}
                    disabled={!noteFormData.title.trim()}
                    className="px-4 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
