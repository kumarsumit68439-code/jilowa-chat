import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req) {
  const path = req.nextUrl.pathname;

  // Public paths — never crash the edge
  const publicPaths = ['/login', '/setup'];
  const isPublic =
    publicPaths.includes(path) ||
    path.startsWith('/auth') ||
    path.startsWith('/api/bot');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env on Vercel → show setup instead of 500 MIDDLEWARE_INVOCATION_FAILED
  if (!url || !key) {
    if (path === '/setup') return NextResponse.next();
    const u = req.nextUrl.clone();
    u.pathname = '/setup';
    return NextResponse.redirect(u);
  }

  try {
    let res = NextResponse.next({ request: req });
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (isPublic) {
      if (user && path === '/login') {
        const u = req.nextUrl.clone();
        u.pathname = '/app';
        return NextResponse.redirect(u);
      }
      return res;
    }

    if (!user) {
      const u = req.nextUrl.clone();
      u.pathname = '/login';
      return NextResponse.redirect(u);
    }

    if (path === '/') {
      const u = req.nextUrl.clone();
      u.pathname = '/app';
      return NextResponse.redirect(u);
    }

    return res;
  } catch (err) {
    // Never 500 the whole site from middleware
    console.error('middleware error', err);
    if (isPublic) return NextResponse.next();
    const u = req.nextUrl.clone();
    u.pathname = '/login';
    return NextResponse.redirect(u);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
