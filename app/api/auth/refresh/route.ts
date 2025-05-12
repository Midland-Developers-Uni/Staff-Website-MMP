import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';
// JWT expiration time - 24 hours
const JWT_EXPIRATION = '24h';

export async function POST(request: NextRequest) {
  try {
    console.log('Refresh route called');
    
    // Try multiple ways to get the token
    const cookieToken = request.cookies.get('auth_token')?.value;
    const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;
    
    console.log('Cookie token:', cookieToken ? 'Found' : 'Not found');
    
    // If there's no token, return an error
    if (!token) {
      console.log('No authentication token found for refresh');
      return NextResponse.json(
        { success: false, message: 'No authentication token' },
        { status: 401 }
      );
    }

    try {
      // Verify the current token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      
      console.log('Refreshing token for user:', decoded.email);
      
      // Check if it's our custom token
      if (decoded.custom !== 'midland-staff-token') {
        console.log('Token format invalid during refresh');
        return NextResponse.json(
          { success: false, message: 'Invalid token format' },
          { status: 401 }
        );
      }
      
      // Generate a new token with the same payload but a new expiry
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          accessLevel: decoded.accessLevel,
          firstname: decoded.firstname,
          surname: decoded.surname,
          // Add new issued at and custom claim
          iat: Math.floor(Date.now() / 1000),
          custom: 'midland-staff-token'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );
      
      // Create the response
      const response = NextResponse.json({ 
        success: true, 
        token: newToken 
      });
      
      // Set the cookie with the same settings as login
      response.cookies.set({
        name: 'auth_token',
        value: newToken,
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
        httpOnly: true,
        secure: false, // Set to false for development
        sameSite: 'lax' // Changed from 'strict' to 'lax'
      });
      
      console.log('Token refreshed successfully');
      
      return response;
    } catch (jwtError) {
      // If the token verification fails, return an error
      console.error('JWT verification error during refresh:', jwtError);
      
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { success: false, message: 'Token expired, please login again' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Invalid or malformed token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during token refresh' },
      { status: 500 }
    );
  }
}