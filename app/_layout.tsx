import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import "../global.css";

// Fuentes
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Oswald_500Medium, Oswald_700Bold, useFonts } from '@expo-google-fonts/oswald';

// Supabase
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// Contexto de Toasts
import { ToastProvider } from '@/context/ToastContext';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Oswald_700Bold, Oswald_500Medium,
    Inter_400Regular, Inter_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'onboarding' || segments[0] === 'forgot-password';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    }
  }, [session, segments, initialized, fontsLoaded, router]);

  if (!initialized || !fontsLoaded) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </ToastProvider>
  );
}