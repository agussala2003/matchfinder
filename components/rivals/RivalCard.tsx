import { Avatar } from '@/components/ui/Avatar'
import { Team } from '@/types/teams'
import { MapPin, Plus } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

export type ChallengeRelationship = 'NONE' | 'SENT' | 'RECEIVED' | 'ACCEPTED'

interface RivalCardProps {
  team: Team
  onPress: () => void
  onChallenge: () => void
  canChallenge: boolean
  relationship: ChallengeRelationship
}
export function RivalCard({ team, onPress, relationship }: RivalCardProps) {
  const handleCardPress = () => {
    onPress()
  }

  return (
    <View className='mb-3'>
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.8}>
        <View className='bg-card p-5 rounded-2xl'>
          <View className='flex-row items-center gap-4'>
            {/* IZQUIERDA: Escudo + Info */}
            <View className='flex-row items-center gap-4 flex-1 min-w-0'>
              {/* Escudo Mejorado */}
              <View className='relative'>
                <View className='w-16 h-16 items-center justify-center'>
                  <Avatar uri={team.logo_url} fallback='shield' size={44} />
                </View>
                {relationship === 'ACCEPTED' && (
                  <View className='absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full items-center justify-center border-2 border-gray-900'>
                    <Text className='text-black text-xs font-black'>⚡</Text>
                  </View>
                )}
              </View>

              {/* Info Mejorada */}
              <View className='flex-1 min-w-0 gap-2'>
                <Text className='text-white font-title text-xl font-bold' numberOfLines={1}>
                  {team.name}
                </Text>

                <View className='flex-row items-center gap-2'>
                  <View className='flex-row items-center gap-1.5 bg-gray-700/50 px-2.5 py-1 rounded-lg'>
                    <MapPin size={12} color='#9CA3AF' strokeWidth={2} />
                    <Text className='text-gray-300 text-xs font-medium' numberOfLines={1}>
                      {team.home_zone}
                    </Text>
                  </View>

                  {relationship !== 'ACCEPTED' && (
                    <View className='bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/30'>
                      <Text className='text-primary text-xs font-bold'>{team.elo_rating} ELO</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* DERECHA: Icono de + para abrir el modal */}
            <View className='items-end justify-end min-w-[85px]'>
              <Plus
                size={20}
                color={relationship === 'ACCEPTED' ? '#FBBF24' : '#9CA3AF'}
                strokeWidth={2}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  )
}
