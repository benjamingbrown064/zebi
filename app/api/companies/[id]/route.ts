import { NextRequest, NextResponse } from 'next/server'

// Redirects to /api/spaces/[id] for backwards compatibility
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(request.url)
  url.pathname = url.pathname.replace('/api/spaces', '/api/spaces')
  return NextResponse.redirect(url, 308)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(request.url)
  url.pathname = url.pathname.replace('/api/spaces', '/api/spaces')
  return NextResponse.redirect(url, 308)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const url = new URL(request.url)
  url.pathname = url.pathname.replace('/api/spaces', '/api/spaces')
  return NextResponse.redirect(url, 308)
}
