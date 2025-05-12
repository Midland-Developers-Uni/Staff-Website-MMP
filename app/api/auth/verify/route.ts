import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

export async function GET(request: NextRequest) {
  try {
    console.log('Verify route called');
    
    // Try multiple ways to get the token
    const cookieToken = request.cookies.get('auth_token')?.value;
    const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;
    
    console.log('Cookie token:', cookieToken ? 'Found' : 'Not found');
    console.log('Header token:', headerToken ? 'Found' : 'Not found');
    console.log('Using token from:', cookieToken ? 'cookie' : headerToken ? 'header' : 'none');
    
    // If there's no token, return an error
    if (!token) {
      console.log('No authentication token found');
      return NextResponse.json(
        { success: false, message: 'No authentication token' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      
      console.log('Token verified successfully for user:', decoded.email);
      
      // Check if it's our custom token
      if (decoded.custom !== 'midland-staff-token') {
        console.log('Token format invalid');
        return NextResponse.json(
          { success: false, message: 'Invalid token format' },
          { status: 401 }
        );
      }
      
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
      
      // Check if it's an expiration error specifically
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Invalid or malformed token' },
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