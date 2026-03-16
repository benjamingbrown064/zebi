import { NextResponse } from 'next/server'

export const runtime = 'nodejs' // Ensure it's Node runtime, not Edge

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      databaseUrlSet: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      databaseUrlPreview: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 50) + '...'
        : 'NOT SET',
      hasPgbouncer: (process.env.DATABASE_URL || '').includes('pgbouncer=true'),
    },
    prismaTest: {
      success: false,
      error: null as string | null,
      connectionTime: 0,
    },
    taskQuery: {
      success: false,
      error: null as string | null,
      connectionTime: 0,
    },
  }

  // Test 1: Prisma Client
  try {
    console.log('[DEBUG] Testing Prisma client...')
    const startTime = Date.now()
    
    const { prisma } = await import('@/lib/prisma')
    
    // Try a simple query
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as test`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
      ),
    ])
    
    results.prismaTest.connectionTime = Date.now() - startTime
    results.prismaTest.success = true
    console.log('[DEBUG] Prisma connection successful')
  } catch (err) {
    results.prismaTest.error = String(err)
    console.error('[DEBUG] Prisma connection failed:', err)
  }

  // Test 2: Try to fetch a task (ensures full chain works)
  try {
    console.log('[DEBUG] Testing full task query...')
    const { prisma } = await import('@/lib/prisma')
    
    const startTime = Date.now()
    
    const taskCount = await Promise.race([
      prisma.task.count(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
      ),
    ])
    
    results.taskQuery.connectionTime = Date.now() - startTime
    results.taskQuery.success = true
    
    console.log('[DEBUG] Task query successful, found', taskCount, 'tasks')
  } catch (err) {
    results.taskQuery.error = String(err)
    console.error('[DEBUG] Task query failed:', err)
  }

  const allTestsPassed = results.prismaTest.success && results.taskQuery.success

  return NextResponse.json(
    {
      ...results,
      summary: {
        allTestsPassed,
        databaseUrlConfigured: !!process.env.DATABASE_URL,
        recommendedFixes: !allTestsPassed
          ? [
              'Verify DATABASE_URL is set in Vercel Environment Variables',
              'Check if the connection string needs ?pgbouncer=true appended',
              'Verify Supabase firewall allows Vercel IP',
              'Check RLS policies allow service_role connections',
              'Try redeploying to refresh environment variables',
            ]
          : [],
      },
    },
    {
      status: allTestsPassed ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
