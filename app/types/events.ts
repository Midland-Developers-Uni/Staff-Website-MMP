// types/events.ts
export interface Subject {
  id: number;
  name: string;
  code: string;
}

export interface Staff {
  id: number;
  firstname: string;
  surname: string;
}

// Base Event interface for creation/editing
export interface EventFormData {
  eventName: string;
  location: string;
  detailsShort: string;
  detailsLong: string;
  totalSpaces: number;
  startTime: string;
  endTime: string;
  staffId: number;
  subjects: Subject[];
}

// Complete Event interface for display
export interface Event extends EventFormData {
  eventId: number;
  studentsSignedUp: number;
  staffName: string;
  signUpPercentage?: number;
}

// Event interface for API creation (without eventId)
export interface CreateEventRequest extends EventFormData {
  eventId?: never;
}

// Event interface for API updates (with eventId)
export interface UpdateEventRequest extends EventFormData {
  eventId: number;
}