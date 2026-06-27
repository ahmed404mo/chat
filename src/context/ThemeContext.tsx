"use client";

import { createContext, useContext, type ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

// This script runs immediately when the component is rendered on the client,
// preventing the flash of an incorrect theme.
const setInitialThemeScript = `
  (function() {
    try {
      document.documentElement.classList.add('dark');
      document.documentElement.dir = 'rtl';
      localStorage.removeItem('theme');
    } catch (e) {
      console.error('Failed to set initial theme:', e);
    }
  })();
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: Theme = "dark";
  const toggleTheme = () => {}; // No-op, as theme is fixed.

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <script dangerouslySetInnerHTML={{ __html: setInitialThemeScript }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
