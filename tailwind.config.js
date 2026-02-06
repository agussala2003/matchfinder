/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#39FF14", // Verde Neón (Tu marca)
        dark: "#121212", // Fondo principal
        card: "#1E1E1E", // Fondo de tarjetas (ligeramente más claro)
        accent: "#64748b", // Gris para textos secundarios
      },
      fontFamily: {
        // "font-title" usará Oswald
        title: ["Oswald_700Bold"],
        subtitle: ["Oswald_500Medium"],
        // "font-body" usará Inter
        body: ["Inter_400Regular"],
        bodyBold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
