import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const PROTECTED_PREFIXES = ['/dashboard', '/sales', '/inventory', '/receiving', '/expiration', '/suppliers', '/replenishments', '/reports', '/users', '/settings'];

function parseJwtPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('agrivet_token')?.value;

  let valid = false;
  if (token) {
    const payload = parseJwtPayload(token);
    if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
      valid = true;
    }
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
