import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

export async function GET(request: NextRequest) {
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
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      
      // Return user information from the token
      return NextResponse.json({ 
        success: true, 
        user: {
          userId: decoded.userId,
          email: decoded.email,
          accessLevel: decoded.accessLevel,
          firstname: decoded.firstname,
          surname: decoded.surname,
          // Include other user data as needed
        }
      });
    } catch (jwtError) {
      // If the token verification fails, return an error
      console.error('JWT verification error:', jwtError);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during token verification' },
      { status: 500 }
    );
  }
}