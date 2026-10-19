import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/register'];

const ADMIN_ONLY_PREFIXES = ['/admin'];
const BUSINESS_ONLY_PREFIXES = [
  '/dashboard',
  '/sales',
  '/inventory',
  '/receiving',
  '/expiration',
  '/suppliers',
  '/replenishments',
  '/reports',
  '/users',
];
const SHARED_PROTECTED_PREFIXES = ['/settings'];

const PROTECTED_PREFIXES = [
  ...ADMIN_ONLY_PREFIXES,
  ...BUSINESS_ONLY_PREFIXES,
  ...SHARED_PROTECTED_PREFIXES,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('agrivet_token')?.value;

  let valid = false;
  let userRole: string | undefined;
  if (token && process.env.JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      valid = true;
      userRole = typeof payload.role === 'string' ? payload.role : undefined;
    } catch {
      valid = false;
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!valid && isProtected) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete('agrivet_token');
    return res;
  }

  if (valid && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const target = userRole === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (valid) {
    const isAdminRoute = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
    const isBusinessRoute = BUSINESS_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

    // Force Platform Admin away from business routes (/dashboard, /sales, /inventory, etc.)
    if (userRole === 'admin' && isBusinessRoute) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    // Force Business users (owner, manager, staff) away from /admin routes
    if (userRole !== 'admin' && isAdminRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
