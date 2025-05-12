"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  userId: number;
  email: string;
  accessLevel: string;
  firstname: string;
  surname: string;
  [key: string]: unknown;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        console.log('ProtectedRoute: Checking authentication...');
        
        // Verify token by making a request to a protected endpoint
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          console.log('ProtectedRoute: Token verified for:', data.user.email);
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          console.log('ProtectedRoute: Token verification failed, redirecting to login');
          router.push('/');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('ProtectedRoute: Authentication check error:', error);
        router.push('/');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Pass user data to children via context or props if needed
  return (
    <div data-user={JSON.stringify(user)}>
      {children}
    </div>
  );
}