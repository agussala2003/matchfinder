import { TeamMemberDetail } from '@/services/teams.service'
import { AlertTriangle, Check, Shield } from 'lucide-react-native'
import React from 'react'
import { Image, ScrollView, Text, View } from 'react-native'

type CitedPlayer = TeamMemberDetail & {
  teamName: string
  isBothTeams?: boolean
}

interface LineupViewProps {
  citedPlayers: CitedPlayer[]
}

export const LineupView = ({ citedPlayers }: LineupViewProps) => {
  // Group by Team Name
  const teams = React.useMemo(() => {
    const groups: Record<string, CitedPlayer[]> = {}
    citedPlayers.forEach(p => {
      if (!groups[p.teamName]) groups[p.teamName] = []
      groups[p.teamName].push(p)
    })
    return groups
  }, [citedPlayers])

  return (
    <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
      {Object.entries(teams).map(([teamName, players]) => (
        <View key={teamName} className="bg-card rounded-xl border border-border p-4 mb-4">
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-border">
            <Text className="text-foreground font-bold text-lg">{teamName}</Text>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full">
              <Text className="text-primary text-xs font-bold">
                {players.length} Citados
              </Text>
            </View>
          </View>

          {players.map((member, index) => (
            <View
              key={`${member.user_id}-${teamName}`}
              className={`flex-row items-center justify-between py-3 ${index !== players.length - 1 ? 'border-b border-border/50' : ''
                }`}
            >
              <View className="flex-row items-center gap-3 flex-1 min-w-0">
                <View className="w-10 h-10 bg-secondary rounded-full items-center justify-center border border-border overflow-hidden">
                  {member.profile?.avatar_url ? (
                    <Image
                      source={{ uri: member.profile.avatar_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Shield size={20} color="#A1A1AA" strokeWidth={2} />
                  )}
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-foreground font-medium" numberOfLines={1}>
                    {member.profile?.full_name || member.profile?.username}
                  </Text>
                  {member.profile?.position && (
                    <Text className="text-muted-foreground text-[10px]" numberOfLines={1}>
                      {member.profile.position}
                    </Text>
                  )}
                </View>
              </View>

              {member.isBothTeams ? (
                <View className="flex-row items-center gap-1.5 bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                  <AlertTriangle size={10} color="#EAB308" />
                  <Text className="text-warning text-[9px] font-bold uppercase">Juega en Ambos</Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                  <Check size={12} color="#00D54B" strokeWidth={3} />
                  <Text className="text-primary text-[10px] font-bold uppercase">Confirmado</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}