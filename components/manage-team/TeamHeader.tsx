import { Avatar } from '@/components/ui/Avatar'
import { MapPin, Pencil } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface Team {
  id: string
  name: string
  logo_url?: string
  home_zone: string
  category: string
  elo_rating: number
}

interface TeamHeaderProps {
  team: Team
  canEdit: boolean
  uploading: boolean
  onEditShield: () => void
  onEditTeam: () => void
}

export const TeamHeader = ({ team, canEdit, uploading, onEditShield, onEditTeam }: TeamHeaderProps) => (
  <View className="pb-4">
    <View className="items-center pb-4">
      <Avatar
        uri={team.logo_url}
        fallback="shield"
        shape="circle"
        editable={canEdit}
        loading={uploading}
        onEdit={onEditShield}
      />
    </View>

    <View className="flex-row items-center justify-center gap-2 mb-2 px-6">
      <Text className="text-white font-title text-3xl text-center" numberOfLines={2}>
        {team.name}
      </Text>
      {canEdit && (
        <TouchableOpacity
          onPress={onEditTeam}
          className="p-1 rounded-md mt-1"
        >
          <Pencil size={16} color="#A1A1AA" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>

    <View className="flex-row items-center justify-center gap-2 mb-2 px-4">
      <View className="flex-row items-center gap-1">
        <MapPin size={14} color="#9CA3AF" strokeWidth={2} />
        <Text className="text-gray-400 text-sm">{team.home_zone}</Text>
      </View>
      <View className="w-1 h-1 bg-gray-600 rounded-full" />
      <Text className="text-gray-400 text-sm">
        {team.category === 'MALE'
          ? 'Masculino'
          : team.category === 'FEMALE'
            ? 'Femenino'
            : 'Mixto'}
      </Text>
    </View>

    <View className="items-center mb-2">
      <Text className="text-gray-500 text-xs uppercase font-semibold tracking-wide mb-1">
        Rating ELO
      </Text>
      <Text className="text-primary font-title text-4xl font-bold">{team.elo_rating}</Text>
    </View>
  </View>
)