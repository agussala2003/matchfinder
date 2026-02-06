import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, Clock, LogOut, Plus, Settings, Shield, UserCog } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
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

        const [resProfile, resTeams, resRequests] = await Promise.all([
          authService.checkProfile(userId),
          teamsService.getUserTeams(userId),
          teamsService.getUserPendingRequests(userId),
        ])

        if (resProfile.profile) setProfile(resProfile.profile)
        setTeams(resTeams.success && resTeams.data ? resTeams.data : [])
        setMyRequests(resRequests.success && resRequests.data ? resRequests.data : [])
      }
    } catch (e) {
      console.log('Error cargando perfil', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleEditAvatar() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissionResult.granted)
      return Alert.alert('Permiso', 'Requerido para la galería.')

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
    <ScreenLayout scrollable loading={loading} withPadding={false} className="bg-dark">

      {/* HEADER */}
      <View className="gap-2">
        <ProfileHeader profile={profile} onEditAvatar={handleEditAvatar} />
        {uploading && (
          <Text className="text-primary text-center text-xs">
            Actualizando foto...
          </Text>
        )}
      </View>

      {/* CONTENIDO */}
      <View className="w-11/12 mx-auto gap-10">

        {/* ESTADÍSTICAS */}
        <View className="gap-4">
          <Text className="text-white font-title text-lg">
            Estadísticas
          </Text>
          <StatsGrid />
        </View>

        {/* MIS EQUIPOS */}
        <View className="gap-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-title text-lg">
              Mis Equipos
            </Text>

            {teams.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/create-team')}>
                <Text className="text-primary font-bold">
                  + Crear Otro
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="gap-3">
            {teams.length > 0 ? (
              teams.map((item) => (
                <TeamCard
                  key={item.id}
                  team={item}
                  onCreatePress={() => {}}
                />
              ))
            ) : (
              <TeamCard
                team={null}
                onCreatePress={() => router.push('/create-team')}
              />
            )}
          </View>

          {teams.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/join-team')}
              className="flex-row items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-700 active:bg-gray-800"
            >
              <Plus size={16} color="#666" />
              <Text className="text-gray-400 font-body">
                Unirse a otro equipo con código
              </Text>
            </TouchableOpacity>
          )}

          {myRequests.length > 0 && (
            <View className="gap-3">
              <Text className="text-white font-title text-lg">
                Solicitudes Enviadas
              </Text>

              <View className="gap-2">
                {myRequests.map((req) => (
                  <View
                    key={req.team_id}
                    className="bg-card border border-gray-800 p-3 rounded-xl flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center border border-gray-600 overflow-hidden">
                        {req.team.logo_url ? (
                          <Image
                            source={{ uri: req.team.logo_url }}
                            className="w-full h-full"
                          />
                        ) : (
                          <Shield size={14} color="#666" />
                        )}
                      </View>

                      <Text className="text-white font-body text-sm">
                        {req.team.name}
                      </Text>
                    </View>

                    <View className="bg-yellow-500/20 px-2 py-1 rounded border border-yellow-500/50 flex-row items-center gap-1">
                      <Clock size={10} color="#EAB308" />
                      <Text className="text-yellow-500 text-[10px] uppercase font-bold">
                        Pendiente
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* CONFIGURACIÓN */}
        <View className="gap-6">
          <Text className="text-white font-title text-lg">
            Configuración
          </Text>

          <View className="bg-card rounded-2xl border border-gray-800 overflow-hidden">
            <MenuOption
              icon={<UserCog size={22} color="#39FF14" />}
              label="Editar Datos Personales"
              onPress={() => router.push('/edit-profile')}
              isLast={false}
            />
            <MenuOption
              icon={<Shield size={22} color="white" />}
              label="Seguridad y Privacidad"
              isLast={false}
            />
            <MenuOption
              icon={<Settings size={22} color="white" />}
              label="Preferencias de la App"
              isLast={true}
            />
          </View>

          <Button
            title="Cerrar Sesión"
            variant="danger"
            onPress={handleLogout}
            icon={<LogOut size={20} color="#EF4444" />}
          />
        </View>

        <Text className="text-center text-gray-700 text-xs">
          MatchFinder v1.0.4
        </Text>
      </View>
    </ScreenLayout>
  )
}


const MenuOption = ({ icon, label, onPress, isLast }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-row items-center p-5 active:bg-gray-800 ${!isLast ? 'border-b border-gray-800' : ''}`}
  >
    <View className='mr-4 opacity-90'>{icon}</View>
    <Text className='text-gray-200 font-body text-base flex-1'>{label}</Text>
    <ChevronRight size={18} color='#4b5563' />
  </TouchableOpacity>
)
