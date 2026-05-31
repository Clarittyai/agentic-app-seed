/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include the widget toolkit's compiled output so its (liquid-glass)
    // className strings aren't purged when an app imports its components.
    "./node_modules/@clarittyai/widget-toolkit/dist/**/*.js",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'sm': '640px',
      'md': '920px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Brand colors — driven by CSS variables so each generated app gets a
        // unique theme (defaults live in src/index.css :root; per-app values
        // are injected into src/theme.css at generation time). HSL channels +
        // <alpha-value> so opacity utilities (bg-primary/10) keep working.
        primary: {
          DEFAULT: 'hsl(var(--brand-primary) / <alpha-value>)',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#000000',
          foreground: '#FFFFFF',
        },
        // Accent — the app's primary brand color (theme-driven).
        accent: {
          DEFAULT: 'hsl(var(--brand-accent) / <alpha-value>)',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#5B7FFF',
          600: 'hsl(var(--brand-accent-600) / <alpha-value>)',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          foreground: '#FFFFFF',
        },
        // Vibrant Orange - Energy & Creativity
        orange: {
          DEFAULT: '#FF9500',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF9500',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Vibrant Purple - Innovation & Magic
        purple: {
          DEFAULT: '#AF52DE',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#AF52DE',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        // Vibrant Green - Success & Growth
        green: {
          DEFAULT: '#34C759',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#34C759',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        // Vibrant Pink - Excitement & Passion
        pink: {
          DEFAULT: '#FF69B4',
          50: '#FFF5F7',
          100: '#FFE4EC',
          200: '#FFC9DE',
          300: '#FFA3CA',
          400: '#FF7BB8',
          500: '#FF69B4',
          600: '#FF1493',
          700: '#E6007A',
          800: '#B8005F',
          900: '#8A0047',
        },
        // Vibrant Teal/Cyan - Modern & Fresh
        teal: {
          DEFAULT: '#5AC8FA',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#5AC8FA',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Sunny Yellow - Brightness & Energy
        yellow: {
          DEFAULT: '#FFD60A',
          50: '#FFFBEB',
          100: '#FFF3C4',
          200: '#FFE58F',
          300: '#FFD60A',
          400: '#FFC107',
          500: '#FFB300',
          600: '#FFA000',
          700: '#FF8F00',
          800: '#FF6F00',
          900: '#E65100',
        },
        // Existing shadcn/ui colors (kept for compatibility)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: '#34C759',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#FF9500',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        // Theme-driven: --brand-font holds the full stack (default in index.css).
        sans: ['var(--brand-font)'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, hsla(240,100%,70%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(190,100%,75%,0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(330,100%,75%,0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(30,100%,65%,0.1) 0px, transparent 50%)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        'lift': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
        'lift-lg': '0 20px 60px -15px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { opacity: '0.5', filter: 'blur(20px)' },
          '100%': { opacity: '1', filter: 'blur(30px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
