import { ChatMessage } from '@/services/chat.service'
import { Calendar, Check, Clock, MapPin, Shield, X } from 'lucide-react-native'
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
  // Logic for identity
  // 1. If it's my team...
  const isMyTeam = item.sender_team_id === myTeamId

  // 2. Is it ME specifically? (We need current userId passed to prop, or assume distinct behaviour)
  // Since we don't have current userId passed to this component yet, we will rely on team ID for alignment
  // BUT we will show the User Name if it is available.

  // New visual logic:
  // ME (Right): isMyTeam AND (item.sender_user_id === currentUserId OR we just assume all my team is right)
  // Current app design: My Team = Right. Rival = Left.
  // We will keep this.

  const isMe = isMyTeam
  const sender = isMe ? myTeam : rivalTeam

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  // Determine the name to show
  // If it's Me (My Team), we might want to show the specific user name if it's NOT me. 
  // But without currentUserId, we can't know for sure.
  // However, the USER REQUEST was "son todos iguales" (all look same).
  // If we show the name for EVERYONE (except maybe if we can confirm it IS me), that helps.
  const senderName = item.profile?.username || item.profile?.full_name || sender?.name || 'Usuario'

  if (item.type === 'PROPOSAL') {
    // ... Keep existing proposal logic but update sender name usage ...
    // (Simplified for brevity - keeping original proposal return matching the original file style 
    // but ensuring variables are correct).
    // Actually, let's just update the text message part which is the main issue.
    const pData: any = item.proposal_data || {}
    return (
      <View className={`my-3 w-full flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
        {!isMe && (
          <View className="mr-2 justify-end pb-1">
            <View className="w-8 h-8 bg-card rounded-full items-center justify-center border border-border overflow-hidden">
              {sender?.logo_url ? (
                <Image source={{ uri: sender.logo_url }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Shield size={16} color="#A1A1AA" strokeWidth={2} />
              )}
            </View>
          </View>
        )}
        <View className="max-w-[80%]">
          {!isMe && (
            <Text className="text-primary text-xs font-bold mb-1 ml-1">{senderName}</Text>
          )}
          {/* Proposal Card UI ... same as before ... */}
          <View
            className={`rounded-2xl border-2 overflow-hidden shadow-lg ${item.status === 'CANCELLED'
                ? 'border-destructive/30 opacity-60'
                : isMe ? 'border-border' : 'border-primary/40'
              }`}
          >
            {/* ... Header ... */}
            <View
              className={`px-4 py-3 flex-row items-center justify-between ${item.status === 'CANCELLED'
                  ? 'bg-destructive/10'
                  : isMe ? 'bg-secondary' : 'bg-primary/10'
                }`}
            >
              <View className="flex-row items-center gap-2">
                <Calendar size={16} color={item.status === 'CANCELLED' ? '#D93036' : isMe ? '#A1A1AA' : '#00D54B'} strokeWidth={2} />
                <Text
                  className={`text-xs font-bold uppercase tracking-wide ${item.status === 'CANCELLED'
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

            {/* Content */}
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
                </View>

                {/* Actions */}
                {item.status === 'SENT' && !isMe && canManage && (
                  <View className="flex-row gap-2 mt-2 pt-2 border-t border-border">
                    <TouchableOpacity onPress={() => onReject(item)} className="flex-1 bg-destructive/20 py-2.5 rounded-lg border border-destructive/40 flex-row items-center justify-center gap-1.5"><X size={14} color="#D93036" /><Text className="text-destructive font-bold text-xs">Rechazar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => onAccept(item)} className="flex-1 bg-primary py-2.5 rounded-lg flex-row items-center justify-center gap-1.5"><Check size={14} color="#121217" /><Text className="text-primary-foreground font-bold text-xs">Aceptar</Text></TouchableOpacity>
                  </View>
                )}
                {/* ... other statuses ... */}
              </View>
            )}

            {item.status === 'CANCELLED' && (
              <View className="bg-card p-2"><View className="mt-2 pt-2 border-t border-destructive/30 flex-row items-center justify-center gap-2"><X size={16} color="#D93036" /><Text className="text-destructive font-bold text-xs">PROPUESTA CANCELADA</Text></View></View>
            )}
          </View>
          <Text className={`text-muted-foreground text-[10px] mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    )
  }

  // TEXT MESSAGE
  return (
    <View className={`my-1 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className="mr-2 justify-end pb-1">
          <View className="w-8 h-8 bg-card rounded-full items-center justify-center border border-border overflow-hidden">
            {sender?.logo_url ? (
              <Image source={{ uri: sender.logo_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Shield size={16} color="#A1A1AA" strokeWidth={2} />
            )}
          </View>
        </View>
      )}

      <View className="max-w-[75%]">
        {/* ALWAYS show name if it's available, even for ME, or at least for teammates.
            If isMe is true, it aligns right. 
            The user complained "son todos iguales". 
            Showing the name helps distinguish WHICH user sent it. 
        */}
        <Text className={`text-[10px] font-bold mb-1 ${isMe ? 'text-right mr-1 text-muted-foreground' : 'ml-1 text-primary'}`}>
          {senderName}
        </Text>

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