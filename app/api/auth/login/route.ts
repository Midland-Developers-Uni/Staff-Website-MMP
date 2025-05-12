import { NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as argon2 from 'argon2';

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
    const staff = (rows as any[])[0];
    if (!staff) {
      await connection.end();
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    
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
    
    // Exclude password from response
    const { password: _, ...staffWithoutPassword } = staff;
    
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