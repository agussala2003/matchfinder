import { POSICIONES_ARGENTINAS, Posicion } from '@/lib/constants'
import { MarketPost } from '@/types/market'
import { MapPin, MessageCircle, Shield, Trash2, User } from 'lucide-react-native'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

interface MarketPostCardProps {
  item: MarketPost
  currentUserId: string | null
  onContact: (post: MarketPost) => void
  onViewStats: (post: MarketPost) => void
  onDelete?: (id: string) => void
}

export const MarketPostCard = ({
  item,
  currentUserId,
  onContact,
  onViewStats,
  onDelete,
}: MarketPostCardProps) => {
  const isTeamPost = item.type === 'TEAM_SEEKING_PLAYER'
  const title = isTeamPost ? item.team?.name || 'Equipo' : item.profile?.full_name || 'Jugador'

  // Parse position
  const rawPosition = item.position_needed as Posicion
  const role = POSICIONES_ARGENTINAS[rawPosition] || item.position_needed || 'Cualquiera'

  const imageUrl = isTeamPost ? item.team?.logo_url : item.profile?.avatar_url
  const isOwner = item.user_id === currentUserId

  // Derived values
  const location = item.team?.home_zone || null
  const category = item.team?.category || null

  return (
    <View className='bg-card rounded-2xl border border-border mb-3 overflow-hidden'>
      {/* Accent Bar */}
      <View className={`h-1 w-full ${isTeamPost ? 'bg-accent' : 'bg-primary'}`} />

      <View className='p-4'>
        {/* Header Row */}
        <View className='flex-row gap-3 mb-3'>
          {/* Avatar */}
          <View className='w-16 h-16 bg-secondary rounded-xl items-center justify-center border border-border overflow-hidden flex-shrink-0'>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} className='w-full h-full' resizeMode='cover' />
            ) : isTeamPost ? (
              <Shield size={28} color='#A1A1AA' strokeWidth={2} />
            ) : (
              <User size={28} color='#A1A1AA' strokeWidth={2} />
            )}
          </View>

          {/* Info Column */}
          <View className='flex-1 min-w-0'>
            {/* Title */}
            <Text className='text-foreground font-title text-lg mb-1' numberOfLines={1}>
              {title}
            </Text>

            {/* Badge + Position Row */}
            <View className='flex-row items-center gap-2 mb-1.5'>
              <View
                className={`px-2 py-0.5 rounded-md border ${
                  isTeamPost
                    ? 'bg-accent/10 border-accent/30'
                    : 'bg-primary/10 border-primary/30'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase ${
                    isTeamPost ? 'text-accent' : 'text-primary'
                  }`}
                >
                  {isTeamPost ? 'Busca Jugador' : 'Busca Equipo'}
                </Text>
              </View>
              <Text className='text-muted-foreground text-xs'>•</Text>
              <Text className='text-foreground font-bold text-xs uppercase tracking-wide'>
                {role}
              </Text>
            </View>

            {/* Location/Category */}
            {isTeamPost && (location || category) && (
              <View className='flex-row items-center gap-1.5'>
                <MapPin size={12} color='#A1A1AA' strokeWidth={2} />
                <Text className='text-muted-foreground text-xs' numberOfLines={1}>
                  {[location, category].filter(Boolean).join(' • ')}
                </Text>
              </View>
            )}

            {/* Player position (if player post) */}
            {!isTeamPost && item.profile?.position && (
              <Text className='text-muted-foreground text-xs'>
                {POSICIONES_ARGENTINAS[item.profile.position as Posicion] || item.profile.position}
              </Text>
            )}
          </View>

          {/* Delete Button */}
          {isOwner && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(item.id)}
              className='p-2 -mt-1 -mr-1 flex-shrink-0'
            >
              <Trash2 size={18} color='#D93036' strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Description (if exists) */}
        {item.description && (
          <View className='bg-secondary/30 px-3 py-2.5 rounded-xl mb-3'>
            <Text className='text-muted-foreground text-sm leading-5' numberOfLines={2}>
              &quot;{item.description}&quot;
            </Text>
          </View>
        )}

        {/* Actions Row */}
        {!isOwner ? (
          <View className='flex-row gap-2 pt-3 border-t border-border'>
            <TouchableOpacity
              onPress={() => onContact(item)}
              className='flex-1 bg-primary h-11 rounded-xl flex-row items-center justify-center gap-2 active:bg-primary/80'
            >
              <MessageCircle size={18} color='#121217' strokeWidth={2.5} />
              <Text className='text-primary-foreground font-bold text-sm'>Contactar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onViewStats(item)}
              className='w-11 h-11 bg-secondary border border-border rounded-xl items-center justify-center active:bg-muted'
            >
              <Text className='text-foreground font-bold text-xs'>📊</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className='pt-3 border-t border-border items-center'>
            <Text className='text-muted-foreground text-xs font-medium'>Tu publicación</Text>
          </View>
        )}
      </View>
    </View>
  )
}