import { NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as argon2 from 'argon2';

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

export async function POST(request: Request) {
  let connection;
  
  try {
    // Log the database connection attempt
    console.log('Connection attempt with:', {
      host: process.env.AIVEN_HOST?.substring(0, 5) + '...',
      port: process.env.AIVEN_PORT,
      database: process.env.AIVEN_DATABASE,
      // Don't log full credentials
      userExists: !!process.env.AIVEN_USER,
      passwordExists: !!process.env.AIVEN_PASSWORD,
      sslMode: process.env.AIVEN_SSL_MODE
    });
    
    // Parse the request body
    const body = await request.json();
    const { email, password } = body;
    
    console.log('Attempting to authenticate user:', email);
    
    // Create connection with only valid options
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
    console.log('Executing user lookup query');
    const [rows] = await connection.execute(
      'SELECT * FROM Staff WHERE email = ? LIMIT 1',
      [email]
    );
    
    // Check if staff exists and password matches
    const staffRows = rows as StaffMember[];
    if (staffRows.length === 0) {
      console.log('User not found');
      await connection.end();
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    
    const staff = staffRows[0];
    console.log('User found, verifying password');
    
    // Verify password using Argon2 with a try/catch to handle verification errors
    try {
      const validPassword = await argon2.verify(staff.password, password);
      if (!validPassword) {
        console.log('Password verification failed');
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
    
    console.log('Password verified, updating last login time');
    
    // Update last login time
    await connection.execute(
      'UPDATE Staff SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [staff.id]
    );
    
    console.log('Fetching subject data');
    
    // Get assigned subjects for staff member
    const [subjectRows] = await connection.execute(`
      SELECT s.* FROM Subjects s
      JOIN StaffSubjects ss ON s.id = ss.subject_id
      WHERE ss.staff_id = ?
    `, [staff.id]);
    
    console.log('Closing database connection');
    await connection.end();
    
    // Exclude password from response (using rest operator)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: passwordField, ...staffWithoutPassword } = staff;
    
    console.log('Login successful');
    
    return NextResponse.json({ 
      success: true, 
      staff: staffWithoutPassword,
      subjects: subjectRows
    });
    
  } catch (error) {
    console.error('Authentication error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name || typeof error
    });
    
    // Ensure connection is closed
    if (connection) {
      try {
        await connection.end();
        console.log('Database connection closed after error');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during authentication',
      // Include error details in non-production environment
      debug: process.env.NODE_ENV !== 'production' ? 
        (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}