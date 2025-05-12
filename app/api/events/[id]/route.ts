import { NextRequest, NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

// Define interface for type safety
interface EventCheck {
  eventId: number;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Await params (Next.js 15 breaking change)
    const { id } = await params;
    const eventId = parseInt(id);
    
    // Parse the request body
    const eventData = await request.json();
    const {
      eventName,
      location,
      detailsShort,
      detailsLong,
      staffId,
      totalSpaces,
      startTime,
      endTime,
      subjects
    } = eventData;

    // Validate required fields
    if (!eventName || !staffId || !totalSpaces || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return NextResponse.json(
        { success: false, message: 'End time must be after start time' },
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

    // Update the event
    await connection.execute(`
      UPDATE Events 
      SET eventName = ?, location = ?, detailsShort = ?, detailsLong = ?, 
          staffAssigned = ?, totalSpaces = ?, startTime = ?, endTime = ?
      WHERE eventId = ?
    `, [eventName, location, detailsShort, detailsLong, staffId, totalSpaces, startTime, endTime, eventId]);

    // Update subjects for the event
    // First, remove all existing subject associations
    await connection.execute(`
      DELETE FROM EventSubjects WHERE eventId = ?
    `, [eventId]);

    // Then, add the new subject associations
    if (subjects && subjects.length > 0) {
      for (const subject of subjects) {
        await connection.execute(`
          INSERT INTO EventSubjects (eventId, subjectId)
          VALUES (?, ?)
        `, [eventId, subject.id]);
      }
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Error updating event:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error updating event' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin (only admins can delete events)
    if (decoded.accessLevel !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only administrators can delete events' },
        { status: 403 }
      );
    }

    // Await params (Next.js 15 breaking change)
    const { id } = await params;
    const eventId = parseInt(id);

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

    // Check if event exists
    const [eventCheck] = await connection.execute(`
      SELECT eventId FROM Events WHERE eventId = ?
    `, [eventId]);

    if ((eventCheck as EventCheck[]).length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete the event (CASCADE will handle EventSubjects)
    await connection.execute(`
      DELETE FROM Events WHERE eventId = ?
    `, [eventId]);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error deleting event' },
      { status: 500 }
    );
  }
}