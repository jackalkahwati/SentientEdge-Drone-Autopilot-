"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "dark", setTheme: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode; attribute?: string; defaultTheme?: Theme; enableSystem?: boolean; disableTransitionOnChange?: boolean }> = ({ children, defaultTheme = "dark" }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);


