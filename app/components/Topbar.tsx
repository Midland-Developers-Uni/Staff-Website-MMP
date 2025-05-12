"use client";
import React, { useState, useEffect } from "react";
import "./topbarStyles.css";
import { useTheme } from "../context/ThemeContext";
import { useRouter, usePathname } from "next/navigation";

const Topbar: React.FC = () => {
    const { darkMode, toggleDarkMode } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const modeClass = darkMode ? "topbar-dark" : "topbar-light";

    // Function to check authentication
    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include',
            });
            setIsAuthenticated(response.ok);
        } catch {
            setIsAuthenticated(false);
        }
    };

    // Check authentication on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Check authentication whenever the route changes
    useEffect(() => {
        checkAuth();
    }, [pathname]);

    // Also check authentication periodically to catch manual logouts
    useEffect(() => {
        const interval = setInterval(checkAuth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            setIsAuthenticated(false);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDashboardClick = () => {
        router.push('/dashboard');
    };

    return (
        <header className={`topbar ${modeClass}`}>
            <div className="topbar-side"></div>
            <div className="topbar-center">
                <div className="topbar-title">Midland Developers</div>
                <div className="topbar-subtitle">Staff Portal</div>
            </div>
            <div className="topbar-side topbar-side-right">
                <nav>
                    {isAuthenticated ? (
                        <>
                            <button onClick={handleDashboardClick} className="nav-link" disabled={isLoading}>
                                Dashboard
                            </button>
                            <button onClick={handleLogout} className="nav-link logout-link" disabled={isLoading}>
                                {isLoading ? 'Logging out...' : 'Logout'}
                            </button>
                        </>
                    ) : null}
                </nav>
                <button onClick={toggleDarkMode} className="nav-link">
                    Toggle Dark Mode
                </button>
            </div>
        </header>
    );
};

export default Topbar;