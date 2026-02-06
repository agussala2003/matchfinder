import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import { CONFIG } from './config'

const supabaseUrl = CONFIG.supabase.url
const supabaseAnonKey = CONFIG.supabase.anonKey

// Solo crear el cliente en plataformas nativas, no en web SSR
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // En Web usa localStorage por defecto, en Native usa AsyncStorage
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true, // SIEMPRE true
    detectSessionInUrl: Platform.OS === 'web', // Importante para el reset password en web
  },
})

// Listener para el estado de la app (Solo Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
