'use client'

import { useState, useEffect } from 'react'
import AIActivityItem from './AIActivityItem'
import { Activity } from 'lucide-react'
import { Card, CardHeader, CardBody, CardFooter, Select, SelectItem, Spinner, Skeleton, Button, Divider } from '@heroui/react'

interface AIActivity {
  id: string
  type: string
  title: string
  description: string
  reasoning: string
  confidence: number
  status: string
  createdAt: string
  actions: any[]
  context?: {
    entityType?: string
    entityId?: string
  }
}

interface AIActivityFeedProps {
  workspaceId: string
  limit?: number
  showFilters?: boolean
}

export default function AIActivityFeed({
  workspaceId,
  limit = 10,
  showFilters = true,
}: AIActivityFeedProps) {
  const [activities, setActivities] = useState<AIActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchActivities()
  }, [workspaceId, filter])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: String(limit),
        ...(filter !== 'all' && { type: filter }),
      })

      const response = await fetch(
        `/api/ai-activity?workspaceId=${workspaceId}&${params}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch AI activity')
      }

      const data = await response.json()
      setActivities(data.activities || [])
    } catch (err) {
      console.error('Failed to fetch AI activity:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  const filterTypes = [
    { value: 'all', label: 'All Activity' },
    { value: 'alert', label: 'Alerts' },
    { value: 'risk', label: 'Risks' },
    { value: 'opportunity', label: 'Opportunities' },
    { value: 'warning', label: 'Warnings' },
    { value: 'suggestion', label: 'Suggestions' },
  ]

  return (
    <Card className="shadow-[0_4px_12px_rgba(28,27,27,0.08)]" radius="lg">
      <CardHeader className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-[14px] flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">AI Activity</h3>
            <p className="text-sm text-default-500">Recent insights and alerts</p>
          </div>
        </div>

        {showFilters && (
          <Select
            size="sm"
            selectedKeys={[filter]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0]
              if (selected) setFilter(selected.toString())
            }}
            className="w-44"
            aria-label="Filter activity"
            variant="bordered"
          >
            {filterTypes.map((type) => (
              <SelectItem key={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </Select>
        )}
      </CardHeader>

      <Divider />

      <CardBody className="gap-3">
        {loading ? (
          <LoadingSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchActivities} />
        ) : activities.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <AIActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardBody>

      {activities.length > 0 && !loading && (
        <>
          <Divider />
          <CardFooter className="justify-center">
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={() => {
                window.location.href = '/ai-activity'
              }}
              className="font-semibold"
            >
              View all activity →
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

/**
 * Loading skeleton
 */
function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-4 bg-default-50 rounded-[14px]">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-[10px]" />
            <Skeleton className="h-3 w-full rounded-[10px]" />
            <Skeleton className="h-3 w-2/3 rounded-[10px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state
 */
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Activity className="w-8 h-8 text-default-300" />
      </div>
      <p className="text-default-600 font-medium">
        {filter === 'all'
          ? 'No AI activity yet'
          : `No ${filter}s found`}
      </p>
      <p className="text-xs text-default-400 mt-2 max-w-xs mx-auto">
        Your AI assistant analyzes your workspace daily at 6am to provide insights and alerts
      </p>
    </div>
  )
}

/**
 * Error state
 */
function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Activity className="w-8 h-8 text-danger" />
      </div>
      <p className="text-sm text-danger font-medium mb-4">{message}</p>
      <Button
        size="sm"
        variant="flat"
        color="primary"
        onPress={onRetry}
      >
        Try again
      </Button>
    </div>
  )
}
