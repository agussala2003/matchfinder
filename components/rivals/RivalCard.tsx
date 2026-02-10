import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Team } from '@/types/teams'
import { Check, Clock, MapPin, Plus } from 'lucide-react-native'
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

export function RivalCard({
  team,
  onPress,
  onChallenge,
  canChallenge,
  relationship,
}: RivalCardProps) {
  const renderAction = () => {
    if (!canChallenge) return null

    switch (relationship) {
      case 'SENT':
        return <Clock size={20} color='#9CA3AF' />
      case 'RECEIVED':
        return (
          // Signo de pregunta en vez de un check, para indicar que es una acción pendiente de aceptar/rechazar color amarillo
          <Plus size={20} color='#FBBF24' strokeWidth={2.5} />
        )
      case 'ACCEPTED':
        return <Check size={20} color='#39FF14' />
      case 'NONE':
      default:
        return <Plus size={20} color='#fff' strokeWidth={2.5} />
    }
  }

  return (
    <View className='mb-3'>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Card className='p-4'>
          <View className='flex-row items-center justify-between gap-3'>
            {/* SECCIÓN IZQUIERDA: Avatar + Info */}
            <View className='flex-row items-center gap-3 flex-1 min-w-0'>
              {/* Avatar */}
              <View className='relative flex-shrink-0'>
                <View className='w-14 h-14 bg-zinc-800 rounded-xl items-center justify-center'>
                  <Avatar uri={team.logo_url} fallback='shield' size={56} shape='square' />
                </View>
              </View>

              {/* Info Textual Alineada */}
              <View className='flex-1 gap-1'>
                <Text className='font-title text-base text-white capitalize' numberOfLines={1}>
                  {team.name}
                </Text>

                <View className='flex-row items-center gap-1 min-w-0'>
                  <MapPin size={12} color='#9CA3AF' strokeWidth={2} className='flex-shrink-0' />
                  <Text className='text-gray-400 text-xs capitalize flex-shrink' numberOfLines={1}>
                    {team.home_zone} ·{' '}
                    {team.category === 'MALE'
                      ? 'Masc'
                      : team.category === 'FEMALE'
                        ? 'Fem'
                        : 'Mixto'}
                  </Text>
                </View>
              </View>
            </View>

            {/* SECCIÓN DERECHA: ELO + Acción */}
            <View className='flex-row items-center gap-3 flex-shrink-0'>
              {/* ELO */}
              <View className='items-center min-w-[50px]'>
                <Text className='text-gray-500 text-[10px] uppercase font-semibold tracking-wide mb-0.5'>
                  ELO
                </Text>
                <Text className='font-title text-xl font-bold leading-tight text-primary'>
                  {team.elo_rating}
                </Text>
              </View>

              {/* Botón de Acción */}
              <View className='w-10 items-center justify-center'>{renderAction()}</View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  )
}
