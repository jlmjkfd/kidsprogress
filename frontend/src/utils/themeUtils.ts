import { Theme } from '../contexts/ThemeContext';

/**
 * Get Tailwind CSS classes for the current theme
 */
export const getThemeClasses = (theme: Theme) => {
  const baseClasses = {
    // Primary colors
    primary: theme.name === 'universe' ? 'purple' : 'green',
    secondary: theme.name === 'universe' ? 'indigo' : 'amber',
    accent: theme.name === 'universe' ? 'violet' : 'orange',
  };

  return {
    // Button classes
    primaryButton: `bg-${baseClasses.primary}-500 hover:bg-${baseClasses.primary}-600 text-white`,
    secondaryButton: `bg-${baseClasses.secondary}-500 hover:bg-${baseClasses.secondary}-600 text-white`,
    
    // Text colors
    primaryText: `text-${baseClasses.primary}-600`,
    secondaryText: `text-${baseClasses.secondary}-600`,
    
    // Background gradients
    primaryGradient: theme.colors.gradients.primary,
    secondaryGradient: theme.colors.gradients.secondary,
    backgroundGradient: theme.colors.gradients.background,
    
    // Border colors
    primaryBorder: `border-${baseClasses.primary}-200`,
    secondaryBorder: `border-${baseClasses.secondary}-200`,
    
    // Card styles
    card: `bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-${baseClasses.primary}-200`,
    
    // Input styles
    input: `border-2 border-${baseClasses.primary}-200 focus:border-${baseClasses.primary}-400 focus:ring-2 focus:ring-${baseClasses.primary}-200`,
  };
};

/**
 * Get theme-appropriate emojis and icons
 */
export const getThemeIcons = (theme: Theme) => {
  if (theme.name === 'universe') {
    return {
      robot: '🤖',
      thinking: '🌌',
      success: '⭐',
      error: '💫',
      loading: '🔮',
      chat: '👽',
      writing: '📝',
      math: '🧮',
      settings: '🛸',
    };
  } else { // dinosaur
    return {
      robot: '🦕',
      thinking: '🌿',
      success: '🌟',
      error: '🌋',
      loading: '🥚',
      chat: '🦖',
      writing: '🖍️',
      math: '🧮',
      settings: '⚙️',
    };
  }
};

/**
 * Get theme-appropriate background images
 */
export const getThemeBackgrounds = (theme: Theme) => {
  return {
    main: `/src/assets/themes/${theme.name}-background.svg`,
    icon: `/src/assets/themes/${theme.name}-icon.svg`,
  };
};

/**
 * Get theme-appropriate sound effects (for future use)
 */
export const getThemeSounds = (theme: Theme) => {
  if (theme.name === 'universe') {
    return {
      click: 'space-beep.mp3',
      success: 'cosmic-success.mp3',
      error: 'space-error.mp3',
      notification: 'space-ping.mp3',
    };
  } else { // dinosaur
    return {
      click: 'dino-chirp.mp3',
      success: 'dino-roar.mp3',
      error: 'volcano-rumble.mp3',
      notification: 'forest-sound.mp3',
    };
  }
};

/**
 * Apply theme to document root for CSS custom properties
 */
export const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;
  
  // Set CSS custom properties
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-background', theme.colors.background);
  root.style.setProperty('--theme-surface', theme.colors.surface);
  root.style.setProperty('--theme-text-primary', theme.colors.text.primary);
  root.style.setProperty('--theme-text-secondary', theme.colors.text.secondary);
  root.style.setProperty('--theme-text-accent', theme.colors.text.accent);
  
  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme.name);
};