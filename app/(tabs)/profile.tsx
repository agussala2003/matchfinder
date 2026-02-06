import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, LogOut, Settings, Shield, UserCog } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { storageService } from '@/services/storage.service'
import { teamsService } from '@/services/teams.service'
import { UserProfile } from '@/types/auth'
import { Team } from '@/types/teams'

// Componentes
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { StatsGrid } from '@/components/profile/StatsGrid'
import { TeamCard } from '@/components/teams/TeamCard'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'

export default function ProfileScreen() {
  const { showToast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, []),
  )

  async function loadData() {
    try {
      const session = await authService.getSession()
      if (session.data?.user) {
        const userId = session.data.user.id
        const [resProfile, resTeam] = await Promise.all([
          authService.checkProfile(userId),
          teamsService.getUserTeam(userId),
        ])
        if (resProfile.profile) setProfile(resProfile.profile)
        if (resTeam.success && resTeam.data) setTeam(resTeam.data)
      }
    } catch (e) {
      console.log('Error cargando perfil', e)
    } finally {
      setLoading(false)
    }
  }

  // --- SUBIDA DE IMAGEN ---
  async function handleEditAvatar() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (permissionResult.granted === false) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0].uri && profile) {
      uploadAvatar(result.assets[0].uri)
    }
  }

  async function uploadAvatar(uri: string) {
    if (!profile) return
    setUploading(true)
    showToast('Subiendo imagen...', 'info')

    const publicUrl = await storageService.uploadAvatar(uri, profile.id)

    if (publicUrl) {
      const updateResult = await authService.upsertProfile({
        ...profile,
        avatar_url: publicUrl,
      } as any)

      if (updateResult.success) {
        setProfile({ ...profile, avatar_url: publicUrl })
        showToast('¡Foto actualizada!', 'success')
      } else {
        showToast('Error guardando cambios', 'error')
      }
    } else {
      showToast('Error al subir imagen', 'error')
    }
    setUploading(false)
  }

  async function handleLogout() {
    const result = await authService.logout()
    if (result.success) showToast('Nos vemos pronto 👋', 'success')
  }

  return (
    <ScreenLayout scrollable loading={loading} withPadding={false} className='bg-dark'>
      {/* HEADER + CURVA */}
      <View className='bg-card rounded-b-[40px] border-b border-gray-800 mb-2'>
        <ProfileHeader profile={profile} onEditAvatar={handleEditAvatar} />
        {uploading && (
          <Text className='text-primary text-center text-xs pb-4'>Actualizando foto...</Text>
        )}
      </View>

      <View className='px-6 py-4'>
        {/* SECCIÓN 1: ESTADÍSTICAS */}
        <View className='mb-8'>
          <Text className='text-white font-title text-lg mb-4 pl-1'>Estadísticas</Text>
          <StatsGrid />
        </View>

        {/* SECCIÓN 2: MI EQUIPO */}
        <View className='mb-8'>
          <View className='flex-row justify-between items-end mb-4 pl-1 pr-1'>
            <Text className='text-white font-title text-lg'>Mi Equipo</Text>
          </View>
          <TeamCard team={team} onCreatePress={() => router.push('/create-team')} />
        </View>

        {/* SECCIÓN 3: CONFIGURACIÓN */}
        <View>
          <Text className='text-white font-title text-lg mb-4 pl-1'>Configuración</Text>

          <View className='bg-card rounded-2xl border border-gray-800 overflow-hidden'>
            <MenuOption
              icon={<UserCog size={22} color='#39FF14' />}
              label='Editar Datos Personales'
              onPress={() => router.push('/edit-profile')}
              isLast={false}
            />

            <MenuOption
              icon={<Shield size={22} color='white' />}
              label='Seguridad y Privacidad'
              isLast={false}
            />

            <MenuOption
              icon={<Settings size={22} color='white' />}
              label='Preferencias de la App'
              isLast={true}
            />
          </View>

          {/* BOTÓN ESTÁNDAR DE PELIGRO */}
          <Button
            title='Cerrar Sesión'
            variant='danger'
            onPress={handleLogout}
            icon={<LogOut size={20} color='#EF4444' />}
            className='mt-8'
          />
        </View>

        <Text className='text-center text-gray-700 text-xs mt-4'>MatchFinder v1.0.2</Text>
      </View>
    </ScreenLayout>
  )
}

// Componente local auxiliar para la lista de menú
const MenuOption = ({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: any
  label: string
  onPress?: () => void
  isLast: boolean
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center p-5 active:bg-gray-800 ${!isLast ? 'border-b border-gray-800' : ''}`}
  >
    <View className='mr-4 opacity-90'>{icon}</View>
    <Text className='text-gray-200 font-body text-base flex-1'>{label}</Text>
    <ChevronRight size={18} color='#4b5563' />
  </TouchableOpacity>
)
