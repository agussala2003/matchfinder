import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Challenge } from '@/types/challenges'
import { Team } from '@/types/teams'
import { ChevronRight, MessageSquare } from 'lucide-react-native'
import React from 'react'
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

interface ChallengesListProps {
  challenges: Challenge[]
  currentTeam: Team
  refreshing: boolean
  canManage: boolean
  onRefresh: () => void
  onChallengePress: (team: Team) => void
  onAcceptChallenge: (challengeId: string) => void
  onRejectChallenge: (challengeId: string) => void
}

export const ChallengesList = ({
  challenges,
  currentTeam,
  refreshing,
  canManage,
  onRefresh,
  onChallengePress,
  onAcceptChallenge,
  onRejectChallenge,
}: ChallengesListProps) => {
  return (
    <FlatList
      data={challenges}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor='#39FF14'
        />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
      renderItem={({ item }) => {
        const isOutgoing = item.challenger_team_id === currentTeam.id
        const otherTeam = isOutgoing ? item.target : item.challenger
        if (!otherTeam) return null

        return (
          <TouchableOpacity
            onPress={() => onChallengePress(otherTeam)}
            className='bg-card p-4 rounded-xl border border-border mb-3 flex-row justify-between items-center'
          >
            <View className='flex-row items-center gap-3 flex-1'>
              <Avatar uri={otherTeam.logo_url} fallback='shield' size={48} />
              <View className='flex-1'>
                <Text className='text-text-main font-bold text-base' numberOfLines={1}>
                  {otherTeam.name}
                </Text>
                <Text
                  className={`text-xs uppercase font-bold mt-1 ${
                    isOutgoing ? 'text-text-muted' : 'text-primary'
                  }`}
                >
                  {isOutgoing ? 'Enviado' : 'Recibido'}
                </Text>
              </View>
            </View>

            {!isOutgoing && item.status === 'PENDING' && canManage && (
              <View className='flex-row gap-2 ml-3'>
                <Button
                  title='Rechazar'
                  variant='secondary'
                  onPress={(e) => {
                    e?.stopPropagation?.()
                    onRejectChallenge(item.id)
                  }}
                />
                <Button
                  title='Aceptar'
                  variant='primary'
                  onPress={(e) => {
                    e?.stopPropagation?.()
                    onAcceptChallenge(item.id)
                  }}
                />
              </View>
            )}

            <ChevronRight size={20} color='#9CA3AF' className='ml-2' />
          </TouchableOpacity>
        )
      }}
      ListEmptyComponent={
        <View className='items-center mt-16 px-6'>
          <View className='w-20 h-20 bg-gray-800/50 rounded-3xl items-center justify-center mb-6 border border-gray-700/50'>
            <MessageSquare size={36} color='#39FF14' strokeWidth={1.5} />
          </View>
          <Text className='text-gray-300 text-center font-title text-lg mb-2'>
            No tienes desafíos activos
          </Text>
          <Text className='text-gray-500 text-center text-sm'>
            Busca rivales en la pestaña &ldquo;Explorar&rdquo;
          </Text>
        </View>
      }
    />
  )
}