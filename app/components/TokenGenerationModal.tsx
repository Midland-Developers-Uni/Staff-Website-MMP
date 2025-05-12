"use client";
import React, { useState } from "react";
import "./tokenModal.css";

interface TokenGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  expiresAt?: string;
}

export default function TokenGenerationModal({ 
  isOpen, 
  onClose, 
  token, 
  expiresAt 
}: TokenGenerationModalProps) {
  if (!isOpen) return null;

  const formatExpiration = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleString();
  };

  const copyToClipboard = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token);
        // You could add a toast notification here
        console.log('Token copied to clipboard');
      } catch (err) {
        console.error('Failed to copy token:', err);
      }
    }
  };

  return (
    <div className="token-modal-overlay" onClick={onClose}>
      <div className="token-modal" onClick={(e) => e.stopPropagation()}>
        <div className="token-modal-header">
          <h3>Staff Account Token Generated</h3>
          <button className="token-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="token-modal-content">
          <div className="token-display">
            <label>Token:</label>
            <div className="token-value" onClick={copyToClipboard} title="Click to copy">
              {token || 'No token available'}
            </div>
          </div>
          
          <div className="token-expiry">
            <label>Expires:</label>
            <div className="expiry-value">
              {expiresAt ? formatExpiration(expiresAt) : 'No expiration available'}
            </div>
          </div>
          
          <div className="token-instructions">
            <p>💡 <strong>Instructions:</strong></p>
            <ul>
              <li>Share this token with the new staff member</li>
              <li>They will use it during registration</li>
              <li>This token can only be used once</li>
              <li>Click the token to copy it to clipboard</li>
            </ul>
          </div>
        </div>
        
        <div className="token-modal-footer">
          <button className="token-modal-button primary" onClick={copyToClipboard}>
            Copy Token
          </button>
          <button className="token-modal-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}