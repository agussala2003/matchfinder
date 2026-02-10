import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Select } from '@/components/ui/Select'
import { authService } from '@/services/auth.service'
import { matchesService, MatchPreview } from '@/services/matches.service'
import { teamsService } from '@/services/teams.service'
import { Team } from '@/types/teams'
import { router, useFocusEffect } from 'expo-router'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Shield,
  Trophy,
  Zap,
} from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

export default function MatchScreen() {
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<MatchPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros mejorados
  const pendingMatches = matches.filter((m) => m.status === 'PENDING')
  const confirmedMatches = matches.filter((m) => m.status === 'CONFIRMED')
  const liveMatches = matches.filter((m) => m.status === 'LIVE')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

  useFocusEffect(
    useCallback(() => {
      loadData()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  React.useEffect(() => {
    if (currentTeam) fetchMatches(currentTeam.id)
  }, [currentTeam])

  async function loadData() {
    try {
      if (!refreshing) setLoading(true)
      const session = await authService.getSession()
      const userId = session.data?.user?.id
      if (!userId) return

      const teamsRes = await teamsService.getUserTeams(userId)

      if (teamsRes.data && teamsRes.data.length > 0) {
        setMyTeams(teamsRes.data)
        if (!currentTeam) {
          setCurrentTeam(teamsRes.data[0])
        } else {
          fetchMatches(currentTeam.id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function fetchMatches(teamId: string) {
    const res = await matchesService.getMyMatches(teamId)
    if (res.data) setMatches(res.data)
  }

  if (loading && !refreshing) {
    return (
      <View className='flex-1 bg-background items-center justify-center'>
        <ActivityIndicator size='large' color='#39FF14' />
      </View>
    )
  }

  if (!currentTeam) {
    return (
      <ScreenLayout withPadding>
        <View className='flex-1 items-center justify-center px-6'>
          <View className='w-20 h-20 bg-card rounded-2xl items-center justify-center mb-4 border border-border'>
            <Calendar size={40} color='#6B7280' strokeWidth={2} />
          </View>
          <Text className='text-text-main font-title text-xl text-center mb-2'>Sin Equipo</Text>
          <Text className='text-text-muted text-center mb-6 leading-5'>
            Crea un equipo para ver y gestionar tus partidos.
          </Text>
          <Button
            title='Crear Equipo'
            variant='primary'
            onPress={() => router.push('/create-team')}
          />
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout withPadding={false} className='bg-background'>
      <FlatList
        data={[]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadData()
            }}
            tintColor='#39FF14'
          />
        }
        renderItem={null}
        ListHeaderComponent={
          <View className='pb-20'>
            {/* Selector de Equipo */}
            {myTeams.length > 1 && (
              <View className='px-4 pt-4'>
                <Select
                  label='Viendo partidos de'
                  value={currentTeam.id}
                  options={myTeams.map((t) => ({ label: t.name, value: t.id }))}
                  onChange={(id) => {
                    const t = myTeams.find((team) => team.id === id)
                    if (t) setCurrentTeam(t)
                  }}
                />
              </View>
            )}

            <View className='p-4 gap-6'>
              {/* SECCIÓN 0: PARTIDOS EN VIVO */}
              {liveMatches.length > 0 && (
                <View>
                  <View className='flex-row items-center gap-2 mb-3'>
                    <Zap size={20} color='#EF4444' strokeWidth={2.5} />
                    <Text className='text-red-500 font-title text-xl'>En Vivo</Text>
                    <View className='bg-red-500/20 px-2.5 py-1 rounded-full border border-red-500/30'>
                      <Text className='text-red-500 text-xs font-bold'>{liveMatches.length}</Text>
                    </View>
                  </View>
                  <View className='gap-3'>
                    {liveMatches.map((match) => (
                      <MatchCard key={match.id} match={match} myTeamId={currentTeam.id} />
                    ))}
                  </View>
                </View>
              )}

              {/* SECCIÓN 1: POR AGENDAR */}
              <View>
                <View className='flex-row items-center gap-2 mb-3'>
                  <AlertCircle size={20} color='#EAB308' strokeWidth={2.5} />
                  <Text className='text-text-main font-title text-xl'>Por Agendar</Text>
                  {pendingMatches.length > 0 && (
                    <View className='bg-warning/20 px-2.5 py-1 rounded-full border border-warning/30'>
                      <Text className='text-warning text-xs font-bold'>
                        {pendingMatches.length}
                      </Text>
                    </View>
                  )}
                </View>

                {pendingMatches.length > 0 ? (
                  <View className='gap-3'>
                    {pendingMatches.map((match) => (
                      <MatchCard key={match.id} match={match} myTeamId={currentTeam.id} />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    icon={AlertCircle}
                    title='No hay partidos pendientes'
                    description='Los partidos por coordinar aparecerán aquí'
                  />
                )}
              </View>

              {/* SECCIÓN 2: CALENDARIO */}
              <View>
                <View className='flex-row items-center gap-2 mb-3'>
                  <Calendar size={20} color='#39FF14' strokeWidth={2.5} />
                  <Text className='text-text-main font-title text-xl'>Calendario</Text>
                  {confirmedMatches.length > 0 && (
                    <View className='bg-gray-800 px-2.5 py-0.5 rounded-full'>
                      <Text className='text-gray-400 text-xs font-bold'>
                        {confirmedMatches.length}
                      </Text>
                    </View>
                  )}
                </View>

                {confirmedMatches.length > 0 ? (
                  <View className='gap-3'>
                    {confirmedMatches.map((match) => (
                      <MatchCard key={match.id} match={match} myTeamId={currentTeam.id} />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title='Tu calendario está vacío'
                    description='Acepta desafíos para agendar partidos'
                  />
                )}
              </View>

              {/* SECCIÓN 3: FINALIZADOS */}
              {finishedMatches.length > 0 && (
                <View>
                  <View className='flex-row items-center gap-2 mb-3'>
                    <Trophy size={20} color='#9CA3AF' strokeWidth={2.5} />
                    <Text className='text-text-main font-title text-xl'>Finalizados</Text>
                    <View className='bg-gray-800 px-2.5 py-0.5 rounded-full'>
                      <Text className='text-gray-400 text-xs font-bold'>
                        {finishedMatches.length}
                      </Text>
                    </View>
                  </View>
                  <View className='gap-3'>
                    {finishedMatches.map((match) => (
                      <MatchCard key={match.id} match={match} myTeamId={currentTeam.id} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        }
      />
    </ScreenLayout>
  )
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <View className='bg-card/50 p-6 rounded-xl border border-border border-dashed items-center'>
      <View className='w-12 h-12 bg-gray-800/50 rounded-xl items-center justify-center mb-3'>
        <Icon size={24} color='#6B7280' strokeWidth={2} />
      </View>
      <Text className='text-text-muted text-center font-medium'>{title}</Text>
      <Text className='text-gray-500 text-center text-sm mt-1'>{description}</Text>
    </View>
  )
}

// Match Card Component
function MatchCard({ match, myTeamId }: { match: MatchPreview; myTeamId: string }) {
  const isPending = match.status === 'PENDING'
  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'

  // Notificación: último mensaje del rival
  const hasNotification = match.last_message && match.last_message.sender_team_id !== myTeamId

  // Helper para estado del partido
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <View className='bg-red-500/20 px-2 py-1 rounded border border-red-500/50'>
          <Text className='text-red-500 text-xs font-bold uppercase'>● En Vivo</Text>
        </View>
      )
    }
    if (isFinished) {
      return (
        <View className='bg-gray-700/50 px-2 py-1 rounded'>
          <Text className='text-gray-400 text-xs font-bold uppercase'>Finalizado</Text>
        </View>
      )
    }
    return null
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/match/${match.id}` as any)}
      className={`rounded-xl border overflow-hidden ${
        isLive
          ? 'bg-card border-red-500/50'
          : isPending
            ? 'bg-card border-warning/30'
            : 'bg-card border-border'
      }`}
    >
      {/* Barra superior */}
      {(isPending || isLive) && (
        <View
          className={`px-4 py-2 border-b flex-row items-center justify-between ${
            isLive ? 'bg-red-500/20 border-red-500/30' : 'bg-warning/20 border-warning/30'
          }`}
        >
          <View className='flex-row items-center gap-2'>
            {isLive ? (
              <Zap size={14} color='#EF4444' strokeWidth={2.5} />
            ) : (
              <AlertCircle size={14} color='#EAB308' strokeWidth={2.5} />
            )}
            <Text
              className={`text-xs font-bold uppercase ${isLive ? 'text-red-500' : 'text-warning'}`}
            >
              {isLive ? 'Partido en Vivo' : 'Requiere Acción'}
            </Text>
          </View>

          {hasNotification && !isLive && (
            <View className='flex-row items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/50'>
              <View className='w-2 h-2 bg-red-500 rounded-full' />
              <Text className='text-red-400 text-[10px] font-bold uppercase'>Nueva Respuesta</Text>
            </View>
          )}
        </View>
      )}

      <View className='p-4'>
        {/* Header */}
        <View className='flex-row justify-between items-center mb-3'>
          <View className='flex-row items-center gap-2'>
            <View
              className={`px-2 py-1 rounded ${
                match.is_friendly ? 'bg-blue-500/20' : 'bg-warning/20'
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  match.is_friendly ? 'text-blue-400' : 'text-warning'
                }`}
              >
                {match.is_friendly ? 'Amistoso' : 'Torneo'}
              </Text>
            </View>
            <View className='flex-row items-center gap-1'>
              <MapPin size={11} color='#9CA3AF' strokeWidth={2} />
              <Text className='text-text-muted text-xs font-semibold'>
                {match.my_role === 'HOME' ? 'Local' : 'Visitante'}
              </Text>
            </View>
          </View>
          {getStatusBadge()}
        </View>

        {/* Rival */}
        <View className='flex-row items-center gap-3 mb-3'>
          <View className='w-14 h-14 bg-gray-800 rounded-xl items-center justify-center border border-gray-700 overflow-hidden flex-shrink-0'>
            {match.rival.logo_url ? (
              <Image
                source={{ uri: match.rival.logo_url }}
                className='w-full h-full'
                resizeMode='cover'
              />
            ) : (
              <Shield size={28} color='#9CA3AF' strokeWidth={2} />
            )}
          </View>

          <View className='flex-1 min-w-0'>
            <Text className='text-text-main font-title text-xl mb-1' numberOfLines={1}>
              {match.rival.name}
            </Text>

            {match.scheduled_at ? (
              <View className='gap-1'>
                <View className='flex-row items-center gap-1.5'>
                  <Calendar size={12} color='#39FF14' strokeWidth={2} />
                  <Text className='text-primary text-xs font-bold'>
                    {new Date(match.scheduled_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View className='flex-row items-center gap-1.5'>
                  <Clock size={12} color='#9CA3AF' strokeWidth={2} />
                  <Text className='text-text-muted text-xs'>
                    {new Date(match.scheduled_at).getHours().toString().padStart(2, '0')}:
                    {new Date(match.scheduled_at).getMinutes().toString().padStart(2, '0')} hs
                  </Text>
                </View>
              </View>
            ) : (
              <View className='flex-row items-center gap-1.5'>
                <Clock size={12} color='#EAB308' strokeWidth={2} />
                <Text className='text-warning text-xs font-semibold'>Fecha por definir</Text>
              </View>
            )}
          </View>

          <ChevronRight size={20} color='#6B7280' strokeWidth={2.5} className='flex-shrink-0' />
        </View>

        {/* Botón de acción */}
        {isPending && (
          <View className='pt-3 border-t border-border'>
            <TouchableOpacity
              onPress={() => router.push(`/match/${match.id}` as any)}
              className='bg-primary/10 py-2.5 rounded-lg border border-primary/30 active:bg-primary/20 flex-row items-center justify-center gap-2'
            >
              <Text className='text-primary text-sm font-bold'>Gestionar Partido</Text>
              {hasNotification ? (
                <MessageCircle size={16} color='#39FF14' strokeWidth={2.5} />
              ) : (
                <ChevronRight size={16} color='#39FF14' strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}
