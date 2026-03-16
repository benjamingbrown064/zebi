import { createClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout
 * Properly clear all Supabase auth cookies and session
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Get all cookies
    const cookieStore = cookies();
    
    // Clear all Supabase-related cookies
    const supabaseCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
      'sb-auth-token.0',
      'sb-auth-token.1',
    ];
    
    const response = NextResponse.json({ success: true });
    
    // Delete all Supabase cookies
    for (const cookieName of supabaseCookies) {
      response.cookies.delete(cookieName);
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
      });
    }
    
    // Also try to delete by getting current cookies
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        response.cookies.delete(cookie.name);
        response.cookies.set(cookie.name, '', {
          maxAge: 0,
          path: '/',
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
