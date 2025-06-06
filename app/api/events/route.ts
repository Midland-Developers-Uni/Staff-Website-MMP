import { NextRequest, NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import * as jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'midland-developers-secret-key';

// Define interfaces for better type safety
interface EventRow {
  eventId: number;
  eventName: string;
  location: string;
  detailsShort: string;
  detailsLong: string;
  studentsSignedUp: number;
  totalSpaces: number;
  startTime: string;
  endTime: string;
  staffName: string;
  staffId: number;
  created_at: string;
  updated_at: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
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

    // Fetch events with staff and subject information
    const [events] = await connection.query(`
      SELECT 
        e.eventId,
        e.eventName,
        e.location,
        e.detailsShort,
        e.detailsLong,
        e.studentsSignedUp,
        e.totalSpaces,
        e.startTime,
        e.endTime,
        CONCAT(s.firstname, ' ', s.surname) as staffName,
        s.id as staffId,
        e.created_at,
        e.updated_at
      FROM Events e
      LEFT JOIN Staff s ON e.staffAssigned = s.id
      ORDER BY e.startTime DESC
    `);

    // Get subjects for each event
    const eventsWithSubjects = [];
    for (const event of events as EventRow[]) {
      const [subjects] = await connection.query(`
        SELECT sub.id, sub.name, sub.code
        FROM Subjects sub
        JOIN EventSubjects es ON sub.id = es.subjectId
        WHERE es.eventId = ?
      `, [event.eventId]);
      
      eventsWithSubjects.push({
        ...event,
        subjects: subjects as Subject[],
        // Calculate percentage for progress bar
        signUpPercentage: event.totalSpaces > 0 ? Math.round((event.studentsSignedUp / event.totalSpaces) * 100) : 0
      });
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      events: eventsWithSubjects
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error fetching events' },
      { status: 500 }
    );
  }
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

    // Verify the token
    try {
      jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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

    // Insert the event
    const [result] = await connection.execute(`
      INSERT INTO Events (eventName, location, detailsShort, detailsLong, staffAssigned, totalSpaces, startTime, endTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [eventName, location, detailsShort, detailsLong, staffId, totalSpaces, startTime, endTime]);

    const eventId = (result as mysql.ResultSetHeader).insertId;

    // Link subjects to the event
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
      message: 'Event created successfully',
      eventId
    });

  } catch (error) {
    console.error('Error creating event:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error creating event' },
      { status: 500 }
    );
  }
}