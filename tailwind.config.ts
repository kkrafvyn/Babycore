import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material Design 3 Color System
        'primary': '#5e5f61',
        'primary-hover': '#4a4b4d',
        'on-primary': '#f9f9fb',
        'primary-foreground': '#f9f9fb',
        'primary-container': '#e2e2e5',
        'on-primary-container': '#505254',
        'primary-fixed': '#e2e2e5',
        'on-primary-fixed': '#3e3f42',
        'primary-dim': '#525355',

        'secondary': '#45627d',
        'on-secondary': '#f6f9ff',
        'secondary-foreground': '#f6f9ff',
        'secondary-container': '#cde5ff',
        'on-secondary-container': '#37546f',
        'secondary-fixed': '#cde5ff',
        'on-secondary-fixed': '#24425b',
        'secondary-dim': '#395670',

        'tertiary': '#506267',
        'on-tertiary': '#effbff',
        'tertiary-container': '#e3f7fd',
        'on-tertiary-container': '#4d5f64',
        'tertiary-fixed': '#e3f7fd',
        'on-tertiary-fixed': '#3b4c52',
        'tertiary-dim': '#44565b',

        'error': '#a83836',
        'on-error': '#fff7f6',
        'error-container': '#fa746f',
        'on-error-container': '#6e0a12',
        'error-dim': '#67040d',

        'background': '#faf9fc',
        'on-background': '#2f3337',

        'surface': '#faf9fc',
        'on-surface': '#2f3337',
        'surface-bright': '#faf9fc',
        'surface-dim': '#d8dae0',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f7',
        'surface-container': '#edeef2',
        'surface-container-high': '#e7e8ed',
        'surface-container-highest': '#e0e2e8',

        'surface-variant': '#e0e2e8',
        'on-surface-variant': '#5c5f64',
        'outline': '#787b80',
        'outline-variant': '#afb2b8',

        'inverse-surface': '#0d0e10',
        'inverse-on-surface': '#9c9d9f',
        'inverse-primary': '#f9f9fc',
        'surface-tint': '#5e5f61',

        // Semantic colors
        'success': '#34C759',
        'warning': '#FF9500',
        'danger': '#FF3B30',
        'info': '#5856D6',

        // Runtime theme tokens used across the app
        'background': 'var(--background)',
        'foreground': 'var(--foreground)',
        'surface': 'var(--surface)',
        'surface-gray': 'var(--surface-gray)',
        'border-gray': 'var(--border-gray)',
        'text-dim': 'var(--text-dim)',
        'text-light': 'var(--text-light)',

        // Shared UI tokens for shadcn-style components
        'accent': 'var(--surface-gray)',
        'accent-foreground': 'var(--foreground)',
        'border': 'var(--border-gray)',
        'input': 'var(--border-gray)',
        'ring': '#5e5f61',
        'card': 'var(--surface)',
        'card-foreground': 'var(--foreground)',
        'popover': 'var(--surface)',
        'popover-foreground': 'var(--foreground)',
        'muted': 'var(--surface-gray)',
        'muted-foreground': 'var(--text-dim)',
        'destructive': '#a83836',
        'destructive-foreground': '#fff7f6',

        // Legacy aliases still used in some screens
        'accent-blue': '#e3f7fd',
        'accent-pink': '#fff0f2',
        'secondary-bg': '#f3f3f7',
        'tertiary-bg': '#e3f7fd',
        'label-primary': 'var(--foreground)',
        'label-secondary': 'var(--text-dim)',
      },
      borderRadius: {
        'DEFAULT': '1rem',
        'lg': '2rem',
        'xl': '3rem',
        'full': '9999px',
      },
      fontFamily: {
        'headline': ['Plus Jakarta Sans', 'sans-serif'],
        'body': ['Manrope', 'sans-serif'],
        'label': ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'editorial': '0 8px 32px rgba(47, 51, 55, 0.05)',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-background',
    'text-foreground',
    'bg-secondary-bg',
    'text-label-primary',
  ],
} satisfies Config
