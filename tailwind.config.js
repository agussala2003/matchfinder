/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ajusta los paths si tienes otras carpetas
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Base
        background: '#121217', // oklch(0.12 0.01 250)
        foreground: '#FBFBFB', // oklch(0.98 0 0)

        // Surfaces
        card: '#1A1A21', // oklch(0.16 0.01 250)
        'card-foreground': '#FBFBFB',
        popover: '#1A1A21',
        'popover-foreground': '#FBFBFB',

        // Brand
        primary: '#00D54B', // oklch(0.7 0.2 145) -> Tu nuevo Verde Neon
        'primary-foreground': '#121217',

        secondary: '#26262C', // oklch(0.22 0.01 250)
        'secondary-foreground': '#FBFBFB',

        accent: '#5D5FEF', // oklch(0.55 0.15 250) -> Azul/Violeta deportivo
        'accent-foreground': '#FBFBFB',

        // States
        destructive: '#D93036', // oklch(0.55 0.2 25)
        'destructive-foreground': '#FBFBFB',
        muted: '#26262C',
        'muted-foreground': '#A1A1AA', // oklch(0.65 0 0)

        // Borders & Inputs
        border: '#32323A', // oklch(0.28 0.01 250)
        input: '#26262C',
        ring: '#00D54B',

        // Text utilities for convenience
        'text-main': '#FBFBFB',
        'text-muted': '#A1A1AA',
        'text-primary': '#00D54B',
        warning: '#EAB308',
        error: '#EF4444',
        success: '#22C55E',
        modal: '#1A1A21',

        // Define additional colors that are being used in components
        gold: '#EAB308',
        silver: '#E5E7EB',

        // Avatar and component specific colors
        'avatar-bg': '#26262C',
        'avatar-border': '#32323A',
      },
      fontFamily: {
        // Ahora todo usa Inter. NativeWind mapeará esto a las fuentes cargadas.
        sans: ['Inter_400Regular'],
        title: ['Inter_700Bold'],
        body: ['Inter_400Regular'],
        bold: ['Inter_700Bold'],
        medium: ['Inter_500Medium'],
      },
    },
  },
  plugins: [],
}
