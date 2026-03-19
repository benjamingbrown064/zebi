'use client'

import { useState, useEffect } from 'react'
import { FaLightbulb, FaTimes, FaArrowRight } from 'react-icons/fa'
import { Card, CardHeader, CardBody, Button, Chip, Spinner, Divider } from '@heroui/react'

interface Recommendation {
  id: string
  type: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  reasoning: string
  actions: Array<{
    type: string
    label: string
    params: Record<string, any>
  }>
  confidence: number
}

export default function DashboardRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations')
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (recId: string, action: any) => {
    if (action.type === 'navigate') {
      window.location.href = action.params.url
    } else {
      console.log('Action:', action)
    }

    await fetch(`/api/recommendations/${recId}/implement`, {
      method: 'POST',
    })

    setDismissed(new Set(dismissed).add(recId))
  }

  const handleDismiss = async (recId: string) => {
    await fetch(`/api/recommendations/${recId}/dismiss`, {
      method: 'POST',
    })
    setDismissed(new Set(dismissed).add(recId))
  }

  const visibleRecs = recommendations.filter((r) => !dismissed.has(r.id))

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'danger'
      case 'medium':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300" radius="lg">
        <CardBody className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-warning-100 to-warning-200 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(28,27,27,0.08)]">
              <FaLightbulb className="text-warning text-xl" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-deep-lake">AI Recommendations</h2>
              <p className="text-sm text-wet-cement">Loading suggestions...</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" color="primary" />
          </div>
        </CardBody>
      </Card>
    )
  }

  if (visibleRecs.length === 0) {
    return (
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300" radius="lg">
        <CardBody className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-warning-100 to-warning-200 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(28,27,27,0.08)]">
              <FaLightbulb className="text-warning text-xl" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-deep-lake">AI Recommendations</h2>
              <p className="text-sm text-wet-cement">Smart suggestions for your workflow</p>
            </div>
          </div>
          <Divider className="mb-8" />
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-default-100 to-default-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_4px_12px_rgba(28,27,27,0.08)]">
              <FaLightbulb className="text-default-400 text-3xl" />
            </div>
            <p className="text-deep-lake font-semibold text-lg">All caught up!</p>
            <p className="text-wet-cement mt-2">No recommendations right now</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300" radius="lg">
      <CardBody className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-warning-100 to-warning-200 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(28,27,27,0.08)]">
            <FaLightbulb className="text-warning text-xl" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-deep-lake">What to work on today</h2>
            <p className="text-sm text-wet-cement">{visibleRecs.length} AI-powered suggestions</p>
          </div>
        </div>
        
        <Divider className="mb-6" />
        
        <div className="space-y-4">
          {visibleRecs.map((rec) => (
            <Card
              key={rec.id}
              className="border-2 hover:shadow-[0_20px_40px_rgba(28,27,27,0.06)] transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
              radius="lg"
              classNames={{
                base: rec.priority === 'high' 
                  ? 'border-danger/30 bg-gradient-to-br from-danger-50 to-white' 
                  : rec.priority === 'medium'
                  ? 'border-warning/30 bg-gradient-to-br from-warning-50 to-white'
                  : 'border-default-200 bg-gradient-to-br from-default-50 to-white'
              }}
            >
              <CardBody className="gap-4 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Chip
                        size="sm"
                        color={getPriorityColor(rec.priority)}
                        variant="flat"
                        className="font-bold shadow-[0_1px_3px_rgba(28,27,27,0.06)]"
                      >
                        {rec.priority.toUpperCase()}
                      </Chip>
                      <span className="text-xs text-wet-cement font-semibold bg-white/50 px-2 py-1 rounded-full">
                        {rec.confidence}% confidence
                      </span>
                    </div>
                    <h3 className="font-bold text-xl text-deep-lake">
                      {rec.title}
                    </h3>
                    <p className="text-base text-gravel leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    radius="full"
                    onPress={() => handleDismiss(rec.id)}
                    aria-label="Dismiss"
                    className="text-wet-cement hover:text-deep-lake hover:bg-default-100"
                  >
                    <FaTimes />
                  </Button>
                </div>

                <details className="text-sm text-gravel bg-white/70 rounded-[14px] p-4 shadow-[0_1px_3px_rgba(28,27,27,0.06)]">
                  <summary className="cursor-pointer hover:text-deep-lake font-semibold">
                    💡 Why this matters
                  </summary>
                  <p className="mt-3 leading-relaxed">{rec.reasoning}</p>
                </details>

                <div className="flex gap-3 pt-2">
                  {rec.actions.map((action, idx) => (
                    <Button
                      key={idx}
                      size="lg"
                      color="primary"
                      variant="solid"
                      onPress={() => handleAction(rec.id, action)}
                      className="font-semibold shadow-[0_4px_12px_rgba(28,27,27,0.08)] hover:shadow-[0_20px_40px_rgba(28,27,27,0.06)] transform hover:-translate-y-0.5 transition-all"
                      endContent={<FaArrowRight className="text-sm" />}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
