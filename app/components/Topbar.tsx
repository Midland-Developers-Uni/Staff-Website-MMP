"use client";
import React from "react";
import "./topbarStyles.css";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

// Interface removed since we're not using the options prop anymore
interface TopbarProps {
  // No props needed
}

const Topbar: React.FC<TopbarProps> = () => {
    const { darkMode, toggleDarkMode } = useTheme();
    const { isAuthenticated, logout } = useAuth();
    const modeClass = darkMode ? "topbar-dark" : "topbar-light";

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
                            <a href="/dashboard" className="nav-link">
                                Dashboard
                            </a>
                            <button onClick={logout} className="nav-link logout-link">
                                Logout
                            </button>
                        </>
                    ) : (<></>)}
                </nav>
                <button onClick={toggleDarkMode} className="nav-link">Toggle Dark Mode</button>
            </div>
        </header>
    );
};

export default Topbar;