import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth.service'
import { ChatMessage, chatService } from '@/services/chat.service'
import { MatchDetail, matchesService } from '@/services/matches.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import { UserRole } from '@/types/core'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  MapPin,
  Minus,
  Navigation,
  Pencil,
  Plus,
  Send,
  Shield,
  X,
} from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type MatchState = 'previa' | 'checkin' | 'postmatch'
type TabState = 'details' | 'lineup' | 'chat'

// --- TIPO EXTENDIDO PARA JUGADORES CITADOS ---
type CitedPlayer = TeamMemberDetail & {
  teamName: string
  isBothTeams?: boolean
}

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const { showToast } = useToast()
  const flatListRef = useRef<FlatList>(null)

  const [matchState, setMatchState] = useState<MatchState>('previa')
  const [activeTab, setActiveTab] = useState<TabState>('chat')
  const [loading, setLoading] = useState(true)

  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [myTeamId, setMyTeamId] = useState<string>('')
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; logo_url?: string } | null>(null)
  const [rivalTeam, setRivalTeam] = useState<{
    id: string
    name: string
    logo_url?: string
  } | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberDetail[]>([])
  const [citedPlayers, setCitedPlayers] = useState<CitedPlayer[]>([]) // Lista combinada
  const [canManage, setCanManage] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  
  // MODALES
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false) // Modal de gestión de reserva
  
  const [propDate, setPropDate] = useState(new Date())
  const [propTime, setPropTime] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // NUEVOS CAMPOS DE PROPUESTA
  const [propModality, setPropModality] = useState('Fútbol 5')
  const [propDuration, setPropDuration] = useState('60 min')
  const [propIsFriendly, setPropIsFriendly] = useState(true)
  const [propVenue, setPropVenue] = useState('')

  const [gpsDistance, setGpsDistance] = useState(150)
  const [checkedIn, setCheckedIn] = useState(false)
  const [showWOModal, setShowWOModal] = useState(false)

  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [selectedMVP, setSelectedMVP] = useState<string | null>(null)

  useEffect(() => {
    if (id) initializeMatch(id as string)

    const channel = supabase
      .channel(`match-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_messages',
          filter: `match_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as ChatMessage, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    if (!match) return

    if (match.status === 'FINISHED') {
      setMatchState('postmatch')
      return
    }

    if (match.status === 'CONFIRMED' && match.scheduled_at) {
      const matchDate = new Date(match.scheduled_at)
      const now = new Date()
      const diffHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (diffHours < 2) {
        setMatchState('checkin')
      } else {
        setMatchState('previa')
      }
    } else {
      setMatchState('previa')
    }
  }, [match])

  async function initializeMatch(matchId: string) {
    try {
      setLoading(true)

      const session = await authService.getSession()
      const userId = session.data?.user?.id
      if (!userId) {
        showToast('No se pudo identificar el usuario', 'error')
        setLoading(false)
        return
      }

      const matchRes = await matchesService.getMatchById(matchId)
      if (!matchRes.data) {
        showToast('No se pudo cargar el partido', 'error')
        setLoading(false)
        return
      }

      setMatch(matchRes.data)
      setPropIsFriendly(matchRes.data.is_friendly)
      if(matchRes.data.venue?.name) setPropVenue(matchRes.data.venue.name)
      if(matchRes.data.scheduled_at) {
        setPropDate(new Date(matchRes.data.scheduled_at))
        setPropTime(new Date(matchRes.data.scheduled_at))
      }

      const [resA, resB] = await Promise.all([
        teamsService.getTeamMembers(matchRes.data.team_a.id),
        teamsService.getTeamMembers(matchRes.data.team_b.id),
      ])

      const memberA = resA.data?.find((m) => m.user_id === userId)
      const memberB = resB.data?.find((m) => m.user_id === userId)

      if (memberA) {
        setMyTeamId(matchRes.data.team_a.id)
        setMyTeam(matchRes.data.team_a)
        setRivalTeam(matchRes.data.team_b)
        setTeamMembers(resA.data || [])
        setCanManage(memberA.role === UserRole.ADMIN || memberA.role === UserRole.SUB_ADMIN)
      } else if (memberB) {
        setMyTeamId(matchRes.data.team_b.id)
        setMyTeam(matchRes.data.team_b)
        setRivalTeam(matchRes.data.team_a)
        setTeamMembers(resB.data || [])
        setCanManage(memberB.role === UserRole.ADMIN || memberB.role === UserRole.SUB_ADMIN)
      } else {
        showToast('No tienes acceso a este partido', 'error')
        setLoading(false)
        return
      }

      // --- LOGICA DE JUGADORES CITADOS COMBINADOS ---
      const combined = new Map<string, CitedPlayer>()
      
      resA.data?.forEach(m => {
          combined.set(m.user_id, { ...m, teamName: matchRes.data!.team_a.name })
      })
      
      resB.data?.forEach(m => {
          if (combined.has(m.user_id)) {
              const existing = combined.get(m.user_id)!
              existing.isBothTeams = true
              combined.set(m.user_id, existing)
          } else {
              combined.set(m.user_id, { ...m, teamName: matchRes.data!.team_b.name })
          }
      })
      
      setCitedPlayers(Array.from(combined.values()))

      const chatRes = await chatService.getMessages(matchId)
      if (chatRes.data) setMessages(chatRes.data)
    } catch (e) {
      console.error('Error initializing match:', e)
      showToast('Error al cargar el partido', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendText() {
    if (!inputText.trim() || !myTeamId || !match) return

    if (!canManage) {
      showToast('Solo capitanes pueden enviar mensajes', 'error')
      return
    }

    const text = inputText.trim()
    setInputText('')
    const result = await chatService.sendText(match.id, myTeamId, text)

    if (!result.success) {
      showToast('Error al enviar mensaje', 'error')
      setInputText(text)
    }
  }

  async function handleSendProposal() {
    if (!myTeamId || !match) return

    if (!canManage) {
      showToast('Solo capitanes pueden enviar propuestas', 'error')
      return
    }

    // Arreglar zona horaria: usar formato local consistente
    const dateStr = propDate.getFullYear() + '-' + 
      String(propDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(propDate.getDate()).padStart(2, '0')
    const timeStr = String(propTime.getHours()).padStart(2, '0') + ':' + 
      String(propTime.getMinutes()).padStart(2, '0')
    setShowProposalModal(false)

    // Usamos Supabase directo para poder insertar los datos extras en proposal_data
    const { error } = await supabase.from('match_messages').insert({
        match_id: match.id,
        sender_team_id: myTeamId,
        content: 'Propuesta de partido',
        type: 'PROPOSAL',
        status: 'SENT',
        proposal_data: { 
            date: dateStr, 
            time: timeStr, 
            modality: propModality, 
            duration: propDuration, 
            isFriendly: propIsFriendly,
            venue: propVenue || match.venue?.name || ''
        }
    })

    if (!error) {
      showToast('Propuesta enviada', 'success')
    } else {
      showToast('Error al enviar propuesta', 'error')
    }
  }

  async function handleAcceptProposal(msg: ChatMessage) {
    if (!match || !msg.proposal_data) return

    if (!canManage) {
      showToast('Solo capitanes pueden aceptar propuestas', 'error')
      return
    }

    const result = await chatService.respondProposal(msg.id, 'ACCEPTED')

    if (result.success) {
      // Arreglar zona horaria: crear fecha local correctamente
      const [year, month, day] = msg.proposal_data.date.split('-')
      const [hours, minutes] = msg.proposal_data.time.split(':')
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
      const isoString = localDate.toISOString()
      const pData: any = msg.proposal_data
      
      const updateResult = await matchesService.updateMatch(match.id, {
        scheduled_at: isoString,
        is_friendly: pData.isFriendly !== undefined ? pData.isFriendly : match.is_friendly,
        status: 'CONFIRMED',
      })

      if (updateResult.success) {
        showToast('¡Partido Confirmado!', 'success')
        initializeMatch(match.id)
      } else {
        showToast('Error al confirmar partido', 'error')
      }
    } else {
      showToast('Error al aceptar propuesta', 'error')
    }
  }

  async function handleRejectProposal(msg: ChatMessage) {
    if (!canManage) {
      showToast('Solo capitanes pueden rechazar propuestas', 'error')
      return
    }

    const result = await chatService.respondProposal(msg.id, 'REJECTED')

    if (result.success && match) {
      initializeMatch(match.id)
    } else {
      showToast('Error al rechazar propuesta', 'error')
    }
  }

  async function handleCancelProposal(msg: ChatMessage) {
    if (!canManage) {
      showToast('Solo capitanes pueden cancelar propuestas', 'error')
      return
    }

    const result = await chatService.respondProposal(msg.id, 'CANCELLED')

    if (result.success && match) {
      showToast('Propuesta cancelada', 'success')
      initializeMatch(match.id)
    } else {
      showToast('Error al cancelar propuesta', 'error')
    }
  }

  async function handleCancelMatch() {
    if (!canManage || !match) return

    // Verificar límite de 24hs
    if (match.scheduled_at) {
      const matchDate = new Date(match.scheduled_at)
      const now = new Date()
      const diffHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (diffHours < 24) {
        showToast('No se puede cancelar con menos de 24hs de anticipación', 'error')
        return
      }
    }

    const updateResult = await matchesService.updateMatch(match.id, {
      status: 'CANCELLED',
      scheduled_at: undefined
    })

    if (updateResult.success) {
      showToast('Partido cancelado', 'success')
      initializeMatch(match.id)
    } else {
      showToast('Error al cancelar partido', 'error')
    }
  }

  async function handleSaveDetails() {
    if (!canManage || !match) return
    setShowEditModal(false)

    // Arreglar zona horaria: crear fecha local correctamente
    const localDate = new Date(
      propDate.getFullYear(),
      propDate.getMonth(),
      propDate.getDate(),
      propTime.getHours(),
      propTime.getMinutes()
    )
    const isoString = localDate.toISOString()
    
    const updateResult = await matchesService.updateMatch(match.id, {
        scheduled_at: isoString,
        is_friendly: propIsFriendly,
        status: 'CONFIRMED' // Actualizar reserva fuerza a confirmado
    })

    if (updateResult.success) {
        showToast('Reserva actualizada', 'success')
        initializeMatch(match.id)
    } else {
        showToast('Error al actualizar reserva', 'error')
    }
  }

  async function handleSubmitResult() {
    if (!canManage) {
      showToast('Solo capitanes pueden enviar resultados', 'error')
      return
    }

    showToast('Resultado enviado', 'success')
    if (match) setMatch({ ...match, status: 'FINISHED' })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const canCancelMatch = () => {
    if (!match?.scheduled_at || !canManage) return false
    const matchDate = new Date(match.scheduled_at)
    const now = new Date()
    const diffHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours >= 24
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#00D54B" />
      </View>
    )
  }

  if (!match || !myTeam || !rivalTeam) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="w-20 h-20 bg-card rounded-2xl items-center justify-center mb-4 border border-border">
          <AlertTriangle size={40} color="#D93036" strokeWidth={2} />
        </View>
        <Text className="text-foreground font-title text-xl mb-2 text-center">
          Error al Cargar
        </Text>
        <Text className="text-muted-foreground text-center mb-6 leading-5">
          No se pudo cargar el partido o no tienes acceso a él
        </Text>
        <Button
          title="Volver a Partidos"
          variant="primary"
          onPress={() => router.replace('/(tabs)/match')}
        />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
      // Agregarle padding top para evitar superposición con el status bar en Android
        options={{
          title: 'Partido',
          headerShown: true,
          headerStyle: { backgroundColor: '#121217' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#121217' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          {/* PREVIA STATE */}
          {matchState === 'previa' && (
            <View className="flex-1">
              {/* Match Header */}
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

              {/* Tabs */}
              <View className="flex-row mx-4 bg-secondary p-1 rounded-xl mb-3 border border-border">
                {(['chat', 'lineup', 'details'] as TabState[]).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab ? 'bg-card border border-primary/40' : ''
                      }`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'
                        }`}
                    >
                      {tab === 'lineup' ? 'Citados' : tab === 'details' ? 'Detalles' : 'Chat'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tab Content */}
              <View className="flex-1">
                {activeTab === 'chat' && (
                  <>
                    <FlatList
                      ref={flatListRef}
                      data={messages}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <ChatMessageItem
                          item={item}
                          myTeamId={myTeamId}
                          myTeam={myTeam}
                          rivalTeam={rivalTeam}
                          canManage={canManage}
                          onAccept={handleAcceptProposal}
                          onReject={handleRejectProposal}
                          onCancel={handleCancelProposal}
                        />
                      )}
                      inverted
                      contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                      showsVerticalScrollIndicator={false}
                    />

                    <View
                      className="px-3 py-3 bg-card border-t-2 border-border flex-row items-end gap-3"
                      style={{ paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 12) : 12 }}
                    >
                      {canManage ? (
                        <>
                          <TouchableOpacity
                            onPress={() => setShowProposalModal(true)}
                            className="h-12 w-12 items-center justify-center bg-warning/20 rounded-lg border border-warning/30 active:bg-warning/30"
                          >
                            <Calendar size={22} color="#EAB308" strokeWidth={2} />
                          </TouchableOpacity>

                          <TextInput
                            className="flex-1 bg-background text-foreground min-h-[48px] max-h-[120px] px-4 py-3 rounded-2xl border-2 border-border focus:border-primary"
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="#6B7280"
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={() => {
                              handleSendText()
                              Keyboard.dismiss()
                            }}
                            returnKeyType="send"
                            multiline
                            textAlignVertical="center"
                            blurOnSubmit={false}
                          />

                          <TouchableOpacity
                            onPress={() => {
                              handleSendText()
                              Keyboard.dismiss()
                            }}
                            disabled={!inputText.trim()}
                            className={`h-12 w-12 items-center justify-center rounded-full ${inputText.trim() ? 'bg-primary active:bg-primary/80' : 'bg-muted'
                              }`}
                          >
                            <Send
                              size={20}
                              color={inputText.trim() ? '#121217' : '#6B7280'}
                              strokeWidth={2.5}
                            />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View className="flex-1 bg-muted/30 px-4 py-3 rounded-2xl border-2 border-dashed border-border flex-row items-center justify-center gap-3">
                          <Lock size={16} color="#A1A1AA" />
                          <Text className="text-muted-foreground text-xs">
                            Solo capitanes pueden negociar y enviar mensajes
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {activeTab === 'details' && (
                  <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Solo mostrar detalles si el partido está confirmado */}
                    {match.status === 'CONFIRMED' ? (
                      <>
                        <View className="bg-card rounded-xl border border-border p-4 gap-2">
                          <DetailRow
                            label="Tipo"
                            value={match.is_friendly ? 'Amistoso' : 'Por los Puntos'}
                            highlight
                          />
                          <DetailRow label="Modalidad" value="Fútbol 5" />
                          <DetailRow label="Duración" value="60 minutos" />
                          {match.venue?.name && (
                            <DetailRow label="Sede" value={match.venue.name} />
                          )}
                        </View>

                        <View className="bg-card rounded-xl border border-border p-4 mt-4">
                          <View className="flex-row justify-between items-center mb-4 border-b border-border pb-2">
                            <Text className="text-foreground font-bold">Estado de Cancha</Text>
                            <Text className="text-primary text-xs font-bold uppercase">Reservada</Text>
                          </View>
                          <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-lg items-center justify-center bg-primary/20">
                              <CheckCircle2
                                size={22}
                                color="#00D54B"
                                strokeWidth={2}
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-foreground font-bold">Reserva de Cancha</Text>
                              <Text className="text-muted-foreground text-xs mt-0.5">
                                Confirmada
                              </Text>
                            </View>
                          </View>
                        </View>

                        {canManage && (
                          <View className="gap-3 mt-6">
                            <Button 
                              title="Gestionar Reserva / Cambiar Detalles"
                              variant="secondary"
                              icon={<Pencil size={18} color="#FBFBFB" />}
                              onPress={() => setShowEditModal(true)}
                            />
                            {canCancelMatch() && (
                              <Button 
                                title="Cancelar Partido (24hs mínimo)"
                                variant="secondary"
                                icon={<X size={18} color="#FBFBFB" />}
                                onPress={handleCancelMatch}
                              />
                            )}
                          </View>
                        )}
                      </>
                    ) : (
                      <View className="flex-1 items-center justify-center py-20">
                        <View className="w-16 h-16 bg-card rounded-2xl items-center justify-center mb-4 border border-border">
                          <Calendar size={32} color="#A1A1AA" strokeWidth={2} />
                        </View>
                        <Text className="text-foreground font-bold text-lg mb-2 text-center">
                          Pendiente de Confirmación
                        </Text>
                        <Text className="text-muted-foreground text-center text-sm leading-5 px-6">
                          Los detalles del partido aparecerán una vez que se confirme la fecha y hora
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {activeTab === 'lineup' && (
                  <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                    <View className="bg-card rounded-xl border border-border p-4">
                      <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-border">
                        <Text className="text-foreground font-bold text-lg">Jugadores Citados</Text>
                        <View className="bg-primary/10 px-3 py-1.5 rounded-full">
                          <Text className="text-primary text-xs font-bold">
                            {citedPlayers.length} Citados
                          </Text>
                        </View>
                      </View>

                      {citedPlayers.map((member, index) => (
                        <View
                          key={member.user_id}
                          className={`flex-row items-center justify-between py-3 ${index !== citedPlayers.length - 1 ? 'border-b border-border/50' : ''
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
                                <Text className="text-muted-foreground text-[10px]" numberOfLines={1}>
                                    {member.teamName}
                                </Text>
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
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          {/* CHECKIN STATE */}
          {matchState === 'checkin' && (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
            >
              <View
                className={`w-40 h-40 self-center rounded-full items-center justify-center mb-8 border-4 ${gpsDistance <= 100
                    ? 'bg-primary/20 border-primary'
                    : 'bg-card border-border'
                  }`}
              >
                {checkedIn ? (
                  <Check size={64} color="#00D54B" strokeWidth={3} />
                ) : (
                  <Navigation size={64} color={gpsDistance <= 100 ? '#00D54B' : '#6B7280'} />
                )}
              </View>

              <Text className="text-foreground text-3xl font-bold text-center mb-3">
                {checkedIn ? '¡Ya estás listo!' : `A ${gpsDistance}m`}
              </Text>
              <Text className="text-muted-foreground text-center mb-12 px-4 leading-6">
                {checkedIn
                  ? 'Esperando al resto del equipo. El partido comenzará pronto.'
                  : gpsDistance <= 100
                    ? 'Estás en zona. Confirma tu presencia.'
                    : 'Acércate más a la sede para hacer check-in.'}
              </Text>

              {!checkedIn && (
                <Button
                  title="HACER CHECK-IN"
                  onPress={() => setCheckedIn(true)}
                  disabled={gpsDistance > 100}
                  className="w-full h-14 mb-4"
                  variant="primary"
                />
              )}

              {__DEV__ && (
                <View className="flex-row gap-4 mb-8 opacity-40">
                  <Button
                    title="-50m"
                    variant="secondary"
                    onPress={() => setGpsDistance((d) => Math.max(0, d - 50))}
                  />
                  <Button
                    title="+50m"
                    variant="secondary"
                    onPress={() => setGpsDistance((d) => d + 50)}
                  />
                </View>
              )}

              {checkedIn && canManage && (
                <Button
                  title="Terminar Partido (Demo)"
                  variant="secondary"
                  onPress={() => setMatchState('postmatch')}
                  className="w-full mb-4"
                />
              )}

              <TouchableOpacity
                className="mt-4 flex-row items-center justify-center gap-2 bg-destructive/10 p-4 rounded-xl border border-destructive/30 active:bg-destructive/20"
                onPress={() => setShowWOModal(true)}
              >
                <AlertTriangle size={16} color="#D93036" strokeWidth={2} />
                <Text className="text-destructive text-xs font-bold uppercase">
                  Reportar Ausencia (W.O.)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* POSTMATCH STATE */}
          {matchState === 'postmatch' && (
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
                onPress={handleSubmitResult}
                style={{ marginBottom: insets.bottom + 20 }}
              />
            </ScrollView>
          )}
        </View>

        {/* MODALS */}
        <Modal
          visible={showProposalModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProposalModal(false)}
        >
          <View className="flex-1 bg-black/80 justify-end">
            <View
              className="bg-modal rounded-t-3xl border-t-2 border-border overflow-hidden"
              style={{ paddingBottom: Math.max(insets.bottom, 20) }}
            >
              <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                <View className="flex-row items-center gap-3">
                  <View className="bg-warning/20 p-2 rounded-lg">
                    <Calendar size={24} color="#EAB308" strokeWidth={2} />
                  </View>
                  <Text className="text-foreground font-title text-xl">Proponer Fecha</Text>
                </View>
                <TouchableOpacity onPress={() => setShowProposalModal(false)} className="p-2 -mr-2">
                  <X size={24} color="#A1A1AA" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView className="p-6 gap-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Fechas */}
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                        <Text className="text-muted-foreground text-xs mb-2 ml-1">Fecha</Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="bg-card h-14 rounded-xl border-2 border-border px-4 flex-row items-center justify-between active:border-primary"
                        >
                            <Text className="text-foreground">{propDate.toLocaleDateString('es-AR')}</Text>
                            <Calendar size={20} color="#A1A1AA" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                        <Text className="text-muted-foreground text-xs mb-2 ml-1">Hora</Text>
                        <TouchableOpacity
                            onPress={() => setShowTimePicker(true)}
                            className="bg-card h-14 rounded-xl border-2 border-border px-4 flex-row items-center justify-between active:border-primary"
                        >
                            <Text className="text-foreground">
                            {propTime.toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            })}
                            </Text>
                            <Clock size={20} color="#A1A1AA" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tipo */}
                <View className="mb-4">
                    <Text className="text-muted-foreground text-xs mb-2 ml-1">Tipo de Partido</Text>
                    <View className="flex-row bg-card rounded-xl border-2 border-border p-1">
                        <TouchableOpacity onPress={() => setPropIsFriendly(false)} className={`flex-1 py-3 rounded-lg items-center ${!propIsFriendly ? 'bg-primary' : ''}`}>
                            <Text className={`font-bold text-xs ${!propIsFriendly ? 'text-background' : 'text-muted-foreground'}`}>Por los Puntos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setPropIsFriendly(true)} className={`flex-1 py-3 rounded-lg items-center ${propIsFriendly ? 'bg-primary' : ''}`}>
                            <Text className={`font-bold text-xs ${propIsFriendly ? 'text-background' : 'text-muted-foreground'}`}>Amistoso</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Modalidad y Duración */}
                <View className="flex-row gap-4 mb-6">
                    <View className="flex-1">
                        <Text className="text-muted-foreground text-xs mb-2 ml-1">Modalidad</Text>
                        <TouchableOpacity onPress={() => setPropModality(m => m === 'Fútbol 5' ? 'Fútbol 7' : m === 'Fútbol 7' ? 'Fútbol 11' : 'Fútbol 5')} className="bg-card h-14 rounded-xl border-2 border-border px-4 flex-row items-center justify-between">
                            <Text className="text-foreground">{propModality}</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                        <Text className="text-muted-foreground text-xs mb-2 ml-1">Duración</Text>
                        <TouchableOpacity onPress={() => setPropDuration(d => d === '60 min' ? '90 min' : '60 min')} className="bg-card h-14 rounded-xl border-2 border-border px-4 flex-row items-center justify-between">
                            <Text className="text-foreground">{propDuration}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="gap-3">
                  <Button title="Enviar Propuesta" variant="primary" onPress={handleSendProposal} />
                  <Button
                    title="Cancelar"
                    variant="secondary"
                    onPress={() => setShowProposalModal(false)}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal de EDITAR RESERVA */}
        <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
            <View className="flex-1 bg-black/80 justify-end">
                <View className="bg-modal rounded-t-3xl border-t-2 border-border overflow-hidden" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                        <Text className="text-foreground font-title text-xl">Gestionar Reserva</Text>
                        <TouchableOpacity onPress={() => setShowEditModal(false)} className="p-2 -mr-2"><X size={24} color="#A1A1AA" /></TouchableOpacity>
                    </View>
                    <ScrollView className="p-6 gap-4" contentContainerStyle={{ paddingBottom: 40 }}>
                        <Text className="text-muted-foreground text-sm mb-2 leading-5">Confirma la sede y hora definitivas. Esto marcará el partido como Reservado/Confirmado.</Text>
                        
                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Fecha Acordada</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-card h-14 rounded-xl border-2 border-border px-4 flex-row items-center justify-between">
                                    <Text className="text-foreground">{propDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Hora</Text>
                                <TouchableOpacity onPress={() => setShowTimePicker(true)} className="bg-card h-14 rounded-xl border-2 border-border px-4 flex-row items-center justify-between">
                                    <Text className="text-foreground">{propTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-muted-foreground text-xs mb-2 ml-1">Sede (Ubicación de Cancha)</Text>
                            <TextInput 
                                className="bg-card h-14 rounded-xl border-2 border-border px-4 text-foreground focus:border-primary"
                                placeholder="Ej: Canchas Norte..."
                                placeholderTextColor="#6B7280"
                                value={propVenue}
                                onChangeText={setPropVenue}
                            />
                        </View>

                        <Button title="Confirmar Reserva" variant="primary" onPress={handleSaveDetails} />
                    </ScrollView>
                </View>
            </View>
        </Modal>

        {/* Date/Time Pickers Compartidos */}
        {(showDatePicker || showTimePicker) &&
            (Platform.OS === 'ios' ? (
            <View className="absolute bottom-0 w-full bg-card p-4 rounded-t-2xl z-50 border-t border-border shadow-lg">
                <DateTimePicker
                value={showDatePicker ? propDate : propTime}
                mode={showDatePicker ? 'date' : 'time'}
                display="spinner"
                onChange={(e, d) => {
                    if (d) {
                      if (showDatePicker) setPropDate(d);
                      else setPropTime(d);
                    }
                }}
                themeVariant="dark"
                />
                <Button
                title="Listo"
                variant="primary"
                onPress={() => {
                    setShowDatePicker(false)
                    setShowTimePicker(false)
                }}
                className="mt-4"
                />
            </View>
            ) : (
            <DateTimePicker
                value={showDatePicker ? propDate : propTime}
                mode={showDatePicker ? 'date' : 'time'}
                onChange={(e, d) => {
                setShowDatePicker(false)
                setShowTimePicker(false)
                if (d) {
                  if (showDatePicker) setPropDate(d);
                  else setPropTime(d);
                }
                }}
            />
            ))}

        {/* WO Modal */}
        <Modal visible={showWOModal} animationType="slide">
          <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center justify-between p-4 border-b-2 border-border">
              <Text className="text-foreground font-title text-xl">Validar W.O.</Text>
              <TouchableOpacity onPress={() => setShowWOModal(false)} className="p-2 -mr-2">
                <X size={24} color="#FBFBFB" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View className="p-6 flex-1">
              <View className="flex-1 bg-secondary rounded-2xl border-2 border-dashed border-border items-center justify-center mb-6 overflow-hidden relative">
                <Camera size={64} color="#6B7280" strokeWidth={2} />
                <Text className="text-muted-foreground mt-4 font-medium">Vista Previa Cámara</Text>
                <View className="absolute top-4 bg-black/60 px-4 py-2 rounded-full">
                  <Text className="text-white text-xs font-medium">
                    Asegúrate que se vea la cancha
                  </Text>
                </View>
              </View>

              <View className="gap-4 mb-6">
                <View className="flex-row items-center gap-3">
                  <Circle size={16} color="#6B7280" strokeWidth={2} />
                  <Text className="text-muted-foreground">Selfie con al menos 2 compañeros</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Circle size={16} color="#6B7280" strokeWidth={2} />
                  <Text className="text-muted-foreground">Cancha visible de fondo</Text>
                </View>
              </View>

              <Button
                title="TOMAR FOTO"
                variant="primary"
                onPress={() => showToast('Función no implementada', 'info')}
                className="h-14"
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  )
}

// --- COMPONENTS ---

const DetailRow = ({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) => (
  <View className="flex-row justify-between items-center py-2.5 border-b border-border/30">
    <Text className="text-muted-foreground">{label}</Text>
    <Text className={`font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</Text>
  </View>
)

const ChatMessageItem = ({
  item,
  myTeamId,
  myTeam,
  rivalTeam,
  canManage,
  onAccept,
  onReject,
  onCancel,
}: {
  item: ChatMessage
  myTeamId: string
  myTeam: any
  rivalTeam: any
  canManage: boolean
  onAccept: (msg: ChatMessage) => void
  onReject: (msg: ChatMessage) => void
  onCancel: (msg: ChatMessage) => void
}) => {
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