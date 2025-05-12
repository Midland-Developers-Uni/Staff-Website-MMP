"use client";
import React, { useEffect, useState } from "react";
import TokenGenerationModal from "../components/TokenGenerationModal";
import "../dashboard/dashboard.css";

interface User {
  userId: number;
  email: string;
  accessLevel: string;
  firstname: string;
  surname: string;
}

export default function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenLifespan, setTokenLifespan] = useState<'1d' | '3d' | '7d'>('7d');

  useEffect(() => {
    // Get user data from the parent ProtectedRoute component
    const userData = document.querySelector('[data-user]')?.getAttribute('data-user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleGenerateToken = async () => {
    if (!user || user.accessLevel !== 'admin') {
      console.error('Only admins can generate tokens');
      return;
    }

    setIsGeneratingToken(true);
    try {
      // Convert lifespan to days for API
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
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Error generating token:', error);
    } finally {
      setIsGeneratingToken(false);
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
              {user.accessLevel === 'admin' && (
                <div className="admin-controls">
                  <div className="token-generation-section">
                    <h3>Generate Staff Account Token</h3>
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
            </div>
          </div>
        )}
        
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <h3>Upcoming Events</h3>
            <p>View and manage school events</p>
          </div>
          
          <div className="dashboard-card">
            <h3>Students</h3>
            <p>Manage student information</p>
          </div>
          
          <div className="dashboard-card">
            <h3>Subjects</h3>
            <p>View and edit subject details</p>
          </div>
          
          <div className="dashboard-card">
            <h3>Staff</h3>
            <p>Manage staff accounts</p>
          </div>
        </div>
      </div>
      
      <TokenGenerationModal 
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        token={generatedToken || undefined}
        expiresAt={tokenExpiration || undefined}
      />
    </div>
  );
}