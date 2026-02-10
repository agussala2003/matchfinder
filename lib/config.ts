import Constants from 'expo-constants'

export const CONFIG = {
  // Supabase Configuration
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY || '',
    storageBucket: {
      avatars: 'avatars',
      teamLogos: 'team-logos',
    },
  },

  // Application Limits
  limits: {
    maxNameLength: 30,
    maxFileSize: 2 * 1024 * 1024, // 2MB in bytes
    minPasswordLength: 6,
    maxTeamMembers: 25,
    maxAvatarSizeMB: 2,
    maxTeamNameLength: 30,
  },

  // Default Values
  defaults: {
    avatarUrl: 'https://ui-avatars.com/api/?background=39FF14&color=000&name=User',
    teamLogoUrl: 'https://placehold.co/400x400/121217/39FF14?text=TEAM',
    eloRating: 1200,
  },

  // Application Info
  app: {
    name: Constants.expoConfig?.name || 'MatchFinder',
    version: Constants.expoConfig?.version || '1.0.0',
    buildNumber: Constants.expoConfig?.extra?.buildNumber || '1',
  },
} as const
