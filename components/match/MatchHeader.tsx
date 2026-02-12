import { Calendar, MapPin, Shield } from 'lucide-react-native'
import React from 'react'
import { Image, Text, View } from 'react-native'

interface Team {
  id: string
  name: string
  logo_url?: string
}

interface Venue {
  id: string
  name: string
  address: string
}

interface MatchHeaderProps {
  match: {
    scheduled_at: string | null
    venue?: Venue
  }
  myTeam: Team
  rivalTeam: Team
  formatTime: (iso: string) => string
}

export const MatchHeader = ({ match, myTeam, rivalTeam, formatTime }: MatchHeaderProps) => (
  <View className="bg-card m-4 rounded-xl border border-border overflow-hidden">
    <View className="bg-primary/5 p-4 flex-row items-center justify-between">
      <View className="items-center gap-2 w-1/3">
        <View className="w-14 h-14 bg-secondary rounded-xl items-center justify-center border border-border overflow-hidden">
          {myTeam.logo_url ? (
            <Image
              source={{ uri: myTeam.logo_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Shield size={28} color="#A1A1AA" strokeWidth={2} />
          )}
        </View>
        <Text className="text-foreground font-bold text-xs text-center" numberOfLines={1}>
          {myTeam.name}
        </Text>
      </View>

      <View className="items-center">
        <Text className="text-4xl font-title text-primary tracking-wide">
          {match.scheduled_at ? formatTime(match.scheduled_at) : '--:--'}
        </Text>
        <Text className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-1">
          HORA
        </Text>
      </View>

      <View className="items-center gap-2 w-1/3">
        <View className="w-14 h-14 bg-secondary rounded-xl items-center justify-center border border-border overflow-hidden">
          {rivalTeam.logo_url ? (
            <Image
              source={{ uri: rivalTeam.logo_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Shield size={28} color="#A1A1AA" strokeWidth={2} />
          )}
        </View>
        <Text className="text-foreground font-bold text-xs text-center" numberOfLines={1}>
          {rivalTeam.name}
        </Text>
      </View>
    </View>

    {match.venue?.name && (
      <View className="p-3 bg-card border-t border-border flex-row items-center justify-center gap-2">
        <MapPin size={14} color="#00D54B" strokeWidth={2} />
        <Text className="text-muted-foreground text-xs font-medium">
          {match.venue.name}
        </Text>
      </View>
    )}

    {match.scheduled_at && (
      <View className="p-2 bg-secondary border-t border-border flex-row items-center justify-center gap-2">
        <Calendar size={12} color="#A1A1AA" strokeWidth={2} />
        <Text className="text-muted-foreground text-[11px]">
          {new Date(match.scheduled_at).toLocaleDateString('es-AR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}
        </Text>
      </View>
    )}
  </View>
)