import Constants from 'expo-constants'

// Valores por defecto (Fallback)
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=User'

// Aquí centralizamos toda la config de la app
export const CONFIG = {
  // Configuración de Supabase (Leída de variables de entorno o defaults)
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY || '',
    storageBucket: {
      avatars: process.env.EXPO_PUBLIC_SUPABASE_STORAGE_AVATARS || 'avatars',
      teamLogos: process.env.EXPO_PUBLIC_SUPABASE_STORAGE_TEAM_LOGOS || 'team-logos',
    },
  },

  // Límites y Reglas de Negocio
  limits: {
    maxAvatarSizeMB: 2,
    maxTeamNameLength: 30,
    minPasswordLength: 6,
  },

  // Recursos por defecto
  defaults: {
    avatar: DEFAULT_AVATAR,
    teamLogo: 'https://placehold.co/400x400/121212/39FF14?text=TEAM',
  },

  // Info de la App (Leída del app.json)
  app: {
    version: Constants.expoConfig?.version || '1.0.0',
    name: Constants.expoConfig?.name || 'MatchFinder',
  },
}
