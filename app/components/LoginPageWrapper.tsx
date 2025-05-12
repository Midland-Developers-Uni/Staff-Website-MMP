"use client";
import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import BackgroundImageCycle from "./BackgroundImageCycle";
import AuthForm from "./AuthForm";

export default function LoginPageWrapper() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading...
      </main>
    );
  }

  // If authenticated but hasn't redirected yet, show loading
  if (isAuthenticated) {
    return (
      <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Redirecting to dashboard...
      </main>
    );
  }

  // Show login form when not authenticated and not loading
  return (
    <main>
      <BackgroundImageCycle />
      <AuthForm />
    </main>
  );
}