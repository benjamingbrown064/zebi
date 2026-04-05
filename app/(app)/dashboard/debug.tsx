'use client'

import { useState, useEffect } from 'react'
import { getTasks } from '@/app/actions/tasks'
import { getStatuses } from '@/app/actions/statuses'
import { getFilters } from '@/app/actions/filters'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

export default function DashboardDebug() {
  const [status, setStatus] = useState<string>('Loading...')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function debug() {
      try {
        setStatus('Fetching tasks...')
        const tasks = await getTasks(DEFAULT_WORKSPACE_ID)
        setStatus(`Tasks: ${tasks.length}`)
        
        setStatus('Fetching statuses...')
        const statuses = await getStatuses(DEFAULT_WORKSPACE_ID)
        setStatus(`Statuses: ${statuses.length}`)
        
        setStatus('Fetching filters...')
        const filters = await getFilters(DEFAULT_WORKSPACE_ID)
        setStatus(`Filters: ${filters.length}`)
        
        setStatus('✅ All loaded')
        setData({ tasks, statuses, filters })
      } catch (err) {
        setStatus(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    debug()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Dashboard</h1>
      <p>{status}</p>
      {data && (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  )
}
