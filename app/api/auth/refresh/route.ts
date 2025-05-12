import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';
// JWT expiration time - 5 minutes
const JWT_EXPIRATION = '5m';

export async function POST(request: NextRequest) {
  try {
    // Get the token from cookies using the request object
    const token = request.cookies.get('auth_token')?.value;

    // If there's no token, return an error
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token' },
        { status: 401 }
      );
    }

    try {
      // Verify the current token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      
      // Generate a new token with the same payload but a new expiry
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          accessLevel: decoded.accessLevel,
          firstname: decoded.firstname,
          surname: decoded.surname,
          // Add any other data from the original token
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );
      
      // Create the response
      const response = NextResponse.json({ 
        success: true, 
        token: newToken 
      });
      
      // Set the cookie in the response
      response.cookies.set({
        name: 'auth_token',
        value: newToken,
        maxAge: 5 * 60, // 5 minutes
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      return response;
    } catch (jwtError) {
      // If the token verification fails, return an error
      console.error('JWT verification error:', jwtError);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
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