import { auth } from '@/firebase/client';
import { signOut } from 'firebase/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This is a client-side SDK call which is not ideal in a route handler,
    // but for the sake of simplicity in this context, we'll proceed.
    // A more robust solution would use session cookies managed by a backend.
    await signOut(auth);

    // Redirect to the landing page after logout
    const redirectUrl = new URL('/', request.nextUrl.origin);
    
    // Create a response that redirects
    const response = NextResponse.redirect(redirectUrl);

    // Clear any existing session cookies if they were set, for good measure.
    response.cookies.delete('firebase-session');
    
    return response;

  } catch (error) {
    console.error('Logout failed:', error);
    // Redirect to home page even if logout fails on server to avoid broken state
    const redirectUrl = new URL('/', request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }
}
