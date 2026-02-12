import { ChallengeRelationship, RivalCard } from '@/components/rivals/RivalCard'
import { Team } from '@/types/teams'
import { Filter } from 'lucide-react-native'
import React from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'

interface RivalsListProps {
  rivals: Team[]
  refreshing: boolean
  canManage: boolean
  onRefresh: () => void
  onRivalPress: (rival: Team) => void
  onChallenge: (teamId: string) => void
  getRelationship: (teamId: string) => ChallengeRelationship
}

export const RivalsList = ({
  rivals,
  refreshing,
  canManage,
  onRefresh,
  onRivalPress,
  onChallenge,
  getRelationship,
}: RivalsListProps) => {
  return (
    <FlatList
      data={rivals}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor='#39FF14'
        />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
      renderItem={({ item }) => (
        <RivalCard
          team={item}
          onPress={() => onRivalPress(item)}
          onChallenge={() => onChallenge(item.id)}
          relationship={getRelationship(item.id)}
          canChallenge={canManage}
        />
      )}
      ListEmptyComponent={
        <View className='items-center mt-16 px-6'>
          <View className='w-20 h-20 bg-gray-800/50 rounded-3xl items-center justify-center mb-6 border border-gray-700/50'>
            <Filter size={36} color='#39FF14' strokeWidth={1.5} />
          </View>
          <Text className='text-gray-300 text-center font-title text-lg mb-2'>
            No hay rivales disponibles
          </Text>
          <Text className='text-gray-500 text-center text-sm leading-5'>
            Intenta ajustar los filtros o{'\n'}buscar en otra zona
          </Text>
        </View>
      }
    />
  )
}