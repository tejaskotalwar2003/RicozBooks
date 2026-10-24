/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/views/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          burgundy: {
            950: '#260002',
            900: '#390003',
            800: '#4A0E0E',
            700: '#55080E',
            600: '#781019',
            50: '#FDF4F5',
          },
          gold: {
            600: '#C58B3E',
            500: '#D4AF37',
            400: '#E6B676',
            300: '#EEC68B',
            100: '#FCF4E8',
            50: '#FDF9F3',
          },
          cream: {
            100: '#FFF4E6',
            50: '#FAF5EE',
          },
          charcoal: {
            900: '#0F172A',
            800: '#1F1F1F',
            700: '#334155',
            500: '#64748B',
            300: '#CBD5E1',
            100: '#F1F5F9',
            50: '#F8FAFC',
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
