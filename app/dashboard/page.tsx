"use client";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "../dashboard/dashboard.css";

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="dashboard-container">
      <h1>Welcome to the Staff Dashboard</h1>
      
      {/* Dashboard content */}
      <div className="dashboard-content">
        {user && (
          <div className="user-welcome">
            <h2>Welcome, {user.firstname} {user.surname}</h2>
            <p>Role: {user.accessLevel}</p>
          </div>
        )}
        
        <div className="dashboard-cards">
          {/* Sample dashboard cards */}
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
    </div>
  );
}