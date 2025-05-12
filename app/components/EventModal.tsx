"use client";
import React, { useState, useEffect } from "react";
import "./eventModal.css";

// Define interfaces
interface Event {
  eventId?: number;
  eventName: string;
  location: string;
  detailsShort: string;
  detailsLong: string;
  studentsSignedUp?: number;
  totalSpaces: number;
  startTime: string;
  endTime: string;
  staffId: number;
  staffName?: string;
  subjects: Subject[];
}

interface Staff {
  id: number;
  firstname: string;
  surname: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
  onSave: (event: Event) => Promise<void>;
  onDelete?: (eventId: number) => Promise<void>;
  mode: 'create' | 'edit' | 'view';
}

export default function EventModal({ 
  isOpen, 
  onClose, 
  event, 
  onSave, 
  onDelete,
  mode 
}: EventModalProps) {
  const [formData, setFormData] = useState<Event>({
    eventName: '',
    location: '',
    detailsShort: '',
    detailsLong: '',
    totalSpaces: 1,
    startTime: '',
    endTime: '',
    staffId: 0,
    subjects: []
  });
  
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStaffAndSubjects();
      if (event) {
        setFormData(event);
        setSelectedSubjects(event.subjects.map(s => s.id));
      } else {
        // Reset form for new event
        const now = new Date();
        const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
        const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
        
        setFormData({
          eventName: '',
          location: '',
          detailsShort: '',
          detailsLong: '',
          totalSpaces: 1,
          startTime: defaultStart.toISOString().slice(0, 16),
          endTime: defaultEnd.toISOString().slice(0, 16),
          staffId: 0,
          subjects: []
        });
        setSelectedSubjects([]);
      }
    }
  }, [isOpen, event]);

  const fetchStaffAndSubjects = async () => {
    setIsLoading(true);
    try {
      // Fetch staff
      const staffResponse = await fetch('/api/staff', {
        credentials: 'include'
      });
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        setAvailableStaff(staffData.staff);
      }

      // Fetch subjects
      const subjectsResponse = await fetch('/api/subjects', {
        credentials: 'include'
      });
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setAvailableSubjects(subjectsData.subjects);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalSpaces' || name === 'staffId' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubjectToggle = (subjectId: number) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const eventData = {
        ...formData,
        subjects: availableSubjects.filter(s => selectedSubjects.includes(s.id))
      };
      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete && event?.eventId) {
      setIsSaving(true);
      try {
        await onDelete(event.eventId);
        onClose();
      } catch (error) {
        console.error('Error deleting event:', error);
      } finally {
        setIsSaving(false);
        setShowDeleteConfirm(false);
      }
    }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <h3>
            {mode === 'create' ? 'Create New Event' : 
             mode === 'edit' ? 'Edit Event' : 'Event Details'}
          </h3>
          <button className="event-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="event-modal-content">
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <form className="event-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="eventName">Event Name</label>
                  <input
                    type="text"
                    id="eventName"
                    name="eventName"
                    value={formData.eventName}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="location">Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="detailsShort">Short Description</label>
                <textarea
                  id="detailsShort"
                  name="detailsShort"
                  value={formData.detailsShort}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="detailsLong">Full Description</label>
                <textarea
                  id="detailsLong"
                  name="detailsLong"
                  value={formData.detailsLong}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="staffId">Assigned Staff</label>
                  <select
                    id="staffId"
                    name="staffId"
                    value={formData.staffId}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required
                  >
                    <option value={0}>Select Staff Member</option>
                    {availableStaff.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstname} {staff.surname}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="totalSpaces">Total Spaces</label>
                  <input
                    type="number"
                    id="totalSpaces"
                    name="totalSpaces"
                    value={formData.totalSpaces}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Related Subjects</label>
                <div className="subjects-selector">
                  {availableSubjects.map(subject => (
                    <label key={subject.id} className="subject-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        disabled={isViewMode}
                      />
                      <span>{subject.name} ({subject.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              {isViewMode && formData.studentsSignedUp !== undefined && (
                <div className="form-group">
                  <label>Students Signed Up</label>
                  <div className="signup-display">
                    {formData.studentsSignedUp} / {formData.totalSpaces} students
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(formData.studentsSignedUp / formData.totalSpaces) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
        
        <div className="event-modal-footer">
          {mode === 'view' ? (
            <>
              <button className="btn-secondary" onClick={onClose}>Close</button>
            </>
          ) : (
            <>
              <div className="footer-left">
                {mode === 'edit' && onDelete && (
                  <button 
                    className="btn-danger" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                  >
                    Delete Event
                  </button>
                )}
              </div>
              <div className="footer-right">
                <button className="btn-secondary" onClick={onClose} disabled={isSaving}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSave}
                  disabled={isSaving || formData.staffId === 0}
                >
                  {isSaving ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="confirm-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Delete Event</h4>
            <p>Are you sure you want to delete this event? This action cannot be undone.</p>
            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}