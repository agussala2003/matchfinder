import { MatchPreview } from '@/services/matches.service'
import React from 'react'
import { Text, View } from 'react-native'
import { EmptyState } from './EmptyState'
import { MatchCard } from './MatchCard'

interface MatchSectionProps {
  title: string
  matches: MatchPreview[]
  myTeamId: string
  canManage: boolean
  emptyStateType?: 'noLive' | 'noPending' | 'noFinished'
  onCreateMatch?: () => void
}

export const MatchSection = ({
  title,
  matches,
  myTeamId,
  canManage,
  emptyStateType,
  onCreateMatch,
}: MatchSectionProps) => {
  if (matches.length === 0 && emptyStateType) {
    return (
      <View className="flex-1">
        <Text className="text-text-main text-xl font-bold mb-4 px-6">
          {title}
        </Text>
        <EmptyState type={emptyStateType} onCreateMatch={onCreateMatch} />
      </View>
    )
  }

  if (matches.length === 0) {
    return null
  }

  return (
    <View className="gap-4">
      <Text className="text-text-main text-xl font-bold px-6">
        {title}
      </Text>
      <View className="gap-4 px-6">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            myTeamId={myTeamId}
            canManage={canManage}
          />
        ))}
      </View>
    </View>
  )
}