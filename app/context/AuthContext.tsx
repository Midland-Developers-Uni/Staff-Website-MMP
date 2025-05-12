"use client";
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import InactivityModal from "../components/InactivityModal";

// Constants
const INACTIVITY_TIMEOUT = 4 * 60 * 1000; // 4 minutes in milliseconds
const COUNTDOWN_DURATION = 60; // 60 seconds countdown
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Define types for the context
interface User {
  userId: number;
  email: string;
  accessLevel: string;
  firstname: string;
  surname: string;
  [key: string]: unknown;
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
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isInitialLoad = useRef(true);
  const isLoggingOut = useRef(false);
  
  // Function to check if current path is protected
  const isProtectedRoute = useCallback((pathname: string) => {
    return pathname.startsWith('/dashboard') || 
           pathname.startsWith('/events') ||
           pathname.startsWith('/students') ||
           pathname.startsWith('/subjects') ||
           pathname.startsWith('/staff') ||
           pathname.startsWith('/profile');
  }, []);
  
  // Function to refresh the JWT token
  const refreshToken = useCallback(async () => {
    try {
      console.log('Attempting token refresh...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token refresh result:', data.success);
        return data.success;
      }
      console.log('Token refresh failed: HTTP', response.status);
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }, []);
  
  // Function to handle logout - moved earlier to fix dependency issue
  const logout = useCallback(() => {
    console.log('Logging out...');
    isLoggingOut.current = true;
    
    // Clear any timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
    
    // Call logout API
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }).catch(error => {
      console.error('Logout API error:', error);
    });
    
    // Reset state
    setIsAuthenticated(false);
    setUser(null);
    setShowInactivityModal(false);
    setIsLoading(false); // Ensure loading is false after logout
    
    // Redirect to login page only if on a protected route
    if (isProtectedRoute(window.location.pathname)) {
      router.push('/');
    }
    
    // Small delay to reset logout flag
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 100);
  }, [router, isProtectedRoute]);
  
  // Function to handle user activity - now logout is defined above
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
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
    
    // Set a new inactivity timer only if authenticated
    if (isAuthenticated) {
      inactivityTimerRef.current = setTimeout(() => {
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
    }
  }, [showInactivityModal, isAuthenticated, logout]);
  
  // Function to handle staying logged in
  const handleStayLoggedIn = async () => {
    try {
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
    } catch (error) {
      console.error('Error staying logged in:', error);
      logout();
    }
  };
  
  // Function to handle login
  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      setIsLoading(true); // Set loading during login
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This is crucial for cookies
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log('Login failed:', data.message);
        setIsLoading(false); // Reset loading on failure
        return { 
          success: false, 
          message: data.message || 'Authentication failed' 
        };
      }
      
      console.log('Login successful, setting auth state...');
      console.log('Received data:', {
        hasToken: !!data.token,
        hasStaff: !!data.staff,
        staff: data.staff?.email
      });
      
      // Set authenticated state
      setIsAuthenticated(true);
      setUser(data.staff);
      setIsLoading(false); // Reset loading on success
      
      // Start activity tracking
      handleUserActivity();
      
      // Small delay to ensure cookie processing and then redirect
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        router.push('/dashboard');
      }, 100);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false); // Reset loading on error
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  };
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if we're in the middle of logging out
      if (isLoggingOut.current) {
        console.log('Skipping auth check during logout');
        return;
      }
      
      try {
        console.log('Checking authentication...');
        console.log('Current URL:', window.location.pathname);
        console.log('Cookies present:', document.cookie.split(';').map(c => c.trim().split('=')[0]));
        
        // Don't check auth immediately on login page
        if (!isInitialLoad.current && window.location.pathname === '/') {
          console.log('On login page, skipping auth check');
          setIsLoading(false);
          return;
        }
        
        console.log('Making auth verification request...');
        
        // Verify token by making a request to a protected endpoint
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // This ensures cookies are sent
        });
        
        console.log('Auth verification response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Token verified successfully for:', data.user.email);
          setIsAuthenticated(true);
          setUser(data.user);
          
          // Start activity tracking if authenticated
          handleUserActivity();
        } else {
          console.log('Token verification failed');
          const errorData = await response.json().catch(() => ({}));
          console.log('Error details:', errorData);
          setIsAuthenticated(false);
          
          // Only redirect on protected routes
          if (isProtectedRoute(window.location.pathname)) {
            console.log('On protected route with invalid/no token, redirecting to login');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        setIsAuthenticated(false);
        
        // Only redirect on protected routes
        if (isProtectedRoute(window.location.pathname)) {
          console.log('Auth check failed on protected route, redirecting to login');
          router.push('/');
        }
      } finally {
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    };
    
    // Add a small delay to ensure the page is fully loaded
    setTimeout(checkAuth, 100);
  }, [router, isProtectedRoute, handleUserActivity]);
  
  // Setup activity tracking when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    console.log('Setting up activity tracking...');
    
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
      window.addEventListener(event, activityHandler, { passive: true });
    });
    
    // Setup periodic token refresh (every 5 minutes)
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
    
    tokenRefreshIntervalRef.current = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      // Only refresh if user has been active recently (within last 6 minutes)
      if (timeSinceActivity < 6 * 60 * 1000) {
        console.log('Attempting periodic token refresh...');
        const refreshed = await refreshToken();
        if (!refreshed) {
          // If refresh fails, logout
          console.log('Periodic token refresh failed, logging out');
          logout();
        }
      }
    }, TOKEN_REFRESH_INTERVAL);
    
    // Cleanup function
    return () => {
      console.log('Cleaning up activity tracking...');
      // Remove event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
      
      // Clear all timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, handleUserActivity, refreshToken, logout]);
  
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