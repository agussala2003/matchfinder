import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StatusBar, View } from 'react-native'
import '../global.css'

// Fuentes
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'

// Supabase
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

// Contexto de Toasts
import { ToastProvider } from '@/context/ToastContext'

// Navigation Theme
import { DarkTheme, ThemeProvider } from '@react-navigation/native'

// Tu color de fondo exacto (de tailwind.config.js)
const APP_BACKGROUND = '#121217'

// Personalizamos el tema de navegación para que coincida con tu Tailwind
const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: APP_BACKGROUND, // Esto quita el fondo blanco en transiciones
    card: '#1A1A21', // Tu color 'card'
    text: '#FBFBFB', // Tu color 'foreground'
    border: '#32323A', // Tu color 'border'
  },
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)

  const segments = useSegments()
  const router = useRouter()

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitialized(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!initialized || !fontsLoaded) return

    const inAuthGroup =
      segments[0] === 'login' || segments[0] === 'onboarding' || segments[0] === 'forgot-password'

    if (!session && !inAuthGroup) {
      router.replace('/login')
    }
  }, [session, segments, initialized, fontsLoaded, router])

  if (!initialized || !fontsLoaded) {
    return (
      <View className='flex-1 bg-background items-center justify-center'>
        <ActivityIndicator size='large' color='#00D54B' />
      </View>
    )
  }

  return (
    <ThemeProvider value={MyDarkTheme}>
      <ToastProvider>
        {/* StatusBar 'light' hace que los iconos (hora, batería) sean blancos */}
        <StatusBar barStyle='light-content' backgroundColor={APP_BACKGROUND} />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: APP_BACKGROUND },
          }}
        >
          <Stack.Screen name='(tabs)' />
          <Stack.Screen name='login' />
          <Stack.Screen name='onboarding' />
          <Stack.Screen name='forgot-password' />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  )
}
