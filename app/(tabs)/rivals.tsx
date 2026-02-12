import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { useToast } from '@/context/ToastContext'
import { ZONAS_AMBA } from '@/lib/constants'
import { authService } from '@/services/auth.service'
import { challengesService } from '@/services/challenges.service'
import { MatchDetail, matchesService } from '@/services/matches.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import { Challenge } from '@/types/challenges'
import { UserRole } from '@/types/core'
import { Team } from '@/types/teams'
import { router, useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

// Components
import { ChallengesList, RivalsList, SearchFilters, TabButton } from '@/components/rivals-list'
import { ChallengeRelationship } from '@/components/rivals/RivalCard'
import { TeamDetailModal } from '@/components/rivals/TeamDetailModal'

export default function RivalsScreen() {
  const { showToast } = useToast()

  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [rivals, setRivals] = useState<Team[]>([])
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([])
  const [activeMatches, setActiveMatches] = useState<Map<string, MatchDetail>>(new Map()) // Cache de matches activos

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedZone, setSelectedZone] = useState('ANY')
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'MY_CHALLENGES'>('EXPLORE')

  const [selectedRival, setSelectedRival] = useState<Team | null>(null)
  const [selectedRivalMembers, setSelectedRivalMembers] = useState<TeamMemberDetail[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [canManage, setCanManage] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadData()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  React.useEffect(() => {
    if (currentTeam && activeTab === 'EXPLORE') {
      fetchRivals(currentTeam.id, searchQuery, selectedZone)
      fetchChallenges(currentTeam.id)
    }
  }, [searchQuery, selectedZone, currentTeam, activeTab])

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
          const defaultTeam = teamsRes.data[0]
          setCurrentTeam(defaultTeam)
          await checkPermissions(defaultTeam.id, userId)
        } else {
          await checkPermissions(currentTeam.id, userId)
        }
      } else {
        setMyTeams([])
        setCurrentTeam(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function checkPermissions(teamId: string, userId: string) {
    const membersRes = await teamsService.getTeamMembers(teamId)
    const me = membersRes.data?.find((m) => m.user_id === userId)
    setCanManage(me?.role === UserRole.ADMIN || me?.role === UserRole.SUB_ADMIN)
  }

  const fetchRivals = useCallback(
    async (teamId: string, query?: string, zone?: string) => {
      //Actualizar a 5 con casos de prueba mas pronto
      const res = await challengesService.searchRivals(teamId, query, zone)
      if (res.data) {
        const validRivals = res.data.filter((t: any) => (t.member_count || 0) >= 2)
        setRivals(validRivals)
      }
    },
    []
  )

  const fetchChallenges = useCallback(async (teamId: string) => {
    const res = await challengesService.getMyChallenges(teamId)
    if (res.data) {
      setMyChallenges(res.data.filter((c) => c.status !== 'CANCELLED'))
      // Cargar matches activos para challenges aceptados
      await loadActiveMatches(teamId, res.data.filter((c) => c.status === 'ACCEPTED'))
    }
  }, [])

  /**
   * Carga matches activos para challenges aceptados
   */
  const loadActiveMatches = useCallback(
    async (teamId: string, acceptedChallenges: Challenge[]) => {
      const newMatches = new Map<string, MatchDetail>()

      for (const challenge of acceptedChallenges) {
        const otherTeamId =
          challenge.challenger_team_id === teamId
            ? challenge.target_team_id
            : challenge.challenger_team_id

        const matchRes = await matchesService.getActiveMatchBetweenTeams(teamId, otherTeamId)
        if (matchRes.success && matchRes.data) {
          newMatches.set(otherTeamId, matchRes.data)
        }
      }

      setActiveMatches(newMatches)
    },
    []
  )

  async function fetchTeamMembers(teamId: string) {
    try {
      const res = await teamsService.getTeamMembers(teamId)
      if (res.data) {
        setSelectedRivalMembers(res.data)
      } else {
        setSelectedRivalMembers([])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      setSelectedRivalMembers([])
    }
  }

  // Efecto para cargar miembros cuando se selecciona un rival
  React.useEffect(() => {
    if (selectedRival && showDetail) {
      fetchTeamMembers(selectedRival.id)
    }
  }, [selectedRival, showDetail])

  // --- ACTIONS ---
  async function handleChallenge(teamId: string) {
    if (!currentTeam) return
    if (!canManage) return showToast('Solo capitanes pueden desafiar', 'error')

    // Verificar si se puede enviar nuevo challenge
    const canSendRes = await challengesService.canSendNewChallenge(currentTeam.id, teamId)
    if (!canSendRes.success) {
      return showToast(canSendRes.error || 'Error al verificar', 'error')
    }

    if (!canSendRes.data) {
      return showToast('Ya hay un desafío o partido activo con este equipo', 'error')
    }

    const res = await challengesService.sendChallenge(currentTeam.id, teamId)
    if (res.success) {
      showToast('Desafío enviado', 'success')
      fetchChallenges(currentTeam.id)
      fetchRivals(currentTeam.id, searchQuery, selectedZone)
    } else {
      showToast(res.error || 'Error al enviar', 'error')
    }
  }

  async function handleRespondChallenge(challengeId: string, accept: boolean) {
    const status = accept ? 'ACCEPTED' : 'REJECTED'
    const res = await challengesService.updateStatus(challengeId, status)
    if (res.success) {
      showToast(accept ? '¡Desafío Aceptado!' : 'Desafío rechazado', accept ? 'success' : 'info')
      setShowDetail(false)
      if (currentTeam) fetchChallenges(currentTeam.id)
    } else {
      showToast('Error al responder', 'error')
    }
  }

  /**
   * Cancela un challenge propio (solo si está PENDING)
   */
  async function handleCancelChallenge(challengeId: string) {
    const res = await challengesService.cancelChallenge(challengeId)
    if (res.success) {
      showToast('Desafío cancelado', 'info')
      setShowDetail(false)
      if (currentTeam) {
        fetchChallenges(currentTeam.id)
        fetchRivals(currentTeam.id, searchQuery, selectedZone)
      }
    } else {
      showToast('Error al cancelar', 'error')
    }
  }

  // --- HELPERS ---
  const getRelationship = (otherTeamId: string): ChallengeRelationship => {
    if (!currentTeam) return 'NONE'
    
    // 1. Verificar si hay match activo - prioridad máxima
    const activeMatch = activeMatches.get(otherTeamId)
    if (activeMatch) {
      return 'ACCEPTED' // Hay match activo → mostrar check verde
    }
    
    // 2. Buscar el challenge más reciente entre estos equipos
    const challenge = myChallenges.find(
      (c) =>
        (c.target_team_id === otherTeamId || c.challenger_team_id === otherTeamId) &&
        c.status !== 'CANCELLED',
    )
    
    if (!challenge) return 'NONE' // No hay historial → botón +
    
    // 3. Si hay challenge pero no match activo, verificar estado
    switch (challenge.status) {
      case 'PENDING':
        // Si soy el que envió el challenge Y puedo gestionar → permitir cancelar
        if (challenge.challenger_team_id === currentTeam.id && canManage) {
          return 'CAN_CANCEL'
        }
        return challenge.challenger_team_id === currentTeam.id ? 'SENT' : 'RECEIVED'
      case 'ACCEPTED':
        // Challenge aceptado pero NO hay match activo → match ya terminó
        return 'NONE' // Permitir nuevo challenge
      case 'REJECTED':
        return 'NONE' // Challenge rechazado → permitir nuevo
      default:
        return 'NONE'
    }
  }

  const getActiveChallengeId = (otherTeamId: string) => {
    return myChallenges.find(
      (c) =>
        (c.target_team_id === otherTeamId || c.challenger_team_id === otherTeamId) &&
        c.status === 'PENDING',
    )?.id
  }

  const zoneOptions = [
    { label: 'Todas las Zonas', value: 'ANY' },
    ...ZONAS_AMBA.map((z) => ({ label: z, value: z })),
  ]

  // --- RENDER ---
  if (loading && !refreshing)
    return (
      <View className='flex-1 bg-background items-center justify-center'>
        <ActivityIndicator color='#39FF14' />
      </View>
    )

  if (!currentTeam) {
    return (
      <ScreenLayout withPadding scrollable>
        <View className='flex-1 items-center justify-center pt-20'>
          <Text className='text-text-muted text-center mb-6 font-body text-lg'>
            Necesitas un equipo para buscar rivales.
          </Text>
          <Button title='Crear Equipo' onPress={() => router.push('/create-team')} />
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout withPadding={false} className='bg-background'>
      <View className='flex-row border-b border-border pt-4 pb-0 px-4 bg-background z-10'>
        <TabButton
          title='Explorar'
          isActive={activeTab === 'EXPLORE'}
          onPress={() => setActiveTab('EXPLORE')}
        />
        <TabButton
          title='Solicitudes'
          isActive={activeTab === 'MY_CHALLENGES'}
          onPress={() => setActiveTab('MY_CHALLENGES')}
        />
      </View>

      <View className='flex-1 pt-4 px-4'>
        {activeTab === 'EXPLORE' ? (
          <>
            <SearchFilters
              myTeams={myTeams}
              currentTeam={currentTeam}
              searchQuery={searchQuery}
              selectedZone={selectedZone}
              zoneOptions={zoneOptions}
              onTeamChange={(id) => {
                const t = myTeams.find((team) => team.id === id)
                if (t) setCurrentTeam(t)
              }}
              onSearchChange={setSearchQuery}
              onZoneChange={setSelectedZone}
            />

            
            <Text className='text-text-muted text-xs uppercase mb-4 font-semibold'>
              Resultados para{' '}
              <Text className='text-text-main font-bold'>
                {selectedZone === 'ANY' ? 'todas las zonas' : selectedZone}
              </Text>
              :
            </Text>
            
            <RivalsList
              rivals={rivals}
              refreshing={refreshing}
              canManage={canManage}
              onRefresh={() => {
                setRefreshing(true)
                loadData()
              }}
              onRivalPress={(rival) => {
                setSelectedRival(rival)
                setShowDetail(true)
              }}
              onChallenge={handleChallenge}
              getRelationship={getRelationship}
            />
          </>
        ) : (
          <ChallengesList
            challenges={myChallenges}
            currentTeam={currentTeam!}
            refreshing={refreshing}
            canManage={canManage}
            onRefresh={() => {
              setRefreshing(true)
              loadData()
            }}
            onChallengePress={(team) => {
              setSelectedRival(team)
              setShowDetail(true)
            }}
            onAcceptChallenge={(challengeId) => handleRespondChallenge(challengeId, true)}
            onRejectChallenge={(challengeId) => handleRespondChallenge(challengeId, false)}
          />
        )}
      </View>

      <TeamDetailModal
        visible={showDetail}
        team={selectedRival}
        teamMembers={selectedRivalMembers}
        myTeams={myTeams}
        selectedTeamId={currentTeam?.id || ''}
        onSelectTeam={(id) => {
          const t = myTeams.find((x) => x.id === id)
          if (t) setCurrentTeam(t)
        }}
        onClose={() => {
          setShowDetail(false)
          setSelectedRivalMembers([]) // Limpiar miembros al cerrar
        }}
        onChallenge={() => selectedRival && handleChallenge(selectedRival.id)}
        onAccept={() =>
          selectedRival && handleRespondChallenge(getActiveChallengeId(selectedRival.id)!, true)
        }
        onReject={() =>
          selectedRival && handleRespondChallenge(getActiveChallengeId(selectedRival.id)!, false)
        }
        onCancel={() =>
          selectedRival && handleCancelChallenge(getActiveChallengeId(selectedRival.id)!)
        }
        relationship={selectedRival ? getRelationship(selectedRival.id) : 'NONE'}
      />
    </ScreenLayout>
  )
}
