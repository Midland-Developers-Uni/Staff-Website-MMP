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

interface Token {
  id: number;
  token: string;
  email: string | null;
  created_by: number | null;
  created_at: string;
  expires_at: string;
  used: number; // MySQL returns 0/1 for booleans
  used_by: string | null;
  used_at: string | null;
  [key: string]: unknown; // Allow for additional properties
}

export async function POST(request: Request) {
  let connection;
  
  try {
    // Parse the request body
    const { email, password, firstname, surname, token } = await request.json();
    
    // Validate required fields
    if (!email || !password || !firstname || !surname || !token) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' }, 
        { status: 400 }
      );
    }
    
    // Validate token format (lowercase letters with hyphens)
    if (!/^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/.test(token)) {
      return NextResponse.json(
        { success: false, message: 'Invalid token format' }, 
        { status: 400 }
      );
    }
    
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.AIVEN_HOST,
      port: Number(process.env.AIVEN_PORT),
      database: process.env.AIVEN_DATABASE,
      user: process.env.AIVEN_USER,
      password: process.env.AIVEN_PASSWORD,
      ssl: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
    
    // Check if email already exists
    const [existingStaff] = await connection.execute(
      'SELECT * FROM Staff WHERE email = ?', 
      [email]
    );
    
    const staffRows = existingStaff as StaffMember[];
    if (staffRows.length > 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'Email already in use' }, 
        { status: 409 }
      );
    }
    
    // Check if token exists, is valid, and hasn't been used
    const [tokenRows] = await connection.execute(
      `SELECT * FROM StaffAccountCreationTokens 
       WHERE token = ?`,
      [token]
    );
    
    const tokens = tokenRows as Token[];
    
    // If token doesn't exist at all
    if (tokens.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'Invalid token' }, 
        { status: 400 }
      );
    }
    
    const tokenData = tokens[0];
    
    // Check if token has already been used (MySQL returns 0/1 for booleans)
    if (tokenData.used === 1) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'This token has already been used' }, 
        { status: 400 }
      );
    }
    
    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'This token has expired' },
        { status: 400 }
      );
    }
    
    // Token is valid, proceed with account creation
    // Hash password
    const hashedPassword = await argon2.hash(password);
    
    // Create new staff account
    const [result] = await connection.execute(
      `INSERT INTO Staff (email, firstname, surname, password, accessLevel) 
       VALUES (?, ?, ?, ?, 'staff')`,
      [email, firstname, surname, hashedPassword]
    );
    
    const insertResult = result as mysql.ResultSetHeader;
    const insertId = insertResult.insertId;
    
    // Mark the token as used and record who used it
    await connection.execute(
      `UPDATE StaffAccountCreationTokens 
       SET used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP 
       WHERE token = ?`,
      [email, token]
    );
    
    // Get the newly created staff account
    const [newStaff] = await connection.execute(
      'SELECT * FROM Staff WHERE id = ?',
      [insertId]
    );
    
    await connection.end();
    
    // Exclude password from response
    const staff = (newStaff as StaffMember[])[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: passwordField, ...staffWithoutPassword } = staff;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully',
      staff: staffWithoutPassword
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (connection) {
      await connection.end();
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during registration' 
    }, { status: 500 });
  }
}