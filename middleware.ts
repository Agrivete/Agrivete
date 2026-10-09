import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const PROTECTED_PREFIXES = ['/dashboard', '/sales', '/inventory', '/receiving', '/expiration', '/suppliers', '/replenishments', '/reports', '/users', '/settings'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('agrivet_token')?.value;

  let valid = false;
  if (token && process.env.JWT_SECRET) {
    try {
      const jwt = await import('jsonwebtoken');
      jwt.default.verify(token, process.env.JWT_SECRET);
      valid = true;
    } catch {
      valid = false;
    }
  } else if (token) {
    valid = true; // secret not loaded — preserve old behavior
  }

  if (!valid && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete('agrivet_token');
    return res;
  }

  if (valid && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
