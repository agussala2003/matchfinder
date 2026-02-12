import { TeamMemberCard } from '@/components/teams/TeamMemberCard'
import { TeamMemberDetail } from '@/services/teams.service'
import { UserRole } from '@/types/core'
import { Users } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'

interface ActiveMembersSectionProps {
  activeMembers: TeamMemberDetail[]
  currentUser: string
  isCaptain: boolean
  onMemberPress: (member: TeamMemberDetail) => void
}

export const ActiveMembersSection = ({
  activeMembers,
  currentUser,
  isCaptain,
  onMemberPress,
}: ActiveMembersSectionProps) => (
  <View>
    <View className="flex-row items-center gap-2 mb-2">
      <Users size={20} color="#39FF14" strokeWidth={2.5} />
      <Text className="text-white font-title text-lg">Plantel</Text>
      <View className="bg-gray-800 px-2.5 py-0.5 rounded-full">
        <Text className="text-gray-400 text-xs font-bold">{activeMembers.length}</Text>
      </View>
    </View>

    <View className="gap-2">
      {activeMembers.map((member: TeamMemberDetail) => (
        <TeamMemberCard
          key={member.user_id}
          userId={member.user_id}
          fullName={member.profile.full_name}
          username={member.profile.username}
          avatarUrl={member.profile.avatar_url || undefined}
          role={member.role as UserRole}
          isCurrentUser={member.user_id === currentUser}
          canManage={isCaptain}
          onPress={() => onMemberPress(member)}
        />
      ))}
    </View>
  </View>
)