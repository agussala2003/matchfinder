import { CheckinMatchView } from '@/components/match/CheckinMatchView'
import { MatchFlowModals } from '@/components/match/MatchFlowModals'
import { PostMatchView } from '@/components/match/PostMatchView'
import { PreMatchView } from '@/components/match/PreMatchView'
import { Button } from '@/components/ui/Button'
import { useMatchScreenWiring } from '@/hooks/useMatchScreenWiring'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { AlertTriangle } from 'lucide-react-native'
import React, { useRef } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const flatListRef = useRef<FlatList | null>(null)

  const wiring = useMatchScreenWiring({
    id: id as string,
    insets,
    flatListRef,
  })

  if (wiring.loading) {
    return (
      <View className='flex-1 items-center justify-center bg-background'>
        <ActivityIndicator size='large' color='#00D54B' />
      </View>
    )
  }

  if (!wiring.match || !wiring.myTeam || !wiring.rivalTeam) {
    return (
      <View className='flex-1 items-center justify-center bg-background px-6'>
        <View className='mb-4 h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card'>
          <AlertTriangle size={40} color='#D93036' strokeWidth={2} />
        </View>
        <Text className='mb-2 text-center font-title text-xl text-foreground'>Error al Cargar</Text>
        <Text className='mb-6 text-center leading-5 text-muted-foreground'>
          No se pudo cargar el partido o no tienes acceso a el
        </Text>
        <Button
          title='Volver a Partidos'
          variant='primary'
          onPress={() => router.replace('/(tabs)/match')}
        />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Partido',
          headerShown: true,
          headerStyle: { backgroundColor: '#121217' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#121217' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {wiring.matchState === 'previa' && wiring.preMatchProps && (
          <PreMatchView {...wiring.preMatchProps} />
        )}

        {wiring.matchState === 'checkin' && wiring.checkinProps && (
          <CheckinMatchView {...wiring.checkinProps} />
        )}

        {wiring.matchState === 'postmatch' && wiring.postMatchProps && (
          <PostMatchView {...wiring.postMatchProps} />
        )}
      </KeyboardAvoidingView>

      <MatchFlowModals {...wiring.modalProps} />
    </>
  )
}
