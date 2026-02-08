import { router } from 'expo-router'
import React, { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { AuthType } from '@/types/auth'

// Componentes Modulares
import { AuthHeader } from '@/components/auth/AuthHeader'
import { AuthInput } from '@/components/ui/AuthInput'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const { showToast } = useToast()

  async function handleAuth(type: AuthType) {
    if (loading) return
    setErrors({})

    if (!email || !password) {
      showToast('Completa todos los campos', 'error')
      return
    }

    setLoading(true)

    try {
      const result =
        type === AuthType.LOGIN
          ? await authService.login({ email, password })
          : await authService.signup({ email, password })

      if (!result.success) {
        showToast(result.error || 'Error al autenticar', 'error')
        setLoading(false)
        return
      }

      showToast(type === AuthType.LOGIN ? '¡Bienvenido!' : '¡Cuenta creada!', 'success')

      if (result.data) {
        await checkProfileAndRedirect(result.data.user.id)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      showToast('Error inesperado', 'error')
      setLoading(false)
    }
  }

  async function checkProfileAndRedirect(userId: string) {
    try {
      const check = await authService.checkProfile(userId)
      router.replace(check.isComplete ? '/(tabs)' : '/onboarding')
    } catch {
      router.replace('/onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenLayout scrollable withPadding>
      <View className='flex-1 justify-center py-8'>
        <AuthHeader subtitle='Donde juegan los que saben' />

        <View className='space-y-5 mt-4'>
          <View className='gap-5'>
            <AuthInput
              label='Email'
              placeholder='jugador@ejemplo.com'
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              error={errors.email}
            />
            <AuthInput
              label='Contraseña'
              placeholder='••••••'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/forgot-password')}
            className='self-end py-2'
          >
            <Text className='text-text-muted font-body text-sm'>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View className='gap-3 mt-2'>
            <Button title='Ingresar' onPress={() => handleAuth(AuthType.LOGIN)} loading={loading} />

            <Button
              title='Crear Cuenta'
              variant='secondary'
              onPress={() => handleAuth(AuthType.SIGNUP)}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </ScreenLayout>
  )
}
