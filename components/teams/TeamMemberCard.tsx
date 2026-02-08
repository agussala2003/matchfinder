import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { UserRole } from '@/types/core'
import { MoreVertical } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface TeamMemberCardProps {
  userId: string
  fullName?: string
  username?: string
  avatarUrl?: string
  role: UserRole
  isCurrentUser: boolean
  canManage: boolean
  onPress?: () => void
}

export function TeamMemberCard({
  userId,
  fullName,
  username,
  avatarUrl,
  role,
  isCurrentUser,
  canManage,
  onPress,
}: TeamMemberCardProps) {
  const shouldShowActions = canManage && !isCurrentUser

  return (
    <TouchableOpacity
      activeOpacity={shouldShowActions ? 0.7 : 1}
      onPress={shouldShowActions ? onPress : undefined}
      disabled={!shouldShowActions}
    >
      <Card className='flex-row items-center p-3.5'>
        {/* Avatar */}
        <Avatar uri={avatarUrl} fallback='user' shape='circle' size={48} />

        {/* Member Info */}
        <View className='flex-1 min-w-0 ml-3'>
          <Text className='text-white font-semibold text-base' numberOfLines={1}>
            {fullName || 'Usuario'}
          </Text>
          <Text className='text-gray-400 text-xs' numberOfLines={1}>
            @{username || 'unknown'}
          </Text>
        </View>

        {/* Role Badge */}
        <View className='ml-2 flex-shrink-0'>
          <RoleBadge role={role} size='sm' />
        </View>

        {/* Actions Menu */}
        {shouldShowActions && (
          <View className='ml-2 flex-shrink-0'>
            <View className='p-1'>
              <MoreVertical size={18} color='#9CA3AF' strokeWidth={2.5} />
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )
}
