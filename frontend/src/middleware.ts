// frontend/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/location-screen'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Kalau akses halaman protected tapi belum login → redirect ke login
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Kalau sudah login tapi akses halaman login/register → redirect ke dashboard
  const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/location-screen/:path*', '/login', '/register'],
};