import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, Clock, LogOut, Plus, Settings, Shield, UserCog } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { statsService } from '@/services/stats.service'
import { storageService } from '@/services/storage.service'
import { OutgoingRequest, teamsService } from '@/services/teams.service'
import { UserProfile } from '@/types/auth'
import { Team } from '@/types/teams'

// Componentes
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { StatsGrid } from '@/components/profile/StatsGrid'
import { TeamCard } from '@/components/teams/TeamCard'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { CONFIG } from '@/lib/config'

export default function ProfileScreen() {
  const { showToast } = useToast()

  // States
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [myRequests, setMyRequests] = useState<OutgoingRequest[]>([])

  // UI States
  // UI States
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [userStats, setUserStats] = useState({ matches: 0, goals: 0, wins: 0, mvps: 0 })

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

        const [resProfile, resTeams, resRequests] = await Promise.all([
          authService.checkProfile(userId),
          teamsService.getUserTeams(userId),
          teamsService.getUserPendingRequests(userId),
        ])

        if (resProfile.profile) setProfile(resProfile.profile)
        setTeams(resTeams.success && resTeams.data ? resTeams.data : [])
        setMyRequests(resRequests.success && resRequests.data ? resRequests.data : [])

        const resStats = await statsService.getUserStats(userId)
        if (resStats.success && resStats.data) {
          setUserStats(resStats.data)
        }
      }
    } catch (e) {
      console.error('Error cargando perfil', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleEditAvatar() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissionResult.granted) return Alert.alert('Permiso', 'Requerido para la galería.')

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
    showToast('Subiendo...', 'info')

    const publicUrl = await storageService.uploadImage(
      uri,
      CONFIG.supabase.storageBucket.avatars,
      profile.id,
    )

    if (publicUrl) {
      const updateResult = await authService.upsertProfile({
        ...profile,
        avatar_url: publicUrl,
      } as any)

      if (updateResult.success) {
        setProfile({ ...profile, avatar_url: publicUrl })
        showToast('¡Foto actualizada!', 'success')
      }
    }
    setUploading(false)
  }

  async function handleLogout() {
    await authService.logout()
    router.replace('/login')
  }

  return (
    <ScreenLayout scrollable loading={loading} withPadding={false} className='bg-dark'>
      {/* HEADER */}
      <View className='gap-2'>
        <ProfileHeader profile={profile} onEditAvatar={handleEditAvatar} />
        {uploading && (
          <Text className='text-primary text-center text-xs'>Actualizando foto...</Text>
        )}
      </View>

      {/* CONTENIDO */}
      <View className='w-11/12 mx-auto gap-5'>
        {/* ESTADÍSTICAS */}
        <View className='gap-2'>
          <Text className='text-text-main font-title text-lg'>Estadísticas Totales</Text>
          <StatsGrid
            matches={userStats.matches}
            goals={userStats.goals}
            wins={userStats.wins}
            mvps={userStats.mvps}
          />
        </View>

        {/* MIS EQUIPOS */}
        <View className='gap-2'>
          <View className='flex-row items-center justify-between'>
            <Text className='text-text-main font-title text-lg'>Mis Equipos</Text>

            {teams.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/create-team')}>
                <Text className='text-primary font-bold'>+ Crear Otro</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className='gap-2'>
            {teams.length > 0 ? (
              teams.map((item) => <TeamCard key={item.id} team={item} onCreatePress={() => { }} />)
            ) : (
              <TeamCard team={null} onCreatePress={() => router.push('/create-team')} />
            )}
          </View>

          {teams.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/join-team')}
              className='flex-row items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border active:bg-card'
            >
              <Plus size={16} color='#9CA3AF' />
              <Text className='text-text-muted font-body'>Unirse a otro equipo con código</Text>
            </TouchableOpacity>
          )}
        </View>
        {myRequests.length > 0 && (
          <View className='gap-2'>
            <Text className='text-text-main font-title text-lg'>Solicitudes Enviadas</Text>

            <View className='gap-2'>
              {myRequests.map((req) => (
                <View
                  key={req.team_id}
                  className='bg-card border border-border p-3 rounded-xl flex-row items-center justify-between'
                >
                  <View className='flex-row items-center gap-3'>
                    <View className='w-8 h-8 bg-modal rounded-full items-center justify-center border border-border overflow-hidden'>
                      {req.team.logo_url ? (
                        <Image source={{ uri: req.team.logo_url }} className='w-full h-full' />
                      ) : (
                        <Shield size={14} color='#9CA3AF' />
                      )}
                    </View>

                    <Text className='text-text-main font-body text-sm'>{req.team.name}</Text>
                  </View>

                  <View className='bg-warning/20 px-2 py-1 rounded border border-warning/50 flex-row items-center gap-1'>
                    <Clock size={10} color='#EAB308' />
                    <Text className='text-warning text-[10px] uppercase font-bold'>Pendiente</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CONFIGURACIÓN */}
        <View className='gap-2'>
          <Text className='text-text-main font-title text-lg'>Ajustes</Text>

          <View className='bg-card rounded-2xl border border-border overflow-hidden'>
            <MenuOption
              icon={<UserCog size={22} color='#F9FAFB' />}
              label='Editar Datos Personales'
              onPress={() => router.push('/edit-profile')}
              isLast={false}
            />
            <MenuOption
              icon={<Shield size={22} color='#F9FAFB' />}
              label='Seguridad y Privacidad'
              isLast={false}
            />
            <MenuOption
              icon={<Settings size={22} color='#F9FAFB' />}
              label='Preferencias de la App'
              isLast={true}
            />
          </View>
        </View>
        <Button
          title='Cerrar Sesión'
          variant='danger'
          onPress={handleLogout}
          icon={<LogOut size={20} color='#EF4444' />}
        />

        <Text className='text-center text-text-muted text-xs'>MatchFinder v1.0.4</Text>
      </View>
    </ScreenLayout>
  )
}

const MenuOption = ({ icon, label, onPress, isLast }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center p-5 active:bg-modal ${!isLast ? 'border-b border-border' : ''}`}
  >
    <View className='mr-4 opacity-90'>{icon}</View>
    <Text className='text-text-main font-body text-base flex-1'>{label}</Text>
    <ChevronRight size={18} color='#9CA3AF' />
  </TouchableOpacity>
)
