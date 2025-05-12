import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret - should match the one used in your login route
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

// Define the paths that should be protected by authentication
const protectedPaths = [
  '/dashboard',
  '/events',
  '/students',
  '/subjects',
  '/staff',
  '/profile',
  // Add any other protected paths here
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path) || pathname === path
  );
  
  // If it's not a protected path, allow the request to continue
  if (!isProtectedPath) {
    return NextResponse.next();
  }
  
  // Get the token from the cookies
  const token = request.cookies.get('auth_token')?.value;
  
  // If there's no token, redirect to login
  if (!token) {
    return redirectToLogin(request);
  }
  
  try {
    // Verify the token
    const textEncoder = new TextEncoder();
    const secretKey = textEncoder.encode(JWT_SECRET);
    
    const { payload } = await jwtVerify(token, secretKey);
    
    // If the token is valid, allow the request to continue
    return NextResponse.next();
  } catch (error) {
    // If the token is invalid or expired, redirect to login
    console.error('Error verifying JWT:', error);
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/', request.url);
  return NextResponse.redirect(loginUrl);
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/events/:path*',
    '/students/:path*',
    '/subjects/:path*',
    '/staff/:path*',
    '/profile/:path*',
    // Add any other protected paths here
  ],
};