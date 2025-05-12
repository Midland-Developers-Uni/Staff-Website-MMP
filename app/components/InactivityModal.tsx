"use client";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import "./inactivityModal.css";

interface InactivityModalProps {
  isOpen: boolean;
  countdown: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

const InactivityModal: React.FC<InactivityModalProps> = ({
  isOpen,
  countdown,
  onStayLoggedIn,
  onLogout,
}) => {
  const { darkMode } = useTheme();
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className={`inactivity-modal-overlay ${darkMode ? "dark" : "light"}`}>
      <div className="inactivity-modal">
        <h2>Are you still there?</h2>
        <p>
          Due to inactivity, you will be logged out in{" "}
          <span className="countdown">{countdown}</span> seconds.
        </p>
        <div className="countdown-progress">
          <div 
            className="countdown-bar" 
            style={{ width: `${(countdown / 60) * 100}%` }}
          ></div>
        </div>
        <div className="inactivity-modal-buttons">
          <button 
            className="stay-button" 
            onClick={onStayLoggedIn}
          >
            Yes, keep me logged in
          </button>
          <button 
            className="logout-button" 
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityModal;