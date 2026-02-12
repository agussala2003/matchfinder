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
  Circle,
  Clock,
  X,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
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

// Components
import { ChatSection } from '@/components/match/ChatSection'
import { CheckinSection } from '@/components/match/CheckinSection'
import { DetailsView } from '@/components/match/DetailsView'
import { LineupView } from '@/components/match/LineupView'
import { MatchHeader } from '@/components/match/MatchHeader'
import { MatchTabs } from '@/components/match/MatchTabs'
import { PostmatchSection } from '@/components/match/PostmatchSection'

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
  const flatListRef = useRef<FlatList | null>(null)

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

  const initializeMatch = useCallback(async (matchId: string) => {
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
        showToast('Partido no encontrado', 'error')
        setLoading(false)
        return
      }
      setMatch(matchRes.data)

      if (
        matchRes.data?.team_a?.id &&
        matchRes.data?.team_b?.id
      ) {
        const [resA, resB] = await Promise.all([
          teamsService.getTeamMembers(matchRes.data.team_a.id),
          teamsService.getTeamMembers(matchRes.data.team_b.id),
        ])

        const memberA = resA.data?.find((m) => m.user_id === userId)
        const memberB = resB.data?.find((m) => m.user_id === userId)

        // Check if user is admin/sub-admin of either team for message permissions
        const isTeamAAdmin = !!(memberA && (memberA.role === UserRole.ADMIN || memberA.role === UserRole.SUB_ADMIN))
        const isTeamBAdmin = !!(memberB && (memberB.role === UserRole.ADMIN || memberB.role === UserRole.SUB_ADMIN))
        const canUserManage = isTeamAAdmin || isTeamBAdmin

        if (memberA) {
          setMyTeamId(matchRes.data.team_a.id)
          setMyTeam(matchRes.data.team_a)
          setRivalTeam(matchRes.data.team_b)
          setTeamMembers(resA.data || [])
          setCanManage(canUserManage)
        } else if (memberB) {
          setMyTeamId(matchRes.data.team_b.id)
          setMyTeam(matchRes.data.team_b)
          setRivalTeam(matchRes.data.team_a)
          setTeamMembers(resB.data || [])
          setCanManage(canUserManage)
        } else {
          showToast('No tienes acceso a este partido', 'error')
          setLoading(false)
          return
        }

        const bothTeamMembers: CitedPlayer[] = [
          ...(resA.data || []).map((player) => ({
            ...player,
            teamName: matchRes.data?.team_a?.name || 'Equipo A',
            isBothTeams: false,
          })),
          ...(resB.data || []).map((player) => ({
            ...player,
            teamName: matchRes.data?.team_b?.name || 'Equipo B',
            isBothTeams: false,
          })),
        ]
        setCitedPlayers(bothTeamMembers)
      }

      const chatRes = await chatService.getMessages(matchId)
      if (chatRes.data) setMessages(chatRes.data)
    } catch (e) {
      console.error('Error initializing match:', e)
      showToast('Error al cargar el partido', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

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
  }, [id, initializeMatch])

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
              <MatchHeader 
                match={match}
                myTeam={myTeam}
                rivalTeam={rivalTeam}
                formatTime={formatTime}
              />

              <MatchTabs 
                activeTab={activeTab}
                onTabPress={setActiveTab}
              />

              {/* Tab Content */}
              <View className="flex-1">
                {activeTab === 'chat' && (
                  <ChatSection
                    messages={messages}
                    flatListRef={flatListRef}
                    myTeamId={myTeamId}
                    myTeam={myTeam}
                    rivalTeam={rivalTeam}
                    canManage={canManage}
                    inputText={inputText}
                    setInputText={setInputText}
                    insets={insets}
                    onSendText={handleSendText}
                    onAcceptProposal={handleAcceptProposal}
                    onRejectProposal={handleRejectProposal}
                    onCancelProposal={handleCancelProposal}
                    onShowProposalModal={() => setShowProposalModal(true)}
                  />
                )}

                {activeTab === 'details' && (
                  <DetailsView
                    match={match}
                    canManage={canManage}
                    canCancelMatch={canCancelMatch}
                    onEditMatch={() => setShowEditModal(true)}
                    onCancelMatch={handleCancelMatch}
                  />
                )}

                {activeTab === 'lineup' && (
                  <LineupView citedPlayers={citedPlayers} />
                )}
              </View>
            </View>
          )}

          {/* CHECKIN STATE */}
          {matchState === 'checkin' && (
            <CheckinSection
              gpsDistance={gpsDistance}
              setGpsDistance={setGpsDistance}
              checkedIn={checkedIn}
              setCheckedIn={setCheckedIn}
              canManage={canManage}
              setMatchState={setMatchState}
              setShowWOModal={setShowWOModal}
            />
          )}

          {/* POSTMATCH STATE */}
          {matchState === 'postmatch' && (
            <PostmatchSection
              myTeam={myTeam}
              rivalTeam={rivalTeam}
              teamMembers={teamMembers}
              homeScore={homeScore}
              setHomeScore={setHomeScore}
              awayScore={awayScore}
              setAwayScore={setAwayScore}
              selectedMVP={selectedMVP}
              setSelectedMVP={setSelectedMVP}
              onSubmitResult={handleSubmitResult}
              insets={insets}
            />
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