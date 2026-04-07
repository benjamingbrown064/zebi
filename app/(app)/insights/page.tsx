'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InsightsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/agents?tab=insights') }, [router])
  return null
}
