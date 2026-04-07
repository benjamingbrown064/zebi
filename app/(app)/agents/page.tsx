'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useWorkspace } from '@/hooks/useWorkspace'

const AGENT_AVATARS: Record<string, string> = {
  harvey: '🧠',
  doug: '🤖',
  theo: '🔬',
  casper: '👻',
}

const PRESENCE_DOT: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-yellow-400',
  offline: 'bg-[#C6C6C6]',
}

const PRESENCE_LABEL: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
  offline: 'Offline',
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60000) return 'Just now'
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}

export default function AgentsPage() {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch(`/api/agents?workspaceId=${workspaceId || 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents) })
      .finally(() => setLoading(false))
  }, [workspaceId])

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar workspaceName="My Workspace" isCollapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className="transition-all duration-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-8 pb-16">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1">Team</p>
            <h1 className="text-[28px] font-bold text-[#1A1A1A]">Agents</h1>
            <p className="text-[14px] text-[#737373] mt-1">Your AI operating team — identity, responsibilities, and live status.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-24"><LoadingSpinner /></div>
          ) : agents.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-[#A3A3A3] text-[14px] mb-4">No agents configured yet.</p>
              <p className="text-[12px] text-[#C6C6C6]">Agents are created via the API.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  className="bg-white border border-[#E5E5E5] rounded p-6 cursor-pointer hover:border-[#C6C6C6] transition group"
                  style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#F3F3F3] rounded flex items-center justify-center text-2xl flex-shrink-0">
                        {agent.avatar || AGENT_AVATARS[agent.id] || '🤖'}
                      </div>
                      <div>
                        <h2 className="text-[16px] font-bold text-[#1A1A1A] group-hover:text-black">{agent.name}</h2>
                        <p className="text-[12px] text-[#737373]">{agent.role || 'Agent'}</p>
                        {agent.perspective && (
                          <p className="text-[11px] text-[#A3A3A3]">{agent.perspective}</p>
                        )}
                      </div>
                    </div>
                    {/* Presence */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRESENCE_DOT[agent.presence] || PRESENCE_DOT.offline}`} />
                      <span className="text-[11px] text-[#737373]">{PRESENCE_LABEL[agent.presence]}</span>
                    </div>
                  </div>

                  {/* Tagline */}
                  {agent.tagline && (
                    <p className="text-[13px] text-[#474747] italic mb-4 border-l-2 border-[#E5E5E5] pl-3">
                      "{agent.tagline}"
                    </p>
                  )}

                  {/* Stats bar */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Open', value: agent.openTasks },
                      { label: 'Skills', value: agent.knowledgeLinks?.filter((l: any) => l.required).length || 0 },
                    ].map(s => (
                      <div key={s.label} className="bg-[#F9F9F9] rounded p-2 text-center">
                        <div className="text-[15px] font-bold text-[#1A1A1A]">{s.value}</div>
                        <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">{s.label}</div>
                      </div>
                    ))}
                    <div className="bg-[#F9F9F9] rounded p-2 text-center col-span-2">
                      <div className="text-[11px] text-[#737373]">Last seen</div>
                      <div className="text-[12px] font-medium text-[#474747]">{timeAgo(agent.lastSeenAt)}</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded ${
                      agent.status === 'active' ? 'bg-[#F3F3F3] text-[#474747]' :
                      agent.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-[#F9F9F9] text-[#A3A3A3]'
                    }`}>
                      {agent.status}
                    </span>
                    <svg className="w-4 h-4 text-[#C6C6C6] group-hover:text-[#737373] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
