import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { chatService } from '@/services/chat.service'
import { storageService } from '@/services/storage.service'
import DateTimePicker from '@react-native-community/datetimepicker'
import { differenceInHours, format } from 'date-fns'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import {
  AlertTriangle,
  Camera,
  Circle,
  X
} from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
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
import { EditMatchModal } from '@/components/match/modals/EditMatchModal'
import { ProposalModal } from '@/components/match/modals/ProposalModal'
import { PostmatchSection } from '@/components/match/PostmatchSection'
import { useMatchDetails } from '@/hooks/useMatchDetails'

type MatchState = 'previa' | 'checkin' | 'postmatch'
type TabState = 'details' | 'lineup' | 'chat'

export default function MatchScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const { showToast } = useToast()
  const flatListRef = useRef<FlatList | null>(null)

  const {
    match,
    loading,
    myTeam,
    myTeamId,
    rivalTeam,
    canManage,
    messages,
    citedPlayers,
    teamMembers,
    sendProposal,
    acceptProposal,
    rejectProposal,
    cancelProposal,
    updateMatchDetails,
    cancelMatch,
    submitResult,
    claimWalkover,
    userId
  } = useMatchDetails(id as string)

  const [matchState, setMatchState] = useState<MatchState>('previa')
  const [activeTab, setActiveTab] = useState<TabState>('chat')
  const [inputText, setInputText] = useState('')

  // MODALS
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

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
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [selectedMVP, setSelectedMVP] = useState<string | null>(null)
  const [playerGoals, setPlayerGoals] = useState<Record<string, number>>({})

  // MATCH STATE LOGIC
  useEffect(() => {
    if (!match) return

    if (match.status === 'FINISHED') {
      setMatchState('postmatch')
      return
    }

    if (match.status === 'CONFIRMED' && match.scheduled_at) {
      const matchDate = new Date(match.scheduled_at)
      const now = new Date()
      const diffHours = differenceInHours(matchDate, now)

      if (diffHours < 2 && diffHours > -4) { // Active shortly before and during
        setMatchState('checkin')
      } else {
        setMatchState('previa')
      }
    } else {
      setMatchState('previa')
    }
  }, [match])

  // HANDLERS
  async function handleSendText() {
    if (!inputText.trim() || !myTeamId || !match) return
    if (!canManage) {
      showToast('Solo capitanes pueden enviar mensajes', 'error')
      return
    }
    const text = inputText.trim()
    setInputText('')
    const result = await chatService.sendText(match.id, myTeamId, text, userId)
    if (!result.success) {
      showToast('Error al enviar mensaje', 'error')
      setInputText(text)
    }
  }

  async function handleSendProposal() {
    const success = await sendProposal(propDate, propTime, propModality, propDuration, propIsFriendly, propVenue)
    if (success) setShowProposalModal(false)
  }

  async function handleSaveDetails() {
    const success = await updateMatchDetails(propDate, propTime, propVenue, propIsFriendly)
    if (success) setShowEditModal(false)
  }

  const handleTakeEvidence = async () => {
    if (!match || !myTeamId) return

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
      if (!permissionResult.granted) {
        showToast('Se requiere acceso a la cámara', 'error')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      })

      if (!result.canceled) {
        setUploadingEvidence(true)
        const uri = result.assets[0].uri
        const timestamp = new Date().getTime()
        const path = `${match.id}/${myTeamId}_${timestamp}.jpg`

        const publicUrl = await storageService.uploadImage(uri, 'match-evidence', path)

        if (publicUrl) {
          const success = await claimWalkover(publicUrl)
          if (success) setShowWOModal(false)
        } else {
          showToast('Error al subir imagen', 'error')
        }
      }
    } catch (e) {
      console.error(e)
      showToast('Error en el proceso de W.O.', 'error')
    } finally {
      setUploadingEvidence(false)
    }
  }

  const formatTime = (iso: string) => {
    return format(new Date(iso), 'HH:mm')
  }

  const canCancelMatchCheck = () => {
    if (!match?.scheduled_at || !canManage) return false
    const matchDate = new Date(match.scheduled_at)
    const now = new Date()
    const diffHours = differenceInHours(matchDate, now)
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
                    onAcceptProposal={acceptProposal}
                    onRejectProposal={rejectProposal}
                    onCancelProposal={cancelProposal}
                    onShowProposalModal={() => setShowProposalModal(true)}
                  />
                )}

                {activeTab === 'details' && (
                  <DetailsView
                    match={match}
                    canManage={canManage}
                    canCancelMatch={canCancelMatchCheck}
                    onEditMatch={() => setShowEditModal(true)}
                    onCancelMatch={cancelMatch}
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
              playerGoals={playerGoals}
              setPlayerGoals={setPlayerGoals}
              onSubmitResult={() => submitResult(homeScore, awayScore, playerGoals, selectedMVP)}
              insets={insets}
            />
          )}
        </View>

        {/* MODALS */}
        <ProposalModal
          visible={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          onSend={handleSendProposal}
          propDate={propDate}
          propTime={propTime}
          propModality={propModality}
          setPropModality={setPropModality}
          propDuration={propDuration}
          setPropDuration={setPropDuration}
          propIsFriendly={propIsFriendly}
          setPropIsFriendly={setPropIsFriendly}
          onShowDatePicker={() => setShowDatePicker(true)}
          onShowTimePicker={() => setShowTimePicker(true)}
        />

        <EditMatchModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onConfirm={handleSaveDetails}
          propDate={propDate}
          propTime={propTime}
          propVenue={propVenue}
          setPropVenue={setPropVenue}
          onShowDatePicker={() => setShowDatePicker(true)}
          onShowTimePicker={() => setShowTimePicker(true)}
        />

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
                title={uploadingEvidence ? 'SUBIENDO...' : 'TOMAR FOTO Y RECLAMAR'}
                variant="primary"
                onPress={handleTakeEvidence}
                disabled={uploadingEvidence}
                className="h-14"
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  )
}