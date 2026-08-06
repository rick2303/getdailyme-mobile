/** @type {import('tailwindcss').Config} */
// La paleta espeja los tokens oklch de la web (globals.css) convertidos a hex:
// NativeWind no entiende oklch ni variables CSS, asi que cada acento y tema
// vive aqui como colores con nombre. dark: se maneja con el colorScheme.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  
  theme: {
    extend: {
      colors: {
        bg: '#F8F8FB',
        'bg-dark': '#121219',
        surface: '#FFFFFF',
        'surface-dark': '#1E1E28',
        'surface-raised': '#FFFFFF',
        'surface-raised-dark': '#282834',
        'surface-sunken': '#EFEFF4',
        'surface-sunken-dark': '#181820',
        border: '#E3E3EA',
        'border-dark': '#3A3A46',
        'border-strong': '#CFCFD8',
        'border-strong-dark': '#52525F',
        text: '#26262F',
        'text-dark': '#F2F2F5',
        'text-muted': '#5D5D68',
        'text-muted-dark': '#A8A8B3',
        'text-subtle': '#70707B',
        'text-subtle-dark': '#8F8F9A',
        brand: {
          DEFAULT: '#6B4EE6',
          dark: '#8B75F0',
          soft: '#EDE9FC',
          'soft-dark': '#2E2850',
        },
        danger: '#D93A3A',
        success: '#2E9E5B',
      },
      borderRadius: {
        tile: '24px',
        sheet: '28px',
      },
    },
  },
  plugins: [],
}
