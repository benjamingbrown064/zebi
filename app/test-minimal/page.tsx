'use client'

import { useState, useEffect } from 'react'
import { getTasks } from '@/app/actions/tasks'
import { useWorkspace } from '@/lib/use-workspace'

export default function TestMinimal() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [status, setStatus] = useState<string>('Initializing...')
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    if (!workspaceId) {
      setStatus('Waiting for workspace...')
      return
    }
    
    console.log('[TestMinimal] useEffect called with workspaceId:', workspaceId)
    setStatus('Calling getTasks...')

    // Direct call with timeout
    const timeoutId = setTimeout(() => {
      console.error('[TestMinimal] getTasks timed out after 5s')
      setStatus('❌ Timeout: getTasks took too long')
    }, 5000)

    getTasks(workspaceId)
      .then((result) => {
        clearTimeout(timeoutId)
        console.log('[TestMinimal] getTasks returned:', result.length, 'tasks')
        setTasks(result)
        setStatus(`✅ Loaded ${result.length} tasks`)
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[TestMinimal] getTasks error:', msg)
        setStatus(`❌ Error: ${msg}`)
      })
  }, [workspaceId])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Test: Minimal Dashboard</h1>
      <p>Status: {status}</p>
      <p>Tasks loaded: {tasks.length}</p>
      {tasks.length > 0 && (
        <ul>
          {tasks.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
