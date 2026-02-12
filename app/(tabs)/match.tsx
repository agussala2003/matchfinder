import { EmptyState, MatchSection } from '@/components/match-list'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Select } from '@/components/ui/Select'
import { authService } from '@/services/auth.service'
import { matchesService, MatchPreview } from '@/services/matches.service'
import { teamsService } from '@/services/teams.service'
import { UserRole } from '@/types/core'
import { Team } from '@/types/teams'
import { router, useFocusEffect } from 'expo-router'
import { Calendar } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'

export default function MatchScreen() {
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<MatchPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [canManage, setCanManage] = useState(false) // Nuevo estado de permiso

  // Filtros
  const pendingMatches = matches.filter((m) => m.status === 'PENDING')
  const confirmedMatches = matches.filter((m) => m.status === 'CONFIRMED')
  const liveMatches = matches.filter((m) => m.status === 'LIVE')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

  const loadData = useCallback(async () => {
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
          await checkPermissions(teamsRes.data[0].id, userId)
        } else {
          // Refrescar permisos del equipo actual por si cambió algo
          await checkPermissions(currentTeam.id, userId)
          fetchMatches(currentTeam.id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [refreshing, currentTeam])

  const handleCreateMatch = () => {
    router.push('/rivals')
  }

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData]),
  )

  React.useEffect(() => {
    if (currentTeam) {
        fetchMatches(currentTeam.id)
        checkPermissions(currentTeam.id) // Validar permisos al cambiar de equipo
    }
  }, [currentTeam])

  async function checkPermissions(teamId: string, userId?: string) {
    if(!userId) {
        const session = await authService.getSession()
        userId = session.data?.user?.id
    }
    if(!userId) return

    const membersRes = await teamsService.getTeamMembers(teamId)
    const me = membersRes.data?.find((m) => m.user_id === userId)
    
    // Solo ADMIN y SUB_ADMIN pueden gestionar partidos
    const hasPermission = me?.role === UserRole.ADMIN || me?.role === UserRole.SUB_ADMIN
    setCanManage(hasPermission)
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

  // Show empty state if no matches
  if (matches.length === 0) {
    return (
      <ScreenLayout withPadding>
        {myTeams.length > 1 && (
          <View className='mb-6'>
            <Select
              label='Viendo partidos de'
              value={currentTeam?.id || ''}
              options={myTeams.map((t) => ({ label: t.name, value: t.id }))}
              onChange={(id) => {
                const t = myTeams.find((team) => team.id === id)
                if (t) setCurrentTeam(t)
              }}
            />
          </View>
        )}
        <EmptyState type="noMatches" onCreateMatch={handleCreateMatch} />
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout withPadding={false} className='bg-background'>
      <ScrollView
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
      >
        <View className='pb-20'>
          {/* Team Selector */}
          {myTeams.length > 1 && (
            <View className='px-4 pt-4'>
              <Select
                label='Viendo partidos de'
                value={currentTeam?.id || ''}
                options={myTeams.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(id) => {
                  const t = myTeams.find((team) => team.id === id)
                  if (t) setCurrentTeam(t)
                }}
              />
            </View>
          )}

          <View className='gap-6 mt-6'>
            {/* Live Matches */}
            <MatchSection
              title='En Vivo'
              matches={liveMatches}
              myTeamId={currentTeam?.id || ''}
              canManage={canManage}
            />

            {/* Pending Matches */}
            <MatchSection
              title='Por Agendar'
              matches={pendingMatches}
              myTeamId={currentTeam?.id || ''}
              canManage={canManage}
              emptyStateType='noPending'
            />

            {/* Confirmed Matches */}
            <MatchSection
              title='Calendario'
              matches={confirmedMatches}
              myTeamId={currentTeam?.id || ''}
              canManage={canManage}
            />

            {/* Finished Matches */}
            <MatchSection
              title='Finalizados'
              matches={finishedMatches}
              myTeamId={currentTeam?.id || ''}
              canManage={canManage}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}