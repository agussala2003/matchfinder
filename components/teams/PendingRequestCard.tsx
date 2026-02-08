import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Check, X } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface PendingRequestCardProps {
  userId: string
  fullName?: string
  username?: string
  avatarUrl?: string
  onAccept: (userId: string) => void
  onReject: (userId: string) => void
}

export function PendingRequestCard({
  userId,
  fullName,
  username,
  avatarUrl,
  onAccept,
  onReject,
}: PendingRequestCardProps) {
  return (
    <Card className='flex-row items-center justify-between p-3.5 border-yellow-500/20 bg-yellow-500/5'>
      {/* Member Info */}
      <View className='flex-row items-center gap-3 flex-1 min-w-0'>
        <Avatar uri={avatarUrl} fallback='user' shape='circle' size={48} />
        <View className='flex-1 min-w-0'>
          <Text className='text-white font-semibold text-base' numberOfLines={1}>
            {fullName || 'Usuario'}
          </Text>
          <Text className='text-gray-400 text-xs' numberOfLines={1}>
            @{username || 'unknown'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className='flex-row gap-2 flex-shrink-0 ml-2'>
        <TouchableOpacity
          onPress={() => onAccept(userId)}
          className='bg-green-500/20 w-11 h-11 rounded-xl border border-green-500/40 items-center justify-center active:bg-green-500/30'
        >
          <Check size={20} color='#4ADE80' strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onReject(userId)}
          className='bg-red-500/20 w-11 h-11 rounded-xl border border-red-500/40 items-center justify-center active:bg-red-500/30'
        >
          <X size={20} color='#EF4444' strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Card>
  )
}
