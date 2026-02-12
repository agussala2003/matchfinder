import { ChatMessage } from '@/services/chat.service'
import { Calendar, Check, Clock, Lock, MapPin, Shield, X } from 'lucide-react-native'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

interface ChatMessageItemProps {
  item: ChatMessage
  myTeamId: string
  myTeam: any
  rivalTeam: any
  canManage: boolean
  onAccept: (msg: ChatMessage) => void
  onReject: (msg: ChatMessage) => void
  onCancel: (msg: ChatMessage) => void
}

export const ChatMessageItem = ({
  item,
  myTeamId,
  myTeam,
  rivalTeam,
  canManage,
  onAccept,
  onReject,
  onCancel,
}: ChatMessageItemProps) => {
  const isMe = item.sender_team_id === myTeamId
  const sender = isMe ? myTeam : rivalTeam

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  if (item.type === 'PROPOSAL') {
    const pData: any = item.proposal_data || {}
    return (
      <View className={`my-3 w-full flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
        {!isMe && (
          <View className="mr-2 justify-end pb-1">
            <View className="w-8 h-8 bg-card rounded-full items-center justify-center border border-border overflow-hidden">
              {sender?.logo_url ? (
                <Image
                  source={{ uri: sender.logo_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Shield size={16} color="#A1A1AA" strokeWidth={2} />
              )}
            </View>
          </View>
        )}

        <View className="max-w-[80%]">
          {!isMe && (
            <Text className="text-primary text-xs font-bold mb-1 ml-1">{sender?.name}</Text>
          )}

          <View
            className={`rounded-2xl border-2 overflow-hidden shadow-lg ${
              item.status === 'CANCELLED' 
                ? 'border-destructive/30 opacity-60' 
                : isMe ? 'border-border' : 'border-primary/40'
            }`}
          >
            <View
              className={`px-4 py-3 flex-row items-center justify-between ${
                item.status === 'CANCELLED'
                  ? 'bg-destructive/10'
                  : isMe ? 'bg-secondary' : 'bg-primary/10'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Calendar size={16} color={item.status === 'CANCELLED' ? '#D93036' : isMe ? '#A1A1AA' : '#00D54B'} strokeWidth={2} />
                <Text
                  className={`text-xs font-bold uppercase tracking-wide ${
                    item.status === 'CANCELLED'
                      ? 'text-destructive'
                      : isMe ? 'text-muted-foreground' : 'text-primary'
                  }`}
                >
                  {item.status === 'CANCELLED' ? 'Propuesta Cancelada' : 'Propuesta de Partido'}
                </Text>
              </View>
              
              {item.status === 'ACCEPTED' && (
                <View className="bg-primary/20 px-2 py-1 rounded-full flex-row items-center gap-1">
                  <Check size={12} color="#00D54B" strokeWidth={3} />
                  <Text className="text-primary text-[9px] font-bold uppercase">Confirmada</Text>
                </View>
              )}
            </View>

            {item.status !== 'CANCELLED' && (
              <View className="bg-card p-4">
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <Text className="text-foreground text-xl font-bold mb-1">
                      {pData.date ? new Date(pData.date + 'T00:00:00').toLocaleDateString('es-AR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      }) : 'Fecha TBA'}
                    </Text>
                    <View className="flex-row items-center gap-2 mb-2">
                      <Clock size={14} color="#00D54B" strokeWidth={2} />
                      <Text className="text-foreground font-medium">{pData.time ? pData.time + ' hs' : ''}</Text>
                    </View>
                    {pData.venue && (
                      <View className="flex-row items-center gap-2">
                        <MapPin size={12} color="#A1A1AA" strokeWidth={2} />
                        <Text className="text-muted-foreground text-xs">{pData.venue}</Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end gap-2">
                    {pData.isFriendly !== undefined && (
                      <View className={`px-3 py-1.5 rounded-full ${pData.isFriendly ? 'bg-blue-500/20' : 'bg-warning/20'}`}>
                        <Text className={`text-xs font-bold uppercase ${pData.isFriendly ? 'text-blue-400' : 'text-warning'}`}>
                          {pData.isFriendly ? '🤝 Amistoso' : '🏆 Por Puntos'}
                        </Text>
                      </View>
                    )}
                    {pData.modality && (
                      <Text className="text-muted-foreground text-xs font-medium">
                        {pData.modality} • {pData.duration}
                      </Text>
                    )}
                  </View>
                </View>

                {item.status === 'SENT' && !isMe && canManage && (
                  <View className="flex-row gap-2 mt-2 pt-2 border-t border-border">
                    <TouchableOpacity
                      onPress={() => onReject(item)}
                      className="flex-1 bg-destructive/20 py-2.5 rounded-lg border border-destructive/40 active:bg-destructive/30 flex-row items-center justify-center gap-1.5"
                    >
                      <X size={14} color="#D93036" strokeWidth={2.5} />
                      <Text className="text-destructive font-bold text-xs">Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onAccept(item)}
                      className="flex-1 bg-primary py-2.5 rounded-lg active:bg-primary/80 flex-row items-center justify-center gap-1.5"
                    >
                      <Check size={14} color="#121217" strokeWidth={3} />
                      <Text className="text-primary-foreground font-bold text-xs">Aceptar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === 'SENT' && !isMe && !canManage && (
                  <View className="mt-2 pt-2 border-t border-border">
                    <View className="flex-row items-center justify-center gap-2 bg-muted/50 py-2 rounded-lg">
                      <Lock size={12} color="#A1A1AA" strokeWidth={2} />
                      <Text className="text-muted-foreground text-[10px] uppercase">
                        Solo capitanes pueden responder
                      </Text>
                    </View>
                  </View>
                )}

                {item.status === 'ACCEPTED' && (
                  <View className="mt-2 pt-2 border-t border-primary/30 flex-row items-center justify-center gap-2">
                    <Check size={16} color="#00D54B" strokeWidth={3} />
                    <Text className="text-primary font-bold text-xs">FECHA CONFIRMADA</Text>
                  </View>
                )}

                {item.status === 'REJECTED' && (
                  <View className="mt-2 pt-2 border-t border-destructive/30 flex-row items-center justify-center gap-2">
                    <X size={16} color="#D93036" strokeWidth={3} />
                    <Text className="text-destructive font-bold text-xs">PROPUESTA RECHAZADA</Text>
                  </View>
                )}

                {item.status === 'SENT' && isMe && (
                  <View className="mt-2 pt-2 border-t border-border gap-2">
                    <Text className="text-muted-foreground text-xs italic text-center">
                      Esperando respuesta...
                    </Text>
                    <TouchableOpacity
                      onPress={() => onCancel(item)}
                      className="bg-destructive/10 py-2 rounded-lg border border-destructive/30 active:bg-destructive/20 flex-row items-center justify-center gap-1.5"
                    >
                      <X size={14} color="#D93036" strokeWidth={2.5} />
                      <Text className="text-destructive font-bold text-xs">Cancelar Propuesta</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {item.status === 'CANCELLED' && (
              <View className="bg-card p-2">
                <View className="mt-2 pt-2 border-t border-destructive/30 flex-row items-center justify-center gap-2">
                  <X size={16} color="#D93036" strokeWidth={3} />
                  <Text className="text-destructive font-bold text-xs">PROPUESTA CANCELADA POR REMITENTE</Text>
                </View>
              </View>
            )}
          </View>

          <Text
            className={`text-muted-foreground text-[10px] mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className={`my-1 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className="mr-2 justify-end pb-1">
          <View className="w-8 h-8 bg-card rounded-full items-center justify-center border border-border overflow-hidden">
            {sender?.logo_url ? (
              <Image
                source={{ uri: sender.logo_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Shield size={16} color="#A1A1AA" strokeWidth={2} />
            )}
          </View>
        </View>
      )}

      <View className="max-w-[75%]">
        {!isMe && (
          <Text className="text-primary text-xs font-bold mb-1 ml-1">{sender?.name}</Text>
        )}

        <View
          className={`px-3 py-2 rounded-2xl ${isMe ? 'bg-secondary rounded-tr-sm' : 'bg-primary/90 rounded-tl-sm'
            }`}
        >
          <Text
            className={`text-base leading-5 ${isMe ? 'text-foreground' : 'text-primary-foreground font-medium'
              }`}
          >
            {item.content}
          </Text>
          <Text
            className={`text-[10px] mt-1 self-end ${isMe ? 'text-muted-foreground' : 'text-primary-foreground/60'
              }`}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  )
}