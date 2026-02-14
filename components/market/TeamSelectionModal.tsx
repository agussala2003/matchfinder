import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { teamsService } from '@/services/teams.service'
import { Team } from '@/types/teams'
import { ChevronRight, Shield, Users, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface TeamSelectionModalProps {
  visible: boolean
  onClose: () => void
  onSelectTeam: (team: Team) => void
  userId: string
}

export function TeamSelectionModal({
  visible,
  onClose,
  onSelectTeam,
  userId,
}: TeamSelectionModalProps) {
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(false)
  const [managedTeams, setManagedTeams] = useState<Team[]>([])

  useEffect(() => {
    if (visible && userId) {
      loadManagedTeams()
    }
  }, [visible, userId])

  async function loadManagedTeams() {
    setLoading(true)
    try {
      const res = await teamsService.getUserManagedTeams(userId)
      if (res.success && res.data) {
        setManagedTeams(res.data)
      } else {
        showToast('Error al cargar equipos', 'error')
      }
    } catch (error) {
      showToast('Error inesperado', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTeam = (team: Team) => {
    onSelectTeam(team)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View className='flex-1 bg-black/80 justify-end'>
        <View
          className='bg-modal rounded-t-3xl border-t-2 border-transparent overflow-hidden h-[60%]'
        >
          {/* Header */}
          <View className='flex-row items-center justify-between px-6 py-4 border-b border-border'>
            <View className='flex-row items-center gap-3'>
              <View className='bg-primary/20 p-2 rounded-lg'>
                <Users size={24} color='#00D54B' strokeWidth={2} />
              </View>
              <View>
                <Text className='text-foreground font-title text-xl'>Seleccionar Equipo</Text>
                <Text className='text-muted-foreground text-xs mt-0.5'>
                  ¿Desde qué equipo contactar?
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className='p-2 -mr-2'>
              <X size={24} color='#A1A1AA' strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className='flex-1 items-center justify-center py-20'>
              <ActivityIndicator size='large' color='#00D54B' />
              <Text className='text-muted-foreground mt-4 text-sm'>Cargando equipos...</Text>
            </View>
          ) : managedTeams.length === 0 ? (
            <View className='flex-1 items-center justify-center py-20 px-8'>
              <View className='w-20 h-20 bg-card rounded-2xl items-center justify-center mb-4 border border-border'>
                <Shield size={40} color='#6B7280' strokeWidth={2} />
              </View>
              <Text className='text-foreground font-title text-lg text-center mb-2'>
                Sin equipos disponibles
              </Text>
              <Text className='text-muted-foreground text-center text-sm leading-5'>
                No administras ningún equipo.{'\n'}Solo capitanes pueden contactar jugadores.
              </Text>
            </View>
          ) : (
            <ScrollView className='flex-1' contentContainerStyle={{ padding: 16 }}>
              <View className='gap-3'>
                {managedTeams.map((team, index) => (
                  <TouchableOpacity
                    key={team.id}
                    onPress={() => handleSelectTeam(team)}
                    className='bg-card border-2 border-border rounded-2xl p-4 flex-row items-center gap-4 active:border-primary'
                  >
                    {/* Team Logo */}
                    <View className='w-14 h-14 bg-secondary rounded-xl overflow-hidden border border-border items-center justify-center flex-shrink-0'>
                      {team.logo_url ? (
                        <Image
                          source={{ uri: team.logo_url }}
                          className='w-full h-full'
                          resizeMode='cover'
                        />
                      ) : (
                        <Shield size={28} color='#A1A1AA' strokeWidth={2} />
                      )}
                    </View>

                    {/* Team Info */}
                    <View className='flex-1 min-w-0'>
                      <Text className='text-foreground font-title text-base mb-1' numberOfLines={1}>
                        {team.name}
                      </Text>
                      <View className='flex-row items-center gap-2'>
                        <View className='bg-primary/10 px-2 py-0.5 rounded border border-primary/30'>
                          <Text className='text-primary text-[10px] font-bold uppercase'>
                            {team.category}
                          </Text>
                        </View>
                        <Text className='text-muted-foreground text-xs'>•</Text>
                        <Text className='text-muted-foreground text-xs' numberOfLines={1}>
                          {team.home_zone}
                        </Text>
                      </View>
                    </View>

                    {/* Arrow */}
                    <ChevronRight size={20} color='#6B7280' strokeWidth={2.5} />
                  </TouchableOpacity>
                ))}
              </View>

              <View className='mt-4 bg-accent/10 p-4 rounded-xl border border-accent/30'>
                <Text className='text-accent text-xs leading-5'>
                  💡 <Text className='font-bold'>Tip:</Text> Al seleccionar un equipo, el jugador
                  verá esta propuesta desde tu equipo.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Footer - Solo si hay equipos */}
          {!loading && managedTeams.length > 0 && (
            <View className='px-6 py-4 border-t border-border'>
              <Button title='Cancelar' variant='secondary' onPress={onClose} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}