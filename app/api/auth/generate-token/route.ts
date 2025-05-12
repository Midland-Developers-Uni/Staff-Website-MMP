import { NextRequest, NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

// Function to generate random lowercase letters
function generateRandomLetters(length: number): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  return result;
}

// Function to generate token in xxxx-xxxx-xxxx-xxxx format
function generateStaffToken(): string {
  return `${generateRandomLetters(4)}-${generateRandomLetters(4)}-${generateRandomLetters(4)}-${generateRandomLetters(4)}`;
}

export async function POST(request: NextRequest) {
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

    // Verify the token and check if user is admin
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    if (decoded.accessLevel !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Admin required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const { lifespanDays } = await request.json();
    
    // Validate lifespan
    if (!lifespanDays || ![1, 3, 7].includes(lifespanDays)) {
      return NextResponse.json(
        { success: false, message: 'Invalid lifespan. Must be 1, 3, or 7 days.' },
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
        rejectUnauthorized: false
      },
      connectTimeout: 10000
    });

    // Generate unique token
    let staffToken;
    let tokenExists = true;
    
    // Ensure token is unique
    while (tokenExists) {
      staffToken = generateStaffToken();
      
      const [existingTokens] = await connection.execute(
        'SELECT id FROM StaffAccountCreationTokens WHERE token = ?',
        [staffToken]
      );
      
      tokenExists = (existingTokens as Array<any>).length > 0;
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + lifespanDays);

    // Insert the token into database
    await connection.execute(`
      INSERT INTO StaffAccountCreationTokens (token, created_by, expires_at)
      VALUES (?, ?, ?)
    `, [staffToken, decoded.userId, expiresAt]);

    await connection.end();

    console.log(`Admin ${decoded.email} generated token: ${staffToken}`);

    return NextResponse.json({
      success: true,
      token: staffToken,
      expiresAt: expiresAt.toISOString(),
      lifespanDays
    });

  } catch (error) {
    console.error('Error generating token:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error during token generation' },
      { status: 500 }
    );
  }
}