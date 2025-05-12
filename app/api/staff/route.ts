import { NextRequest, NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

// Define interface for type safety
interface StaffRow {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  accessLevel: string;
}

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    // Get the token from cookies
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify the token
    try {
      jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
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
        rejectUnauthorized: false
      },
      connectTimeout: 10000
    });

    // Fetch all staff members
    const [staff] = await connection.query(`
      SELECT id, firstname, surname, email, accessLevel
      FROM Staff
      ORDER BY firstname, surname
    `);

    await connection.end();

    return NextResponse.json({
      success: true,
      staff: staff as StaffRow[]
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error fetching staff' },
      { status: 500 }
    );
  }
}