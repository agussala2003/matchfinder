import { Stack, router } from 'expo-router'
import { Check, Shield } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

// Services & Constants
import { useToast } from '@/context/ToastContext'
import { CATEGORIAS_EQUIPO, CATEGORIAS_LISTA, ZONAS_AMBA } from '@/lib/constants'
import { authService } from '@/services/auth.service'
import { teamsService } from '@/services/teams.service'

// UI Components
import { AuthInput } from '@/components/ui/AuthInput'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Select } from '@/components/ui/Select'

export default function CreateTeamScreen() {
  const [name, setName] = useState('')
  const [zone, setZone] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  const { showToast } = useToast()

  // Opciones Zonas
  const zoneOptions = useMemo(() => {
    return ZONAS_AMBA.map((z) => ({ label: z, value: z }))
  }, [])

  // Opciones Categorías
  const categoryOptions = useMemo(() => {
    return CATEGORIAS_LISTA.map((c) => ({
      label: CATEGORIAS_EQUIPO[c],
      value: c,
    }))
  }, [])

  async function handleCreate() {
    if (!name || !zone || !category) {
      showToast('Completa todos los campos', 'error')
      return
    }

    setLoading(true)

    try {
      const session = await authService.getSession()
      const userId = session.data?.user.id

      if (!userId) {
        showToast('Error de sesión', 'error')
        return
      }

      // Enviamos la categoría también
      const result = await teamsService.createTeam(name, zone, category, userId)

      if (result.success) {
        showToast('¡Equipo fundado exitosamente!', 'success')
        if (router.canGoBack()) {
          router.back()
        } else {
          router.replace('/(tabs)/profile')
        }
      } else {
        console.error('CreateTeamScreen Error:', result.error)
        showToast('Error al crear equipo.', 'error')
      }
    } catch (error) {
      console.error('CreateTeamScreen Error:', error)
      showToast('Ocurrió un error inesperado', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenLayout scrollable withPadding>
      <Stack.Screen
        options={{
          title: 'Crear Club',
          headerShown: true,
          headerStyle: { backgroundColor: '#121217' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        }}
      />

      <View className='flex-1 py-4'>
        <View className='items-center mb-8'>
          <View className='w-24 h-24 bg-card rounded-full items-center justify-center border-2 border-dashed border-border mb-4'>
            <Shield size={40} color='#9CA3AF' />
          </View>
          <Text className='text-text-muted font-body text-xs text-center'>
            El escudo se podrá subir más adelante
          </Text>
        </View>

        <View className='gap-5'>
          <AuthInput
            label='Nombre del Equipo'
            placeholder='Ej: Los Galácticos FC'
            value={name}
            onChangeText={setName}
          />

          <Select
            label='Categoría'
            placeholder='Seleccionar Categoría...'
            options={categoryOptions}
            value={category}
            onChange={setCategory}
          />

          <Select
            label='Barrio / Zona Local'
            placeholder='Seleccionar Zona...'
            options={zoneOptions}
            value={zone}
            onChange={setZone}
          />

          <View className='bg-blue-900/20 p-4 rounded-xl border border-blue-900/50 flex-row gap-3 mt-2'>
            <View className='mt-1'>
              <Shield size={16} color='#60A5FA' />
            </View>
            <Text className='text-blue-200 font-body text-xs flex-1 leading-5'>
              Al crear el equipo, se generará un <Text className='font-bold'>CÓDIGO ÚNICO</Text>{' '}
              para que puedas invitar a tus compañeros fácilmente.
            </Text>
          </View>
        </View>

        <View className='mt-8'>
          <Button
            title='Confirmar Equipo'
            onPress={handleCreate}
            loading={loading}
            icon={<Check size={20} color='black' />}
          />
        </View>
      </View>
    </ScreenLayout>
  )
}
