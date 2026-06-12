import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import type { AuthUser } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (code) {
    try {
      // Get the redirect URI used in the initial OAuth flow
      const redirectUri = `${new URL(request.url).origin}/google/callback`;
      
      // Call the backend to exchange code for tokens
      const response: { access_token: string; token_type: string; user: AuthUser } = await api.get(
        `/auth/google/callback?code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      
      // Create response with redirect to dashboard
      const nextResponse = NextResponse.redirect(new URL('/dashboard', request.url));
      
      // Set HTTP-only cookie with the token (for server components)
      nextResponse.cookies.set('auth_token', response.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      
      // Also set a client-readable cookie for JavaScript access
      nextResponse.cookies.set('client_token', response.access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      
      return nextResponse;
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }
  }
  
  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}
