"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  dark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize theme from localStorage on client mount, defaulting to true (dark mode)
  useEffect(() => {
    const savedTheme = localStorage.getItem("aquatic_emerald_theme");
    if (savedTheme !== null) {
      setDark(savedTheme === "true");
    } else {
      setDark(true); // Default to dark mode
    }
    setIsHydrated(true);
  }, []);

  // Update HTML class and save preference when theme changes
  useEffect(() => {
    if (isHydrated) {
      document.documentElement.classList.toggle("dark", dark);
      localStorage.setItem("aquatic_emerald_theme", String(dark));
    } else {
      // Toggle class initially based on state before saved preference is hydrated
      document.documentElement.classList.toggle("dark", dark);
    }
  }, [dark, isHydrated]);

  const toggleDark = () => {
    setDark((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
