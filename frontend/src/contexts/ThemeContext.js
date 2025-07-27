import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if there's a stored preference, otherwise default to false
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    // Update the global function that controls matchMedia override
    if (window.updateAppDarkMode) {
      window.updateAppDarkMode(isDarkMode);
    }

    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      // Update theme-color meta tag for dark mode
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.content = '#111827';
      }
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      // Update theme-color meta tag for light mode
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.content = '#ffffff';
      }
    }
    
    // Store preference in localStorage
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));

    // Remove any extension-applied attributes
    const extensionAttributes = ['data-darkreader-mode', 'data-darkreader-scheme'];
    extensionAttributes.forEach(attr => {
      document.documentElement.removeAttribute(attr);
      document.body?.removeAttribute(attr);
    });
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
