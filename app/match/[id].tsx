import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth.service'
import { ChatMessage, chatService } from '@/services/chat.service'
import { MatchDetail, matchesService } from '@/services/matches.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Stack, useLocalSearchParams } from 'expo-router'
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Send,
  X,
} from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
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

// Tipos de Estado Visual
type MatchState = 'previa' | 'checkin' | 'postmatch'
type TabState = 'details' | 'lineup' | 'chat'

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const { showToast } = useToast()
  const flatListRef = useRef<FlatList>(null)

  // --- GLOBAL STATE ---
  const [matchState, setMatchState] = useState<MatchState>('previa')
  const [activeTab, setActiveTab] = useState<TabState>('chat')
  const [loading, setLoading] = useState(true)

  // --- DATA STATE ---
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [myTeamId, setMyTeamId] = useState<string>('')
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; logo_url?: string } | null>(null)
  const [rivalTeam, setRivalTeam] = useState<{
    id: string
    name: string
    logo_url?: string
  } | null>(null)
  const [teamMembersA, setTeamMembersA] = useState<TeamMemberDetail[]>([])

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [propDate, setPropDate] = useState(new Date())
  const [propTime, setPropTime] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // --- CHECKIN STATE ---
  const [gpsDistance, setGpsDistance] = useState(150)
  const [checkedIn, setCheckedIn] = useState(false)
  const [showWOModal, setShowWOModal] = useState(false)

  // --- POST MATCH STATE ---
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
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // Lógica de Estado Automática
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

      // Si faltan menos de 2 horas (o ya pasó), activamos Check-in
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
      const matchRes = await matchesService.getMatchById(matchId)
      if (matchRes.data) {
        setMatch(matchRes.data)

        const teamARes = await teamsService.getTeamMembers(matchRes.data.team_a.id)
        const session = await authService.getSession()
        const userId = session.data?.user?.id

        if (userId && teamARes.data) {
          const isTeamA = teamARes.data.some((m) => m.user_id === userId)

          if (isTeamA) {
            setMyTeamId(matchRes.data.team_a.id)
            setMyTeam(matchRes.data.team_a)
            setRivalTeam(matchRes.data.team_b)
            setTeamMembersA(teamARes.data)
          } else {
            setMyTeamId(matchRes.data.team_b.id)
            setMyTeam(matchRes.data.team_b)
            setRivalTeam(matchRes.data.team_a)
            const teamBRes = await teamsService.getTeamMembers(matchRes.data.team_b.id)
            if (teamBRes.data) setTeamMembersA(teamBRes.data)
          }
        }
      }

      const chatRes = await chatService.getMessages(matchId)
      if (chatRes.data) setMessages(chatRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- ACTIONS ---
  async function handleSendText() {
    if (!inputText.trim() || !myTeamId || !match) return
    const text = inputText.trim()
    setInputText('')
    await chatService.sendText(match.id, myTeamId, text)
  }

  async function handleSendProposal() {
    if (!myTeamId || !match) return
    const dateStr = propDate.toISOString().split('T')[0]
    const timeStr = propTime.toTimeString().slice(0, 5)
    setShowProposalModal(false)
    await chatService.sendProposal(match.id, myTeamId, dateStr, timeStr)
    showToast('Propuesta enviada', 'success')
  }

  async function handleAcceptProposal(msg: ChatMessage) {
    if (!match || !msg.proposal_data) return
    await chatService.respondProposal(msg.id, 'ACCEPTED')
    const isoString = `${msg.proposal_data.date}T${msg.proposal_data.time}:00.000Z`
    const res = await matchesService.updateMatch(match.id, {
      scheduled_at: isoString,
      status: 'CONFIRMED',
    })
    if (res.success) {
      showToast('¡Partido Confirmado!', 'success')
      initializeMatch(match.id)
    }
  }

  async function handleRejectProposal(msg: ChatMessage) {
    await chatService.respondProposal(msg.id, 'REJECTED')
    initializeMatch(match!.id)
  }

  async function handleSubmitResult() {
    showToast('Resultado enviado', 'success')
    if (match) setMatch({ ...match, status: 'FINISHED' })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (loading)
    return (
      <View className='flex-1 bg-background items-center justify-center'>
        <ActivityIndicator size='large' color='#39FF14' />
      </View>
    )
  if (!match || !myTeam || !rivalTeam)
    return (
      <View className='flex-1 bg-background items-center justify-center'>
        <Text className='text-white'>Error cargando partido</Text>
      </View>
    )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#121217' }}
    >
      {/* USAMOS STACK.SCREEN PARA LA CABECERA NATIVA 
         (Soluciona bugs de navegación y se parece a ManageTeam) 
      */}
      <Stack.Screen
        options={{
          title:
            matchState === 'previa'
              ? 'Mi Partido'
              : matchState === 'checkin'
                ? 'En Curso'
                : 'Finalizado',
          headerShown: true,
          headerStyle: { backgroundColor: '#121217' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                setMatchState((prev) =>
                  prev === 'previa' ? 'checkin' : prev === 'checkin' ? 'postmatch' : 'previa',
                )
              }
              className='bg-secondary/30 p-1.5 rounded-md'
            >
              <Clock size={18} color='#9CA3AF' />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={{ flex: 1 }}>
        {matchState === 'previa' && (
          <View className='flex-1'>
            {/* Match Header */}
            <View className='bg-card m-4 rounded-xl border border-border overflow-hidden'>
              <View className='bg-primary/5 p-4 flex-row items-center justify-between'>
                <View className='items-center gap-1 w-1/3'>
                  <Avatar uri={myTeam.logo_url} fallback='shield' size={48} />
                  <Text className='text-text-main font-bold text-xs text-center' numberOfLines={1}>
                    {myTeam.name}
                  </Text>
                </View>

                <View className='items-center'>
                  <Text className='text-3xl font-title text-primary tracking-widest'>
                    {match.scheduled_at ? formatTime(match.scheduled_at) : '--:--'}
                  </Text>
                  <Text className='text-text-muted text-[10px] uppercase font-bold tracking-wider'>
                    HORA
                  </Text>
                </View>

                <View className='items-center gap-1 w-1/3'>
                  <Avatar uri={rivalTeam.logo_url} fallback='shield' size={48} />
                  <Text className='text-text-main font-bold text-xs text-center' numberOfLines={1}>
                    {rivalTeam.name}
                  </Text>
                </View>
              </View>

              <View className='p-2.5 bg-card border-t border-border flex-row items-center justify-center gap-2'>
                <MapPin size={12} color='#39FF14' />
                <Text className='text-text-muted text-xs font-medium'>
                  {match.venue?.name || 'Sede por definir'}
                </Text>
              </View>
            </View>

            {/* Tabs */}
            <View className='flex-row mx-4 bg-secondary p-1 rounded-xl mb-2'>
              {(['chat', 'lineup', 'details'] as TabState[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? 'bg-card border border-border shadow-sm' : ''}`}
                >
                  <Text
                    className={`text-xs font-bold uppercase ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}
                  >
                    {tab === 'lineup' ? 'Alineación' : tab === 'details' ? 'Detalles' : 'Chat'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            <View className='flex-1 bg-background'>
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
                        onAccept={handleAcceptProposal}
                        onReject={handleRejectProposal}
                      />
                    )}
                    inverted
                    contentContainerStyle={{ padding: 16 }}
                  />
                  {/* Input Chat con Inset Bottom para evitar barra Samsung */}
                  <View
                    className='p-3 bg-card border-t border-border flex-row items-end gap-3'
                    style={{ paddingBottom: Math.max(insets.bottom, 16) }}
                  >
                    <TouchableOpacity
                      onPress={() => setShowProposalModal(true)}
                      className='h-12 w-10 items-center justify-center'
                    >
                      <Calendar size={24} color='#EAB308' />
                    </TouchableOpacity>
                    <TextInput
                      className='flex-1 bg-background text-text-main min-h-[48px] max-h-[100px] px-4 py-3 rounded-2xl border border-border font-body text-base'
                      placeholder='Mensaje...'
                      placeholderTextColor='#6B7280'
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                    />
                    <TouchableOpacity
                      onPress={handleSendText}
                      className='h-12 w-12 bg-primary items-center justify-center rounded-full'
                    >
                      <Send size={20} color='#000' />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {activeTab === 'details' && (
                <ScrollView className='p-4' contentContainerStyle={{ paddingBottom: 40 }}>
                  <View className='bg-card rounded-xl border border-border p-4 gap-4'>
                    <DetailRow label='Modalidad' value='Fútbol 5' />
                    <DetailRow label='Duración' value='60 minutos' />
                    <DetailRow label='Árbitro' value='Sin árbitro' />
                    <DetailRow label='Costo' value='$0 (Amistoso)' highlight />
                  </View>

                  <View className='bg-card rounded-xl border border-border p-4 mt-4'>
                    <Text className='text-text-main font-bold mb-3'>Estado</Text>
                    <View className='flex-row items-center gap-3'>
                      <CheckCircle2
                        size={20}
                        color={match.status === 'CONFIRMED' ? '#39FF14' : '#6B7280'}
                      />
                      <View className='flex-1'>
                        <Text className='text-text-main font-bold'>Reserva de Cancha</Text>
                        <Text className='text-text-muted text-xs'>
                          {match.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente de acuerdo'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              )}

              {activeTab === 'lineup' && (
                <ScrollView className='p-4' contentContainerStyle={{ paddingBottom: 40 }}>
                  <View className='bg-card rounded-xl border border-border p-4'>
                    <View className='flex-row justify-between mb-4 border-b border-border pb-2'>
                      <Text className='text-text-main font-bold'>Mi Plantel</Text>
                      <Text className='text-primary text-xs font-bold'>
                        {teamMembersA.length} Citados
                      </Text>
                    </View>
                    {teamMembersA.map((member) => (
                      <View
                        key={member.user_id}
                        className='flex-row items-center justify-between py-2 border-b border-border/50 last:border-0'
                      >
                        <View className='flex-row items-center gap-3'>
                          <Avatar
                            uri={member.profile?.avatar_url}
                            fallback='user'
                            size={32}
                            shape='circle'
                          />
                          <Text className='text-text-main'>
                            {member.profile?.full_name || 'Jugador'}
                          </Text>
                        </View>
                        <View className='flex-row items-center gap-1 bg-primary/10 px-2 py-1 rounded'>
                          <Check size={12} color='#39FF14' />
                          <Text className='text-primary text-[10px] font-bold'>CONFIRMADO</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {matchState === 'checkin' && (
          <View className='flex-1 p-6 items-center justify-center'>
            <View
              className={`w-40 h-40 rounded-full items-center justify-center mb-6 border-4 ${gpsDistance <= 100 ? 'bg-primary border-primary/30 shadow-lg shadow-primary/20' : 'bg-card border-border'}`}
            >
              {checkedIn ? (
                <Check size={64} color='#000' />
              ) : (
                <Navigation size={64} color={gpsDistance <= 100 ? '#000' : '#6B7280'} />
              )}
            </View>

            <Text className='text-text-main text-2xl font-bold text-center mb-2'>
              {checkedIn ? '¡Ya estás listo!' : `A ${gpsDistance}m de la cancha`}
            </Text>
            <Text className='text-text-muted text-center mb-10 px-4 leading-5'>
              {checkedIn
                ? 'Esperando al resto del equipo. El partido comenzará pronto.'
                : gpsDistance <= 100
                  ? 'Estás en zona. Confirma tu presencia para habilitar el partido.'
                  : 'Acércate más a la sede para habilitar el Check-in.'}
            </Text>

            {!checkedIn && (
              <Button
                title='HACER CHECK-IN'
                onPress={() => setCheckedIn(true)}
                disabled={gpsDistance > 100}
                className='w-full h-14 mb-4'
                variant='primary'
              />
            )}

            <View className='flex-row gap-4 mb-8 opacity-40'>
              <Button
                title='-50m'
                variant='outline'
                onPress={() => setGpsDistance((d) => Math.max(0, d - 50))}
              />
              <Button
                title='+50m'
                variant='outline'
                onPress={() => setGpsDistance((d) => d + 50)}
              />
            </View>

            {checkedIn && (
              <Button
                title='Terminar Partido (Demo)'
                variant='secondary'
                onPress={() => setMatchState('postmatch')}
                className='w-full'
              />
            )}

            <TouchableOpacity
              className='mt-4 flex-row items-center gap-2 opacity-60 p-4'
              onPress={() => setShowWOModal(true)}
            >
              <AlertTriangle size={16} color='#EF4444' />
              <Text className='text-error text-xs font-bold uppercase'>
                Reportar Ausencia Rival (W.O.)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {matchState === 'postmatch' && (
          <ScrollView className='flex-1 p-4' contentContainerStyle={{ paddingBottom: 40 }}>
            <View className='bg-card rounded-xl border border-border p-6 mb-6 items-center'>
              <Text className='text-text-main text-lg font-bold mb-6'>Resultado Final</Text>

              <View className='flex-row items-center justify-between w-full'>
                <View className='items-center w-1/3 gap-2'>
                  <Avatar uri={myTeam.logo_url} fallback='shield' size={64} />
                  <Text className='text-text-main font-bold text-center text-xs' numberOfLines={2}>
                    {myTeam.name}
                  </Text>
                </View>

                <View className='flex-row items-center gap-3'>
                  <View className='items-center gap-2'>
                    <TouchableOpacity
                      onPress={() => setHomeScore((s) => Math.min(s + 1, 99))}
                      className='bg-secondary p-1 rounded border border-border'
                    >
                      <Plus size={16} color='#fff' />
                    </TouchableOpacity>
                    <Text className='text-5xl font-title text-text-main'>{homeScore}</Text>
                    <TouchableOpacity
                      onPress={() => setHomeScore((s) => Math.max(s - 1, 0))}
                      className='bg-secondary p-1 rounded border border-border'
                    >
                      <Minus size={16} color='#fff' />
                    </TouchableOpacity>
                  </View>
                  <Text className='text-text-muted text-2xl mb-8'>-</Text>
                  <View className='items-center gap-2'>
                    <TouchableOpacity
                      onPress={() => setAwayScore((s) => Math.min(s + 1, 99))}
                      className='bg-secondary p-1 rounded border border-border'
                    >
                      <Plus size={16} color='#fff' />
                    </TouchableOpacity>
                    <Text className='text-5xl font-title text-text-main'>{awayScore}</Text>
                    <TouchableOpacity
                      onPress={() => setAwayScore((s) => Math.max(s - 1, 0))}
                      className='bg-secondary p-1 rounded border border-border'
                    >
                      <Minus size={16} color='#fff' />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className='items-center w-1/3 gap-2'>
                  <Avatar uri={rivalTeam.logo_url} fallback='shield' size={64} />
                  <Text className='text-text-main font-bold text-center text-xs' numberOfLines={2}>
                    {rivalTeam.name}
                  </Text>
                </View>
              </View>
            </View>

            <View className='bg-card rounded-xl border border-border p-4 mb-8'>
              <Text className='text-text-main font-bold mb-4'>⭐ Figura del Partido</Text>
              <View className='flex-row flex-wrap gap-3'>
                {teamMembersA.map((member) => (
                  <TouchableOpacity
                    key={member.user_id}
                    onPress={() => setSelectedMVP(member.user_id)}
                    className={`items-center w-[22%] p-2 rounded-xl border ${selectedMVP === member.user_id ? 'bg-primary/20 border-primary' : 'bg-secondary border-transparent'}`}
                  >
                    <Avatar
                      uri={member.profile?.avatar_url}
                      fallback='user'
                      size={40}
                      shape='circle'
                    />
                    <Text className='text-text-main text-[10px] mt-1 text-center' numberOfLines={1}>
                      {member.profile?.full_name?.split(' ')[0] || 'Jugador'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title='ENVIAR RESULTADO'
              className='w-full h-14'
              variant='primary'
              onPress={handleSubmitResult}
              style={{ marginBottom: insets.bottom + 20 }}
            />
          </ScrollView>
        )}
      </View>

      {/* --- MODALES --- */}

      {/* Proposal Modal */}
      <Modal
        visible={showProposalModal}
        transparent
        animationType='slide'
        onRequestClose={() => setShowProposalModal(false)}
      >
        <View className='flex-1 bg-black/80 justify-end'>
          <View
            className='bg-modal rounded-t-3xl border-t border-border p-6 gap-4'
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <Text className='text-text-main font-title text-xl mb-2'>Proponer Fecha</Text>

            <Text className='text-text-muted text-xs ml-1'>Fecha</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className='bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between'
            >
              <Text className='text-text-main'>{propDate.toLocaleDateString()}</Text>
              <Calendar size={20} color='#9CA3AF' />
            </TouchableOpacity>

            <Text className='text-text-muted text-xs ml-1'>Hora</Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className='bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between'
            >
              <Text className='text-text-main'>
                {propTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Clock size={20} color='#9CA3AF' />
            </TouchableOpacity>

            <Button title='Enviar Propuesta' onPress={handleSendProposal} className='mt-4' />
            <Button title='Cancelar' variant='ghost' onPress={() => setShowProposalModal(false)} />

            {/* Pickers Logic */}
            {(showDatePicker || showTimePicker) &&
              (Platform.OS === 'ios' ? (
                <View className='bg-card mt-4 rounded-xl p-4'>
                  <DateTimePicker
                    value={showDatePicker ? propDate : propTime}
                    mode={showDatePicker ? 'date' : 'time'}
                    display='spinner'
                    onChange={(e, d) => {
                      if (d) showDatePicker ? setPropDate(d) : setPropTime(d)
                    }}
                    themeVariant='dark'
                  />
                  <Button
                    title='Listo'
                    onPress={() => {
                      setShowDatePicker(false)
                      setShowTimePicker(false)
                    }}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={showDatePicker ? propDate : propTime}
                  mode={showDatePicker ? 'date' : 'time'}
                  onChange={(e, d) => {
                    setShowDatePicker(false)
                    setShowTimePicker(false)
                    if (d) showDatePicker ? setPropDate(d) : setPropTime(d)
                  }}
                />
              ))}
          </View>
        </View>
      </Modal>

      {/* WO Modal */}
      <Modal visible={showWOModal} animationType='slide'>
        <View className='flex-1 bg-background' style={{ paddingTop: insets.top }}>
          <View className='flex-row items-center justify-between p-4 border-b border-border'>
            <Text className='text-text-main font-title text-xl'>Validar W.O.</Text>
            <TouchableOpacity onPress={() => setShowWOModal(false)}>
              <X size={24} color='#fff' />
            </TouchableOpacity>
          </View>
          <View className='p-6 flex-1'>
            <View className='flex-1 bg-secondary rounded-xl border-2 border-dashed border-border items-center justify-center mb-6 overflow-hidden relative'>
              <Camera size={64} color='#6B7280' />
              <Text className='text-text-muted mt-4'>Vista Previa Cámara</Text>
              <View className='absolute top-4 bg-black/60 px-4 py-2 rounded-full'>
                <Text className='text-white text-xs'>Asegúrate que se vea la cancha</Text>
              </View>
            </View>
            <View className='gap-4'>
              <View className='flex-row items-center gap-3'>
                <Circle size={16} color='#6B7280' />
                <Text className='text-text-muted'>Selfie con al menos 2 compañeros</Text>
              </View>
              <View className='flex-row items-center gap-3'>
                <Circle size={16} color='#6B7280' />
                <Text className='text-text-muted'>Cancha visible de fondo</Text>
              </View>
              <Button
                title='TOMAR FOTO'
                icon={<Camera size={20} color='#000' />}
                className='mt-4 h-14'
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

// --- SMALL COMPONENTS ---
const DetailRow = ({ label, value, highlight }: any) => (
  <View className='flex-row justify-between items-center py-2 border-b border-border/30 last:border-0'>
    <Text className='text-text-muted'>{label}</Text>
    <Text className={`font-bold ${highlight ? 'text-primary' : 'text-text-main'}`}>{value}</Text>
  </View>
)

const ChatMessageItem = ({ item, myTeamId, myTeam, rivalTeam, onAccept, onReject }: any) => {
  const isMe = item.sender_team_id === myTeamId
  const sender = isMe ? myTeam : rivalTeam
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  if (item.type === 'PROPOSAL') {
    return (
      <View className={`my-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
        {!isMe && (
          <View className='mr-2 justify-end pb-1'>
            <Avatar uri={sender?.logo_url} fallback='shield' size={32} />
          </View>
        )}
        <View
          className={`w-[80%] rounded-xl border overflow-hidden ${isMe ? 'bg-card border-border' : 'bg-primary/10 border-primary/30'}`}
        >
          <View
            className={`px-3 py-2 flex-row items-center gap-2 ${isMe ? 'bg-secondary' : 'bg-primary/20'}`}
          >
            <Calendar size={14} color={isMe ? '#9CA3AF' : '#39FF14'} />
            <Text
              className={`text-[10px] font-bold uppercase ${isMe ? 'text-text-muted' : 'text-primary'}`}
            >
              Propuesta
            </Text>
          </View>
          <View className='p-3'>
            <Text className='text-text-main text-lg font-bold mb-1'>
              {new Date(item.proposal_data.date + 'T00:00:00').toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
              })}
            </Text>
            <Text className='text-text-main text-lg mb-3'>{item.proposal_data.time} hs</Text>

            {item.status === 'SENT' && !isMe && (
              <View className='flex-row gap-2'>
                <TouchableOpacity
                  onPress={() => onReject(item)}
                  className='flex-1 bg-error/20 py-2 rounded items-center border border-error/30'
                >
                  <Text className='text-error font-bold text-xs'>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onAccept(item)}
                  className='flex-1 bg-primary py-2 rounded items-center'
                >
                  <Text className='text-black font-bold text-xs'>Aceptar</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'ACCEPTED' && (
              <Text className='text-primary font-bold text-xs text-center mt-2'>✅ CONFIRMADO</Text>
            )}
            {item.status === 'REJECTED' && (
              <Text className='text-error font-bold text-xs text-center mt-2'>❌ RECHAZADO</Text>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className={`my-1 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className='mr-2 justify-end pb-1'>
          <Avatar uri={sender?.logo_url} fallback='shield' size={32} />
        </View>
      )}
      <View
        className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-card rounded-tr-sm border border-border' : 'bg-primary/20 rounded-tl-sm border border-primary/30'}`}
      >
        {!isMe && <Text className='text-primary text-[10px] font-bold mb-1'>{sender?.name}</Text>}
        <Text className='text-text-main text-base leading-5'>{item.content}</Text>
        <Text className='text-text-muted text-[10px] text-right mt-1 opacity-70'>
          {formatTime(item.created_at)}
        </Text>
      </View>
    </View>
  )
}
