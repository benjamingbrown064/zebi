import { NextRequest, NextResponse } from 'next/server'

// Redirects to /api/spaces for backwards compatibility
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = url.pathname.replace('/api/spaces', '/api/spaces')
  return NextResponse.redirect(url, 308)
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = url.pathname.replace('/api/spaces', '/api/spaces')
  return NextResponse.redirect(url, 308)
}
