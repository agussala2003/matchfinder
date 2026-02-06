import { POSICIONES_ARGENTINAS, Posicion } from '@/lib/constants'
import { UserProfile } from '@/types/auth'
import { Camera } from 'lucide-react-native'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

interface ProfileHeaderProps {
  profile: UserProfile | null
  onEditAvatar?: () => void
}

export function ProfileHeader({ profile, onEditAvatar }: ProfileHeaderProps) {
  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'JU'

  return (
    <View className='items-center pt-10 pb-6'>
      {/* Avatar Container */}
      <TouchableOpacity onPress={onEditAvatar} activeOpacity={0.8} className='relative mb-5'>
        <View className='w-32 h-32 bg-gray-900 rounded-full items-center justify-center border-4 border-primary shadow-2xl shadow-primary/20 overflow-hidden'>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className='w-full h-full'
              resizeMode='cover'
            />
          ) : (
            <Text className='text-white font-title text-4xl'>
              {getInitials(profile?.full_name || '')}
            </Text>
          )}
        </View>

        {/* Botón de Cámara */}
        <View className='absolute bottom-0 right-0 bg-dark rounded-full p-2.5 border border-gray-700 shadow-sm'>
          <Camera size={18} color='#39FF14' />
        </View>
      </TouchableOpacity>

      {/* Info Principal */}
      <View className='flex items-center gap-3'>
        <Text className='text-white font-title text-3xl uppercase tracking-wide text-center'>
          {profile?.full_name || 'Cargando...'}
        </Text>

        <Text className='text-gray-400 font-body text-sm'>@{profile?.username || 'usuario'}</Text>

        {/* Badge Posición */}
        <View className='bg-primary/10 px-5 py-1.5 rounded-full border border-primary/30'>
          <Text className='text-primary font-title text-xs tracking-widest uppercase'>
            {POSICIONES_ARGENTINAS[profile?.position as Posicion] || 'JUGADOR LIBRE'}
          </Text>
        </View>
      </View>
    </View>
  )
}
