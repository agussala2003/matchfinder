import { Button } from '@/components/ui/Button'
import { TeamMemberDetail } from '@/services/teams.service'
import { Minus, Plus, Shield } from 'lucide-react-native'
import React from 'react'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'

interface PostmatchSectionProps {
  myTeam: {
    name: string
    logo_url?: string
  }
  rivalTeam: {
    name: string
    logo_url?: string
  }
  teamMembers: TeamMemberDetail[]
  homeScore: number
  setHomeScore: (fn: (s: number) => number) => void
  awayScore: number
  setAwayScore: (fn: (s: number) => number) => void
  selectedMVP: string | null
  setSelectedMVP: (mvp: string | null) => void
  onSubmitResult: () => void
  insets: { bottom: number }
}

export const PostmatchSection = ({
  myTeam,
  rivalTeam,
  teamMembers,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  selectedMVP,
  setSelectedMVP,
  onSubmitResult,
  insets,
}: PostmatchSectionProps) => (
  <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
    <View className="bg-card rounded-xl border border-border p-6 mb-6">
      <Text className="text-foreground text-lg font-bold mb-6 text-center">
        Resultado Final
      </Text>

      <View className="flex-row items-center justify-between">
        <View className="items-center w-1/3 gap-2">
          <View className="w-16 h-16 bg-secondary rounded-xl items-center justify-center border border-border overflow-hidden">
            {myTeam.logo_url ? (
              <Image
                source={{ uri: myTeam.logo_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Shield size={32} color="#A1A1AA" strokeWidth={2} />
            )}
          </View>
          <Text className="text-foreground font-bold text-center text-xs" numberOfLines={2}>
            {myTeam.name}
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <View className="items-center gap-3">
            <TouchableOpacity
              onPress={() => setHomeScore((s) => Math.min(s + 1, 99))}
              className="bg-secondary p-2 rounded-lg border border-border active:bg-muted"
            >
              <Plus size={18} color="#FBFBFB" strokeWidth={2} />
            </TouchableOpacity>
            <Text className="text-6xl font-title text-foreground">{homeScore}</Text>
            <TouchableOpacity
              onPress={() => setHomeScore((s) => Math.max(s - 1, 0))}
              className="bg-secondary p-2 rounded-lg border border-border active:bg-muted"
            >
              <Minus size={18} color="#FBFBFB" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Text className="text-muted-foreground text-3xl mb-8">-</Text>

          <View className="items-center gap-3">
            <TouchableOpacity
              onPress={() => setAwayScore((s) => Math.min(s + 1, 99))}
              className="bg-secondary p-2 rounded-lg border border-border active:bg-muted"
            >
              <Plus size={18} color="#FBFBFB" strokeWidth={2} />
            </TouchableOpacity>
            <Text className="text-6xl font-title text-foreground">{awayScore}</Text>
            <TouchableOpacity
              onPress={() => setAwayScore((s) => Math.max(s - 1, 0))}
              className="bg-secondary p-2 rounded-lg border border-border active:bg-muted"
            >
              <Minus size={18} color="#FBFBFB" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="items-center w-1/3 gap-2">
          <View className="w-16 h-16 bg-secondary rounded-xl items-center justify-center border border-border overflow-hidden">
            {rivalTeam.logo_url ? (
              <Image
                source={{ uri: rivalTeam.logo_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Shield size={32} color="#A1A1AA" strokeWidth={2} />
            )}
          </View>
          <Text className="text-foreground font-bold text-center text-xs" numberOfLines={2}>
            {rivalTeam.name}
          </Text>
        </View>
      </View>
    </View>

    <View className="bg-card rounded-xl border border-border p-4 mb-8">
      <Text className="text-foreground font-bold mb-4 text-lg">⭐ Figura del Partido</Text>
      <View className="flex-row flex-wrap gap-3">
        {teamMembers.map((member) => (
          <TouchableOpacity
            key={member.user_id}
            onPress={() => setSelectedMVP(member.user_id)}
            className={`items-center w-[22%] p-3 rounded-xl border-2 ${selectedMVP === member.user_id
                ? 'bg-primary/10 border-primary'
                : 'bg-secondary border-transparent'
              }`}
          >
            <View className="w-12 h-12 bg-card rounded-full items-center justify-center border border-border overflow-hidden mb-2">
              {member.profile?.avatar_url ? (
                <Image
                  source={{ uri: member.profile.avatar_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Shield size={24} color="#A1A1AA" strokeWidth={2} />
              )}
            </View>
            <Text className="text-foreground text-[10px] text-center" numberOfLines={1}>
              {member.profile?.full_name?.split(' ')[0] || 'Jugador'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <Button
      title="ENVIAR RESULTADO"
      className="w-full h-14"
      variant="primary"
      onPress={onSubmitResult}
      style={{ marginBottom: insets.bottom + 20 }}
    />
  </ScrollView>
)