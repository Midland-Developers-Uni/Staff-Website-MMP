"use client";
import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

export default function ClientThemeSetter() {
  const { darkMode } = useTheme();

  useEffect(() => {
    // Update the body class based on darkMode
    // This replaces any existing classes; adjust if you need to keep others.
    document.body.className = darkMode ? "dark" : "light";
  }, [darkMode]);

  return null; // This component does not render anything visible.
}