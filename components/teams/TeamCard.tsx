import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { ChevronRight, Copy, MapPin, Shield } from 'lucide-react-native'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/context/ToastContext'
import { Team } from '@/types/teams'

interface TeamCardProps {
  team: Team | null
  onCreatePress: () => void
  pendingRequestsCount?: number
}

export function TeamCard({ team, onCreatePress, pendingRequestsCount = 0 }: TeamCardProps) {
  const { showToast } = useToast()

  const handleCopyCode = async () => {
    if (team?.share_code) {
      await Clipboard.setStringAsync(team.share_code)
      showToast('¡Código copiado al portapapeles!', 'success')
    }
  }

  const handleNavigate = () => {
    if (team) {
      router.push({ pathname: '/manage-team', params: { id: team.id } })
    }
  }

  // --- ESTADO: SIN EQUIPO ---
  if (!team) {
    return (
      <Card className='border-dashed border-gray-600 bg-transparent p-6'>
        <View className='flex-row items-center gap-4 mb-6'>
          <View className='w-14 h-14 bg-gray-800 rounded-full items-center justify-center border border-gray-700'>
            <Shield size={26} color='#666' />
          </View>
          <View className='flex-1'>
            <Text className='text-gray-300 font-title text-lg mb-1'>Crea tu Equipo</Text>
            <Text className='text-gray-500 text-sm'>Funda un club o únete a tus amigos</Text>
          </View>
        </View>

        <View className='flex-row gap-3'>
          <Button title='Crear' variant='primary' onPress={onCreatePress} className='flex-1' />
          <Button
            title='Unirse'
            variant='secondary'
            onPress={() => router.push('/join-team')}
            className='flex-1'
          />
        </View>
      </Card>
    )
  }

  // --- ESTADO: CON EQUIPO ---
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleNavigate}>
      <Card className='p-4'>
        <View className='flex-row items-center justify-between gap-3'>
          {/* Sección Izquierda: Escudo + Info */}
          <View className='flex-row items-center gap-3 flex-1 min-w-0'>
            {/* Escudo */}
            <View className='relative flex-shrink-0'>
              <View className='w-14 h-14 bg-gray-800 rounded-xl items-center justify-center border border-gray-700 overflow-hidden'>
                {team.logo_url ? (
                  <Image
                    source={{ uri: team.logo_url }}
                    className='w-full h-full'
                    resizeMode='cover'
                  />
                ) : (
                  <Shield size={28} color='#9CA3AF' strokeWidth={2} />
                )}
              </View>

              {/* Badge de notificaciones */}
              {pendingRequestsCount > 0 && (
                <View className='absolute -top-1.5 -right-1.5 bg-red-500 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center border-2 border-gray-950'>
                  <Text className='text-white font-bold text-[9px]'>{pendingRequestsCount}</Text>
                </View>
              )}
            </View>

            {/* Info del equipo - Con min-w-0 para que respete el truncate */}
            <View className='flex-1 gap-1 min-w-0'>
              {/* Nombre - Truncado con ellipsis */}
              <Text
                className='text-white font-title text-lg'
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {team.name}
              </Text>

              {/* Ubicación y categoría - También truncado si es muy largo */}
              <View className='flex-row items-center gap-1 min-w-0'>
                <MapPin size={11} color='#6B7280' strokeWidth={2} className='flex-shrink-0' />
                <Text
                  className='text-gray-400 text-xs flex-shrink'
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {team.home_zone} •{' '}
                  {team.category === 'MALE'
                    ? 'Masculino'
                    : team.category === 'FEMALE'
                      ? 'Femenino'
                      : 'Mixto'}
                </Text>
              </View>

              {/* Código de invitación */}
              {team.share_code && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation()
                    handleCopyCode()
                  }}
                  activeOpacity={0.7}
                  className='flex-row items-center gap-1.5 self-start flex-shrink-0'
                >
                  <Text className='text-gray-500 text-[10px] uppercase font-semibold'>Código:</Text>
                  <Text className='text-primary font-mono text-xs font-semibold tracking-wider'>
                    {team.share_code}
                  </Text>
                  <Copy size={11} color='#39FF14' strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sección Derecha: ELO + Flecha */}
          <View className='flex-row items-center gap-2 flex-shrink-0'>
            {/* ELO */}
            <View className='items-center min-w-[60px]'>
              <Text className='text-gray-500 text-[9px] uppercase font-semibold tracking-wide mb-0.5'>
                ELO
              </Text>
              <Text className='text-primary font-title text-2xl font-bold leading-tight'>
                {team.elo_rating}
              </Text>
            </View>

            {/* Flecha */}
            <ChevronRight size={20} color='#6B7280' strokeWidth={2.5} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}
