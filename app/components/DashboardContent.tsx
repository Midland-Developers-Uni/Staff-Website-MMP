"use client";
import React, { useEffect, useState } from "react";
import TokenGenerationModal from "../components/TokenGenerationModal";
import EventModal from "../components/EventModal";
import "./dashboard.css";
import { Event, EventFormData } from "../types/events";

interface User {
  userId: number;
  email: string;
  accessLevel: string;
  firstname: string;
  surname: string;
}

type SortField = 'eventId' | 'eventName' | 'location' | 'studentsSignedUp' | 'totalSpaces' | 'startTime' | 'endTime' | 'staffName';
type SortOrder = 'asc' | 'desc';

export default function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenLifespan, setTokenLifespan] = useState<'1d' | '3d' | '7d'>('7d');
  
  // Events table state
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit' | 'view'>('view');

  useEffect(() => {
    // Get user data from the parent ProtectedRoute component
    const userData = document.querySelector('[data-user]')?.getAttribute('data-user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const response = await fetch('/api/events', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      } else {
        console.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => {
      let aValue: string | number | Date = a[sortField];
      let bValue: string | number | Date = b[sortField];
      
      // Handle date sorting
      if (sortField === 'startTime' || sortField === 'endTime') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [events, sortField, sortOrder]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sort-icon">
          <path d="M7 10l5 5 5-5z" fill="currentColor" opacity="0.5"/>
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sort-icon">
        <path d="M7 14l5-5 5 5z" fill="currentColor"/>
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sort-icon">
        <path d="M7 10l5 5 5-5z" fill="currentColor"/>
      </svg>
    );
  };

  const handleGenerateToken = async () => {
    if (!user || user.accessLevel !== 'admin') {
      console.error('Only admins can generate tokens');
      return;
    }

    setIsGeneratingToken(true);
    try {
      const lifespanDays = tokenLifespan === '1d' ? 1 : tokenLifespan === '3d' ? 3 : 7;
      
      const response = await fetch('/api/auth/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          lifespanDays
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedToken(data.token);
        setTokenExpiration(data.expiresAt);
        setIsTokenModalOpen(true);
      } else {
        const errorData = await response.json();
        console.error('Error generating token:', errorData.message);
      }
    } catch (error) {
      console.error('Error generating token:', error);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleEventRowClick = (event: Event) => {
    setSelectedEvent(event);
    setEventModalMode('view');
    setIsEventModalOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(undefined);
    setEventModalMode('create');
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setEventModalMode('edit');
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (eventData: EventFormData) => {
    try {
      let url = '/api/events';
      let method = 'POST';
      
      if (eventModalMode === 'edit' && selectedEvent?.eventId) {
        url = `/api/events/${selectedEvent.eventId}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        fetchEvents(); // Refresh the events list
      } else {
        const errorData = await response.json();
        console.error('Error saving event:', errorData.message);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchEvents(); // Refresh the events list
      } else {
        const errorData = await response.json();
        console.error('Error deleting event:', errorData.message);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Welcome to the Staff Dashboard</h1>
      
      <div className="dashboard-content">
        {user && (
          <div className="user-welcome">
            <h2>Welcome, {user.firstname} {user.surname}</h2>
            <div className="user-details">
              <p className="user-role">Role: {user.accessLevel}</p>
              
              <div className="dashboard-actions">
                {user.accessLevel === 'admin' && (
                  <div className="token-generation-section">
                    <h3>Admin Actions</h3>
                    <div className="admin-buttons">
                      <div className="token-controls">
                        <div className="lifespan-selector">
                          <label htmlFor="token-lifespan">Token Lifespan:</label>
                          <select 
                            id="token-lifespan" 
                            value={tokenLifespan} 
                            onChange={(e) => setTokenLifespan(e.target.value as '1d' | '3d' | '7d')}
                            disabled={isGeneratingToken}
                          >
                            <option value="1d">1 Day</option>
                            <option value="3d">3 Days</option>
                            <option value="7d">7 Days</option>
                          </select>
                        </div>
                        <button 
                          className="generate-token-btn"
                          onClick={handleGenerateToken}
                          disabled={isGeneratingToken}
                        >
                          {isGeneratingToken ? 'Generating...' : 'Generate Token'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="event-actions-section">
                  <h3>Event Management</h3>
                  <button 
                    className="create-event-btn"
                    onClick={handleCreateEvent}
                  >
                    Create New Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Events Table */}
        <div className="events-section">
          <h2>Events</h2>
          {isLoadingEvents ? (
            <div className="loading-events">Loading events...</div>
          ) : (
            <div className="events-table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('eventId')}>
                      ID {renderSortIcon('eventId')}
                    </th>
                    <th onClick={() => handleSort('eventName')}>
                      Event Name {renderSortIcon('eventName')}
                    </th>
                    <th onClick={() => handleSort('location')}>
                      Location {renderSortIcon('location')}
                    </th>
                    <th onClick={() => handleSort('staffName')}>
                      Staff {renderSortIcon('staffName')}
                    </th>
                    <th onClick={() => handleSort('studentsSignedUp')}>
                      Sign-ups {renderSortIcon('studentsSignedUp')}
                    </th>
                    <th onClick={() => handleSort('totalSpaces')}>
                      Total Spaces {renderSortIcon('totalSpaces')}
                    </th>
                    <th onClick={() => handleSort('startTime')}>
                      Start Time {renderSortIcon('startTime')}
                    </th>
                    <th onClick={() => handleSort('endTime')}>
                      End Time {renderSortIcon('endTime')}
                    </th>
                    <th>Subjects</th>
                    {user?.accessLevel === 'admin' && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={user?.accessLevel === 'admin' ? 10 : 9} className="no-events">No events found</td>
                    </tr>
                  ) : (
                    sortedEvents.map((event) => (
                      <tr key={event.eventId} className="event-row" onClick={() => handleEventRowClick(event)}>
                        <td>{event.eventId}</td>
                        <td className="event-name-cell">
                          <div className="event-name">{event.eventName}</div>
                          {event.detailsShort && (
                            <div className="event-details">{event.detailsShort}</div>
                          )}
                        </td>
                        <td>{event.location}</td>
                        <td>{event.staffName}</td>
                        <td>
                          <div className="signup-info">
                            <span>{event.studentsSignedUp}</span>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${event.signUpPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>{event.totalSpaces}</td>
                        <td>{formatDate(event.startTime)}</td>
                        <td>{formatDate(event.endTime)}</td>
                        <td>
                          <div className="subjects-list">
                            {event.subjects.map((subject) => (
                              <span key={subject.id} className="subject-tag">
                                {subject.code}
                              </span>
                            ))}
                          </div>
                        </td>
                        {user?.accessLevel === 'admin' && (
                          <td>
                            <button 
                              className="edit-event-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <TokenGenerationModal 
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        token={generatedToken || undefined}
        expiresAt={tokenExpiration || undefined}
      />
      
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        mode={eventModalMode}
      />
    </div>
  );
}