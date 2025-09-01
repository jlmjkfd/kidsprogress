import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'universe' | 'dinosaur';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
    gradients: {
      primary: string;
      secondary: string;
      background: string;
    };
  };
  emoji: string;
  description: string;
}

const themes: Record<ThemeName, Theme> = {
  universe: {
    name: 'universe',
    displayName: 'Universe Space',
    emoji: '🌌',
    description: 'Explore the cosmos with deep space colors',
    colors: {
      primary: '#6366f1', // Brighter indigo
      secondary: '#3730a3', // Medium indigo
      accent: '#8b5cf6', // Bright violet
      background: '#1e1b4b', // Dark indigo
      surface: '#312e81', // Medium indigo
      text: {
        primary: '#f8fafc', // Very light gray
        secondary: '#e2e8f0', // Light gray
        accent: '#c4b5fd', // Light violet
      },
      gradients: {
        primary: 'from-indigo-600 via-purple-600 to-violet-600',
        secondary: 'from-violet-500 to-purple-500',
        background: 'from-indigo-100 via-purple-50 to-violet-100',
      },
    },
  },
  dinosaur: {
    name: 'dinosaur',
    displayName: 'Dinosaur Adventure',
    emoji: '🦕',
    description: 'Journey back to prehistoric times',
    colors: {
      primary: '#15803d', // Forest green
      secondary: '#a3a3a3', // Gray (stone)
      accent: '#f59e0b', // Amber (sun)
      background: '#f0f9ff', // Very light blue
      surface: '#ecfdf5', // Light green
      text: {
        primary: '#1f2937', // Dark gray
        secondary: '#4b5563', // Medium gray
        accent: '#059669', // Green
      },
      gradients: {
        primary: 'from-green-700 via-emerald-600 to-teal-600',
        secondary: 'from-amber-500 to-orange-500',
        background: 'from-green-50 via-emerald-50 to-teal-50',
      },
    },
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeName: ThemeName) => void;
  themes: Record<ThemeName, Theme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as ThemeName) || 'universe';
  });

  const setTheme = (themeName: ThemeName) => {
    setCurrentThemeName(themeName);
    localStorage.setItem('theme', themeName);
  };

  useEffect(() => {
    // Apply CSS custom properties for the current theme
    const theme = themes[currentThemeName];
    const root = document.documentElement;
    
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-accent', theme.colors.text.accent);
  }, [currentThemeName]);

  const value = {
    currentTheme: themes[currentThemeName],
    setTheme,
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}