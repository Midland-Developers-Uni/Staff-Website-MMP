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

interface Subject {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Allow for additional properties
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { email, password } = await request.json();
    
    // Create connection to the database using server-side environment variables
    const connection = await mysql.createConnection({
      host: process.env.AIVEN_HOST,
      port: Number(process.env.AIVEN_PORT),
      database: process.env.AIVEN_DATABASE,
      user: process.env.AIVEN_USER,
      password: process.env.AIVEN_PASSWORD,
      ssl: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
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
    const validPassword = await argon2.verify(staff.password, password);
    if (!validPassword) {
      await connection.end();
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
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
    
    // Exclude password from response (using rest operator)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: passwordField, ...staffWithoutPassword } = staff;
    
    return NextResponse.json({ 
      success: true, 
      staff: staffWithoutPassword,
      subjects: subjectRows
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during authentication' 
    }, { status: 500 });
  }
}