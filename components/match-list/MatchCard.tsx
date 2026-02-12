import { MatchPreview } from '@/services/matches.service'
import { router } from 'expo-router'
import {
    AlertCircle,
    ChevronRight,
    Clock,
    MapPin,
    MessageCircle,
    Shield,
    Zap,
} from 'lucide-react-native'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

interface MatchCardProps {
  match: MatchPreview
  myTeamId: string
  canManage: boolean
}

export const MatchCard = ({ match, myTeamId, canManage }: MatchCardProps) => {
  const isPending = match.status === 'PENDING'
  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'

  // Notificación: último mensaje del rival
  const hasNotification = match.last_message && match.last_message.sender_team_id !== myTeamId

  const getStatusBadge = () => {
    if (isLive) {
      return (
        <View className="bg-red-500/20 px-2 py-1 rounded border border-red-500/50">
          <Text className="text-red-500 text-xs font-bold uppercase">● En Vivo</Text>
        </View>
      )
    }
    if (isFinished) {
      return (
        <View className="bg-gray-700/50 px-2 py-1 rounded">
          <Text className="text-gray-400 text-xs font-bold uppercase">Finalizado</Text>
        </View>
      )
    }
    return null
  }

  const handlePress = () => {
    router.push(`/match/${match.id}` as any)
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className={`rounded-xl border overflow-hidden ${
        isLive
          ? 'bg-card border-red-500/50'
          : isPending
          ? 'bg-card border-warning/30'
          : 'bg-card border-border'
      }`}
    >
      {/* Barra superior Solo si es Pending o Live */}
      {(isPending || isLive) && (
        <View
          className={`px-4 py-2 border-b flex-row items-center justify-between ${
            isLive ? 'bg-red-500/20 border-red-500/30' : 'bg-warning/20 border-warning/30'
          }`}
        >
          <View className="flex-row items-center gap-2">
            {isLive ? (
              <Zap size={14} color="#EF4444" strokeWidth={2.5} />
            ) : (
              <AlertCircle size={14} color="#EAB308" strokeWidth={2.5} />
            )}
            <Text
              className={`text-xs font-bold uppercase ${isLive ? 'text-red-500' : 'text-warning'}`}
            >
              {isLive ? 'Partido en Vivo' : 'Requiere Acción'}
            </Text>
          </View>

          {hasNotification && !isLive && (
            <View className="flex-row items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/50">
              <View className="w-2 h-2 bg-red-500 rounded-full" />
              <Text className="text-red-400 text-[10px] font-bold uppercase">Nueva Respuesta</Text>
            </View>
          )}
        </View>
      )}

      <View className="p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3 mr-4">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 bg-secondary rounded-full items-center justify-center overflow-hidden">
              {match.rival.logo_url ? (
                <Image
                  source={{ uri: match.rival.logo_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Shield size={16} color="#A1A1AA" strokeWidth={2} />
              )}
            </View>
            <Text className="text-text-main font-bold flex-1" numberOfLines={1}>
              vs {match.rival.name}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {getStatusBadge()}
            <ChevronRight size={18} color="#6B7280" strokeWidth={2} />
          </View>
        </View>

        {/* Detalles del partido */}
        <View className="gap-2">
          {match.scheduled_at ? (
            <View className="flex-row items-center gap-2">
              <Clock size={14} color="#00D54B" strokeWidth={2} />
              <Text className="text-primary text-sm font-medium">
                {new Date(match.scheduled_at).toLocaleDateString('es-AR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {match.booking_confirmed && (
                <View className="bg-primary/10 px-2 py-0.5 rounded border border-primary/30">
                  <Text className="text-primary text-[10px] font-bold uppercase">Confirmado</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Clock size={14} color="#EAB308" strokeWidth={2} />
              <Text className="text-warning text-sm">Fecha por coordinar</Text>
            </View>
          )}

          <View className="flex-row items-center gap-2">
            <MapPin size={14} color="#A1A1AA" strokeWidth={2} />
            <Text className="text-text-muted text-sm">
              {match.is_friendly ? 'Amistoso' : 'Por los Puntos'}
            </Text>
          </View>

          {match.last_message && (
            <View className="flex-row items-center gap-2 mt-2 p-2 bg-secondary rounded border border-border">
              <MessageCircle size={12} color="#A1A1AA" strokeWidth={2} />
              <Text className="text-text-muted text-xs flex-1" numberOfLines={1}>
                {match.last_message.type === 'PROPOSAL'
                  ? 'Propuesta de fecha'
                  : match.last_message.content}
              </Text>
              <Text className="text-text-muted text-[10px]">
                {new Date(match.last_message.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}