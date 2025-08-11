/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        awy: {
          primary: '#4F46E5',
          secondary: '#EC4899',
          accent: '#10B981',
          heart: '#EF4444',
          online: '#10B981',
          offline: '#6B7280',
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe': 'breathe 2s ease-in-out infinite',
        'ripple': 'ripple 0.6s linear',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '1',
          },
          '100%': {
            transform: 'scale(2.4)',
            opacity: '0',
          },
        },
        'breathe': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
        },
        'ripple': {
          '0%': {
            transform: 'scale(0)',
            opacity: '0.6',
          },
          '100%': {
            transform: 'scale(4)',
            opacity: '0',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        'glow': {
          '0%': {
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
          },
          '100%': {
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    // Add any additional Tailwind plugins here
  ],
};

