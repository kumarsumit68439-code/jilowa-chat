import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req) {
  const path = req.nextUrl.pathname;

  const isPublic =
    path === '/login' ||
    path.startsWith('/auth') ||
    path.startsWith('/api/');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No env → do not show setup page; allow request through (login still usable once env is added)
  if (!url || !key) {
    return NextResponse.next();
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

    if (path === '/' || path === '/setup') {
      const u = req.nextUrl.clone();
      u.pathname = '/app';
      return NextResponse.redirect(u);
    }

    return res;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
