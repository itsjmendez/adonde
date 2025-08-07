import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/dashboard', '/profile', '/connections', '/chat']
  const authPaths = ['/auth/login', '/auth/signup']
  const profileSetupPath = '/profile/setup'
  
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  const isProfileSetupPath = request.nextUrl.pathname === profileSetupPath

  // Allow profile setup page for authenticated users (don't treat it as protected)
  if (isProfileSetupPath && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If user is authenticated and on profile setup page, allow them through
  if (isProfileSetupPath && user) {
    return response;
  }

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Check profile completion for authenticated users
  if (user && (isProtectedPath || isAuthPath) && !isProfileSetupPath) {
    // Get profile completion status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_profile_complete')
      .eq('id', user.id)
      .single()

    const isProfileComplete = profile?.is_profile_complete || false

    // Redirect to profile setup if profile is not complete and not already on profile setup
    if (!isProfileComplete && !isProfileSetupPath) {
      return NextResponse.redirect(new URL('/profile/setup', request.url))
    }

    // Redirect to dashboard if profile is complete and on auth pages
    if (isProfileComplete && isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}