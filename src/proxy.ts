import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    const { pathname } = request.nextUrl

    // Public routes: /order/* (QR order for customers)
    if (pathname.startsWith('/order/')) {
        return supabaseResponse
    }

    // Health check
    if (pathname.startsWith('/api/health')) {
        return supabaseResponse
    }

    // Not logged in → redirect to login
    if (!user) {
        if (pathname !== '/login') {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    // Already logged in → don't show login page
    if (pathname === '/login' || pathname === '/') {
        // Get role to redirect properly
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const url = request.nextUrl.clone()
        url.pathname = profile?.role === 'admin' ? '/admin/dashboard' : '/pos'
        return NextResponse.redirect(url)
    }

    // Admin-only routes
    if (pathname.startsWith('/admin')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/pos'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
