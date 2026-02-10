import { Stack, router } from 'expo-router'
import { Search, Users } from 'lucide-react-native'
import React, { useState } from 'react'
import { Text, TextInput, View } from 'react-native'

// Services & UI
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { teamsService } from '@/services/teams.service'

export default function JoinTeamScreen() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleJoin() {
    if (code.length < 6) {
      showToast('El código debe tener 6 caracteres', 'error')
      return
    }
    setLoading(true)

    try {
      const session = await authService.getSession()
      const userId = session.data?.user.id
      if (!userId) return

      const result = await teamsService.joinTeamByCode(code, userId)

      if (result.success) {
        showToast('¡Solicitud enviada! Espera a que el capitán te acepte.', 'success')
        router.replace('/(tabs)/profile')
      } else {
        showToast(result.error || 'Error al unirse', 'error')
      }
    } catch (error) {
      console.error('Error uniendo al equipo:', error)
      showToast('Error de conexión', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenLayout withPadding>
      <Stack.Screen
        options={{
          title: 'Unirse a Equipo',
          headerShown: true,
          headerStyle: { backgroundColor: '#121217' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
          presentation: 'modal',
        }}
      />

      <View className='flex-1 justify-start items-center pt-20'>
        <View className='bg-card p-6 rounded-full mb-6 border border-border shadow-lg shadow-black'>
          <Users size={40} color='#39FF14' />
        </View>

        <Text className='text-text-main font-title text-2xl mb-2 text-center'>
          INGRESA EL CÓDIGO
        </Text>
        <Text className='text-text-muted font-body text-center mb-6 px-4'>
          Pídele el código al capitán de tu equipo para enviar tu solicitud de ingreso.
        </Text>

        <View className='w-full gap-6'>
          <TextInput
            className='bg-card text-text-main p-4 rounded-xl border border-border font-mono text-center text-3xl tracking-[10px] uppercase h-[80px] focus:border-primary'
            placeholder='A1B2C3'
            placeholderTextColor='#9CA3AF'
            value={code}
            onChangeText={setCode}
            maxLength={6}
            autoCapitalize='characters'
            autoCorrect={false}
          />

          <Button
            title='Enviar Solicitud'
            onPress={handleJoin}
            loading={loading}
            icon={<Search size={20} color='black' />}
          />
        </View>
      </View>
    </ScreenLayout>
  )
}
