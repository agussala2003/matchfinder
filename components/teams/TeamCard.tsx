import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { Copy, MapPin, Shield } from 'lucide-react-native'
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
  onViewStats?: (team: Team) => void
}

export function TeamCard({ team, onCreatePress, pendingRequestsCount = 0, onViewStats }: TeamCardProps) {
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
      <Card className='border-dashed border-gray-700 bg-transparent p-6'>
        <View className='flex-row items-center gap-4 mb-6'>
          <View className='w-16 h-16 bg-gray-800 rounded-full items-center justify-center border border-gray-700'>
            <Shield size={26} color='#9CA3AF' strokeWidth={2} />
          </View>
          <View className='flex-1'>
            <Text className='text-white font-title text-lg mb-1'>Crea tu Equipo</Text>
            <Text className='text-gray-400 text-sm'>Funda un club o únete a tus amigos</Text>
          </View>
        </View>

        <View className='flex-row gap-4'>
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
    <Card className='p-4'>
      <View className='flex-row items-center justify-between gap-3 mb-4'>
        {/* Sección Izquierda: Escudo + Info */}
        <View className='flex-row items-center gap-3 flex-1 min-w-0'>
          {/* Escudo */}
          <View className='relative flex-shrink-0'>
            <View className='w-16 h-16 bg-zinc-800 rounded-xl items-center justify-center overflow-hidden'>
              {team.logo_url ? (
                <Image
                  source={{ uri: team.logo_url }}
                  className='w-full h-full'
                  resizeMode='cover'
                />
              ) : (
                // Iniciales del equipo
                <Text className='text-white text-xl font-bold'>
                  {team.name
                    .split(' ')
                    .map((word) => word[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              )}
            </View>

            {/* Badge de notificaciones */}
            {pendingRequestsCount > 0 && (
              <View className='absolute -top-1.5 -right-1.5 bg-red-500 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center border-2 border-gray-950'>
                <Text className='text-white font-bold text-[9px]'>{pendingRequestsCount}</Text>
              </View>
            )}
          </View>

          {/* Info del equipo */}
          <View className='flex-1 gap-1 '>
            {/* Nombre */}
            <Text
              className='text-white font-title text-base capitalize'
              numberOfLines={1}
              ellipsizeMode='tail'
            >
              {team.name}
            </Text>

            {/* Ubicación y categoría */}
            <View className='flex-row items-center gap-1 min-w-0'>
              <MapPin size={11} color='#9CA3AF' strokeWidth={2} className='flex-shrink-0' />
              <Text
                className='text-gray-400 text-xs capitalize flex-shrink'
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {team.home_zone} ·{' '}
                {team.category === 'MALE' ? 'Masc' : team.category === 'FEMALE' ? 'Fem' : 'Mixto'}
              </Text>
            </View>

            {/* Código de invitación */}
            {team.share_code && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCopyCode}
                className='flex-row items-center gap-1'
              >
                <Text className='text-gray-500 text-xs uppercase tracking-wide'>
                  Código: <Text className='text-primary font-mono'>{team.share_code}</Text>
                </Text>
                <Copy size={12} color='#39FF14' strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sección Derecha: ELO */}
          <View className='items-center min-w-[60px]'>
            <Text className='text-gray-500 text-xs uppercase font-semibold tracking-wide mb-0.5'>
              ELO
            </Text>
            <Text className='text-primary font-title text-2xl font-bold leading-tight'>
              {team.elo_rating}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className='flex-row gap-2'>
        <TouchableOpacity
          onPress={handleNavigate}
          className='flex-1 bg-primary h-11 rounded-xl flex-row items-center justify-center gap-2 active:bg-primary/80'
        >
          <Shield size={18} color='#121217' strokeWidth={2} />
          <Text className='text-primary-foreground font-bold text-sm'>Gestionar</Text>
        </TouchableOpacity>

        {onViewStats && (
          <TouchableOpacity
            onPress={() => onViewStats(team)}
            className='w-11 h-11 bg-secondary border border-border rounded-xl items-center justify-center active:bg-muted'
          >
            <Text className='text-foreground font-bold text-xs'>📊</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  )
}
