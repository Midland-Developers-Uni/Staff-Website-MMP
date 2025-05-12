import { NextRequest, NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

// Define interface for type safety
interface SubjectRow {
  id: number;
  name: string;
  code: string;
  description: string;
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

    // Fetch all subjects
    const [subjects] = await connection.query(`
      SELECT id, name, code, description
      FROM Subjects
      ORDER BY name
    `);

    await connection.end();

    return NextResponse.json({
      success: true,
      subjects: subjects as SubjectRow[]
    });

  } catch (error) {
    console.error('Error fetching subjects:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error fetching subjects' },
      { status: 500 }
    );
  }
}