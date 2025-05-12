import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create the response
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
    // Delete the auth token cookie by setting its expiry to the past
    response.cookies.set({
      name: 'auth_token',
      value: '',
      maxAge: 0, // Expires immediately
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error during logout' 
    }, { status: 500 });
  }
}