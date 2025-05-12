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
  [key: string]: unknown; // Allow for additional properties
}

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';
// JWT expiration time - 5 minutes (to allow for the 4-minute inactivity + 1-minute countdown)
const JWT_EXPIRATION = '5m';

export async function POST(request: Request) {
  let connection;
  
  try {
    // Parse the request body
    const { email, password } = await request.json();
    
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
    
    // Query to authenticate staff
    const [rows] = await connection.execute(
      'SELECT * FROM Staff WHERE email = ? LIMIT 1',
      [email]
    );
    
    // Check if staff exists and password matches
    const staffRows = rows as StaffMember[];
    if (staffRows.length === 0) {
      await connection.end();
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    
    const staff = staffRows[0];
    
    // Verify password using Argon2
    try {
      const validPassword = await argon2.verify(staff.password, password);
      if (!validPassword) {
        await connection.end();
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
        // Add any other data you want in the token
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
    
    // Create the response
    const response = NextResponse.json({ 
      success: true, 
      staff: staffWithoutPassword,
      subjects: subjectRows,
      token
    });
    
    // Set the cookie in the response
    response.cookies.set({
      name: 'auth_token',
      value: token,
      maxAge: 5 * 60, // 5 minutes
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
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