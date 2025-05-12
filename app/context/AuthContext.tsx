"use client";
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import InactivityModal from "../components/InactivityModal";

// Constants
const INACTIVITY_TIMEOUT = 4 * 60 * 1000; // 4 minutes in milliseconds
const COUNTDOWN_DURATION = 60; // 60 seconds countdown

// Define types for the context
interface User {
  userId: number;
  email: string;
  accessLevel: string;
  firstname: string;
  surname: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [user, setUser] = useState<User | null>(null);
  
  // References to track activity and timeouts
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userActivityRef = useRef(false);
  
  // Function to refresh the JWT token
  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  };
  
  // Function to handle user activity
  const handleUserActivity = () => {
    userActivityRef.current = true;
    
    // If inactivity modal is shown, hide it and reset the countdown
    if (showInactivityModal) {
      setShowInactivityModal(false);
      setCountdown(COUNTDOWN_DURATION);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
    
    // Reset the inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Set a new inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      userActivityRef.current = false;
      setShowInactivityModal(true);
      
      // Start the countdown
      setCountdown(COUNTDOWN_DURATION);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            // Logout when countdown reaches 0
            logout();
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT);
  };
  
  // Function to handle staying logged in
  const handleStayLoggedIn = async () => {
    // Hide the inactivity modal
    setShowInactivityModal(false);
    
    // Reset the countdown
    setCountdown(COUNTDOWN_DURATION);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    // Refresh the token
    const refreshed = await refreshToken();
    if (!refreshed) {
      // If token refresh fails, logout
      logout();
      return;
    }
    
    // Reset the activity tracking
    handleUserActivity();
  };
  
  // Function to handle login
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          message: data.message || 'Authentication failed' 
        };
      }
      
      // Set authenticated state
      setIsAuthenticated(true);
      setUser(data.staff);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  };
  
  // Function to handle logout
  const logout = () => {
    // Clear any timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    // Call logout API
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
    }).catch(error => {
      console.error('Logout API error:', error);
    });
    
    // Reset state
    setIsAuthenticated(false);
    setUser(null);
    
    // Redirect to login page
    router.push('/');
  };
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getCookie('auth_token');
        
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          
          // Only redirect on protected routes
          const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || 
                                  window.location.pathname.startsWith('/events') ||
                                  window.location.pathname.startsWith('/students') ||
                                  window.location.pathname.startsWith('/subjects') ||
                                  window.location.pathname.startsWith('/staff') ||
                                  window.location.pathname.startsWith('/profile');
          
          if (isProtectedRoute) {
            router.push('/');
          }
          return;
        }
        
        // Verify token by making a request to a protected endpoint
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important for cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
          
          // Only redirect on protected routes
          const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || 
                                  window.location.pathname.startsWith('/events') ||
                                  window.location.pathname.startsWith('/students') ||
                                  window.location.pathname.startsWith('/subjects') ||
                                  window.location.pathname.startsWith('/staff') ||
                                  window.location.pathname.startsWith('/profile');
          
          if (isProtectedRoute) {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        setIsAuthenticated(false);
        
        // Only redirect on protected routes
        const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || 
                                window.location.pathname.startsWith('/events') ||
                                window.location.pathname.startsWith('/students') ||
                                window.location.pathname.startsWith('/subjects') ||
                                window.location.pathname.startsWith('/staff') ||
                                window.location.pathname.startsWith('/profile');
        
        if (isProtectedRoute) {
          router.push('/');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Setup activity tracking when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Setup event listeners for activity tracking
    const activityEvents = [
      'mousedown', 
      'mousemove', 
      'keydown', 
      'scroll', 
      'touchstart',
      'click'
    ];
    
    const activityHandler = () => {
      handleUserActivity();
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, activityHandler);
    });
    
    // Initial activity trigger
    handleUserActivity();
    
    // Setup periodic token refresh (every 4 minutes)
    const tokenRefreshInterval = setInterval(async () => {
      if (userActivityRef.current) {
        await refreshToken();
      }
    }, 4 * 60 * 1000);
    
    // Cleanup function
    return () => {
      // Remove event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
      
      // Clear all timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      
      clearInterval(tokenRefreshInterval);
    };
  }, [isAuthenticated]);
  
  // Create the context value object
  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      
      {/* Inactivity modal - only show when authenticated */}
      {isAuthenticated && (
        <InactivityModal
          isOpen={showInactivityModal}
          countdown={countdown}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}