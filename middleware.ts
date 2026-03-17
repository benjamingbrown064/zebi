import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  
  // Check for valid Bearer token (Doug/Harvey API access)
  const authHeader = req.headers.get('authorization')
  let hasValidBearerToken = false
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const validTokens = [
      process.env.DOUG_API_TOKEN,
      process.env.HARVEY_API_TOKEN,
    ]
    hasValidBearerToken = validTokens.includes(token)
    
    if (hasValidBearerToken) {
      console.log(`[middleware] Valid Bearer token detected for ${req.nextUrl.pathname}`)
    }
  }
  
  // Public routes (auth pages and API endpoints with their own auth)
  const publicRoutes = [
    '/login', 
    '/signup', 
    '/auth/callback', 
    '/auth/confirm',
    '/api/auth/logout',  // Logout endpoint
    '/api/cron',      // Cron endpoints use API key auth
    '/api/tasks/direct', // Direct API access uses API key auth
    '/api/tasks',     // Task endpoints - Bearer token auth (Doug/Harvey)
    '/api/objectives', // Objectives endpoints - Bearer token auth (Doug/Harvey)
    '/api/projects',   // Projects endpoints - Bearer token auth (Doug/Harvey)
    '/api/assistant',  // AI Assistant API (Week 1 Day 1-2) - TODO: Add proper auth in Day 3-4
    '/api/migrate-action-plans', // Migration endpoint (one-time use)
    '/api/brain-dump', // Brain Dump API (internal processing, no auth needed for server-to-server)
    '/api/doug',      // Doug AI Assistant API (uses DOUG_API_TOKEN auth)
  ]
  // Allow root path (landing page) without auth
  // Check if path starts with any public route
  let isPublicRoute = req.nextUrl.pathname === '/'
  
  // Debug log for API endpoints
  if (req.nextUrl.pathname.startsWith('/api/')) {
    console.log(`[middleware] Path: ${req.nextUrl.pathname}, Auth header: ${req.headers.get('authorization') ? 'present' : 'missing'}`)
  }
  
  for (const route of publicRoutes) {
    if (req.nextUrl.pathname.startsWith(route)) {
      isPublicRoute = true
      if (req.nextUrl.pathname.startsWith('/api/')) {
        console.log(`[middleware] ${req.nextUrl.pathname} matched public route ${route}`)
      }
      break
    }
  }
  
  // Also treat API endpoints with valid Bearer tokens as public
  if (req.nextUrl.pathname.startsWith('/api/') && hasValidBearerToken) {
    console.log(`[middleware] Bearer token auth passed for ${req.nextUrl.pathname}`)
    return response
  }
  
  if (isPublicRoute) {
    return response
  }
  
  // Require authentication for protected routes
  if (!session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // NOTE: Workspace isolation is handled at the API route level
  // Each API route validates that the user has access to the requested workspace
  // We cannot do this validation in middleware because Edge Runtime doesn't support Prisma
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|.*\\.svg$|api/public).*)',
  ]
}
