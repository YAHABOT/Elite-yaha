import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050c1a',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          // Fusion alias — cyan CTA (#00d4ff matches hsl(191,100%,50%) which is --accent)
          fusion: '#00d4ff',
        },
        accent2: '#a855f7',    // Fusion purple secondary accent
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // MasterLog Surface Tokens
        surface: '#091424',
        surfaceHighlight: '#0e1d34',
        surface2: '#0e1d34',   // alias for surfaceHighlight — inner cards
        raise: '#0f2040',      // hover states, progress tracks
        faint: '#475569',      // placeholder/disabled text
        textPrimary: '#e2e8f0',
        textMuted: '#94a3b8',
        // Brighter red — overrides Tailwind's default red-400/500 (#ef4444) app-wide
        red: {
          300: '#ff8080',
          400: '#ff5555',
          500: '#ff2d2d',
          600: '#e01c1c',
        },
        // Health Category Tokens — MasterLog palette
        nutrition: '#00ff9d',
        sleep: '#a855f7',
        workout: '#ff6b35',
        mood: '#ffd700',
        water: '#00d4ff',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-chakra)', 'var(--font-orbitron)', 'monospace'],
        mono: ['var(--font-share-mono)', 'ui-monospace', 'monospace'],
        ui: ['var(--font-audiowide)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
