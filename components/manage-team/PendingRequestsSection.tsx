import { PendingRequestCard } from '@/components/teams/PendingRequestCard'
import { TeamMemberDetail } from '@/services/teams.service'
import React from 'react'
import { Text, View } from 'react-native'

interface PendingRequestsSectionProps {
  pendingMembers: TeamMemberDetail[]
  onAccept: (userId: string) => void
  onReject: (userId: string) => void
}

export const PendingRequestsSection = ({
  pendingMembers,
  onAccept,
  onReject,
}: PendingRequestsSectionProps) => {
  if (pendingMembers.length === 0) return null

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white font-title text-lg">Solicitudes Pendientes</Text>
        <View className="bg-yellow-500/20 px-2.5 py-1 rounded-full border border-yellow-500/30">
          <Text className="text-yellow-500 text-xs font-bold">{pendingMembers.length}</Text>
        </View>
      </View>
      <View className="gap-3">
        {pendingMembers.map((m: TeamMemberDetail) => (
          <PendingRequestCard
            key={m.user_id}
            userId={m.user_id}
            fullName={m.profile.full_name}
            username={m.profile.username}
            avatarUrl={m.profile.avatar_url || undefined}
            onAccept={() => onAccept(m.user_id)}
            onReject={() => onReject(m.user_id)}
          />
        ))}
      </View>
    </View>
  )
}