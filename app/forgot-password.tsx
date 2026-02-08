import { router } from 'expo-router'
import { Check } from 'lucide-react-native'
import React, { useState } from 'react'
import { Text, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'

// Componentes Modulares UI
import { AuthHeader } from '@/components/auth/AuthHeader'
import { AuthInput } from '@/components/ui/AuthInput'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const { showToast } = useToast()

  async function handleResetPassword() {
    if (loading) return

    if (!email) {
      showToast('Ingresa tu email para continuar', 'error')
      return
    }

    setLoading(true)

    const result = await authService.resetPassword(email)

    setLoading(false)

    if (!result.success) {
      showToast(result.error || 'Error al enviar el email', 'error')
      return
    }

    setEmailSent(true)
    showToast('Te enviamos un enlace mágico para acceder a tu cuenta', 'success')
  }

  // --- ESTADO: EMAIL ENVIADO ---
  if (emailSent) {
    return (
      <ScreenLayout withPadding className='justify-center'>
        <View className='items-center mb-8'>
          <View className='bg-primary/20 p-6 rounded-full mb-6'>
            <Check size={40} color='#39FF14' />
          </View>

          <AuthHeader
            title='¡EMAIL ENVIADO!'
            subtitle='Revisa tu bandeja de entrada. Te enviamos un link para restablecer tu contraseña.'
            showLogo={false}
          />
        </View>

        <View className='gap-3'>
          <Button
            title='Enviar Nuevamente'
            variant='secondary'
            onPress={() => setEmailSent(false)}
          />

          <Button title='Volver al Login' variant='ghost' onPress={() => router.back()} />
        </View>

        <Text className='text-text-muted text-center text-xs mt-8 px-4 font-body'>
          Si no recibes el email en unos minutos, revisa tu carpeta de spam.
        </Text>
      </ScreenLayout>
    )
  }

  // --- ESTADO: FORMULARIO ---
  return (
    <ScreenLayout scrollable withPadding>
      <View className='flex-1 justify-center py-8'>
        <AuthHeader
          title='¿OLVIDASTE TU CONTRASEÑA?'
          subtitle='No te preocupes. Ingresa tu email y te enviaremos un link para recuperarla.'
          showLogo={false}
        />

        <View className='mt-8 mb-8'>
          <AuthInput
            label='Email'
            placeholder='jugador@ejemplo.com'
            value={email}
            onChangeText={setEmail}
            keyboardType='email-address'
            autoCapitalize='none'
          />
        </View>

        <View className='gap-3'>
          <Button
            title='Enviar Link de Recuperación'
            onPress={handleResetPassword}
            loading={loading}
          />

          <Button
            title='Volver al login'
            variant='ghost'
            onPress={() => router.back()}
            disabled={loading}
          />
        </View>
      </View>
    </ScreenLayout>
  )
}
