import { NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';

// Define interfaces for our data types
interface StaffMember {
  id: number;
  email: string;
  firstname: string;
  surname: string;
  password: string;
  accessLevel: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
  last_login: string | null;
  [key: string]: unknown;
}

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';
// JWT expiration time - 24 hours
const JWT_EXPIRATION = '24h';

export async function POST(request: Request) {
  let connection;
  
  try {
    console.log('Login route called');
    
    // Parse the request body
    const { email, password } = await request.json();
    
    // Basic validation
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    console.log('Attempting login for:', email);
    
    // Create connection with proper options
    connection = await mysql.createConnection({
      host: process.env.AIVEN_HOST,
      port: Number(process.env.AIVEN_PORT),
      database: process.env.AIVEN_DATABASE,
      user: process.env.AIVEN_USER,
      password: process.env.AIVEN_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 10000 // 10 seconds
    });
    
    console.log('Database connection established');
    
    // Query to authenticate staff
    const [rows] = await connection.execute(
      'SELECT * FROM Staff WHERE email = ? LIMIT 1',
      [email]
    );
    
    // Check if staff exists and password matches
    const staffRows = rows as StaffMember[];
    if (staffRows.length === 0) {
      await connection.end();
      console.log('User not found');
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    
    const staff = staffRows[0];
    console.log('User found, verifying password');
    
    // Verify password using Argon2
    try {
      const validPassword = await argon2.verify(staff.password, password);
      if (!validPassword) {
        await connection.end();
        console.log('Invalid password');
        return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
      await connection.end();
      return NextResponse.json({ 
        success: false, 
        message: 'Error verifying credentials' 
      }, { status: 500 });
    }
    
    console.log('Password verified successfully');
    
    // Update last login time
    await connection.execute(
      'UPDATE Staff SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [staff.id]
    );
    
    // Get assigned subjects for staff member
    const [subjectRows] = await connection.execute(`
      SELECT s.* FROM Subjects s
      JOIN StaffSubjects ss ON s.id = ss.subject_id
      WHERE ss.staff_id = ?
    `, [staff.id]);
    
    await connection.end();
    console.log('Database operations completed');
    
    // Exclude password from response and JWT payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: passwordField, ...staffWithoutPassword } = staff;
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: staff.id,
        email: staff.email,
        firstname: staff.firstname,
        surname: staff.surname,
        accessLevel: staff.accessLevel,
        // Add issued at and custom claim for verification
        iat: Math.floor(Date.now() / 1000),
        custom: 'midland-staff-token'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
    
    console.log('JWT token generated:', token.substring(0, 50) + '...');
    
    // Create the response
    const response = NextResponse.json({ 
      success: true, 
      staff: staffWithoutPassword,
      subjects: subjectRows,
      token
    });
    
    console.log('Setting auth_token cookie...');
    
    // Set the cookie with explicit settings
    response.cookies.set('auth_token', token, {
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Also try setting with different approach for better compatibility
    response.headers.set('Set-Cookie', `auth_token=${token}; Path=/; Max-Age=${24 * 60 * 60}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    
    console.log('Cookie should be set. Response headers:', {
      'set-cookie': response.headers.get('set-cookie')
    });
    
    return response;
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Ensure connection is closed
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during authentication'
    }, { status: 500 });
  }
}