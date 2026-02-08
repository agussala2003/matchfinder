/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: '#39FF14', // Neon Green - Brand, CTAs, Active states
        background: '#121212', // Deep Black - App background
        card: '#1F2937', // Dark Gray - Cards, inputs, containers
        modal: '#111827', // Darker Gray - Modals, overlays (depth)
        border: '#374151', // Medium Gray - Inactive borders, dividers

        // Typography
        'text-main': '#F9FAFB', // Off-white - Primary text
        'text-muted': '#9CA3AF', // Medium Gray - Secondary text, placeholders

        // Feedback States
        success: '#4ADE80', // Soft Green - Success states
        error: '#EF4444', // Red - Error states, destructive actions
        warning: '#EAB308', // Gold - Warnings, important callouts

        // User Roles (Hierarchical)
        gold: '#EAB308', // Captain/Admin - Gold accents
        silver: '#E5E7EB', // Vice-Captain - Platinum/Light Gray
        bronze: '#4B5563', // Player - Dark Gray

        // Legacy support (will be deprecated)
        dark: '#121212',
        accent: '#64748b',
      },
      fontFamily: {
        title: ['Oswald_700Bold'],
        subtitle: ['Oswald_500Medium'],
        body: ['Inter_400Regular'],
        bodyBold: ['Inter_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
      },
      spacing: {
        xs: '4px', // 1 in Tailwind scale
        sm: '8px', // 2 in Tailwind scale
        md: '12px', // 3 in Tailwind scale
        lg: '16px', // 4 in Tailwind scale
        xl: '24px', // 6 in Tailwind scale
        '2xl': '32px', // 8 in Tailwind scale
      },
    },
  },
  plugins: [],
}
