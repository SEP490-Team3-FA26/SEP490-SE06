import React, { createContext, useState, useContext } from 'react';
import { useColorScheme } from 'react-native';

export const Colors = {
  dark: {
    background: '#0a0014',
    surface: '#1a0033',
    surfaceSecondary: '#2a004d',
    text: '#ffffff',
    textSecondary: '#b388ff',
    border: '#4d0099',
    accent: '#d500f9',
    accentSecondary: '#00e5ff',
  },
  light: {
    background: '#f8f9fa',
    surface: '#ffffff',
    surfaceSecondary: '#f1f3f5',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    accent: '#d500f9',
    accentSecondary: '#00bcd4',
  }
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: typeof Colors.dark;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
