"use client";
import React from "react";
import "./topbarStyles.css";
import { useTheme } from "../context/ThemeContext";

interface TopbarOptions {
    loggedIn: boolean;
}

interface TopbarProps {
    options: TopbarOptions;
}

const Topbar: React.FC<TopbarProps> = ({ options }) => {
    const { loggedIn } = options;
    const { darkMode, toggleDarkMode } = useTheme();
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
                    {loggedIn ? (
                        <>
                            <a href="/dashboard" className="nav-link">
                                Dashboard
                            </a>
                            <a href="/logout" className="nav-link">
                                Logout
                            </a>
                        </>
                    ) : (<></>)}
                </nav>
                <button onClick={toggleDarkMode} className="nav-link">Toggle Dark Mode</button>
            </div>
        </header>
    );
};

export default Topbar;