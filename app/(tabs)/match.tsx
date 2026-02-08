import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Select } from '@/components/ui/Select'
import { authService } from '@/services/auth.service'
import { matchesService } from '@/services/matches.service'; // <--- NUEVO
import { teamsService } from '@/services/teams.service'
import { MatchPreview } from '@/types/matches'
import { Team } from '@/types/teams'
import { router, useFocusEffect } from 'expo-router'
import { Calendar, Clock, MapPin } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

export default function MatchScreen() {
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<MatchPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros derivados
  const pendingMatches = matches.filter(m => !m.scheduled_at || m.status === 'PENDING')
  const confirmedMatches = matches.filter(m => m.status === 'CONFIRMED' || m.status === 'FINISHED')

  useFocusEffect(
    useCallback(() => {
      loadData()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  )

  // Recargar al cambiar de equipo
  React.useEffect(() => {
    if (currentTeam) fetchMatches(currentTeam.id)
  }, [currentTeam])

  async function loadData() {
    try {
      if(!refreshing) setLoading(true)
      const session = await authService.getSession()
      const userId = session.data?.user?.id
      if (!userId) return

      const teamsRes = await teamsService.getUserTeams(userId)
      
      if (teamsRes.data && teamsRes.data.length > 0) {
        setMyTeams(teamsRes.data)
        if (!currentTeam) setCurrentTeam(teamsRes.data[0])
        else fetchMatches(currentTeam.id) // Refetch si ya tengo equipo
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

  // --- RENDER ---

  if (loading && !refreshing) return <View className='flex-1 bg-background items-center justify-center'><ActivityIndicator color='#39FF14' /></View>

  if (!currentTeam) {
    return (
      <ScreenLayout withPadding>
        <View className='flex-1 items-center justify-center'>
          <Text className='text-text-muted text-center mb-4'>Crea un equipo para ver tus partidos.</Text>
          <Button title='Crear Equipo' onPress={() => router.push('/create-team')} />
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout withPadding={false} className='bg-background'>
      {/* Selector de Equipo */}
      {myTeams.length > 1 && (
        <View className="px-4 pt-2 pb-2 bg-card border-b border-border">
            <Select 
                label="Viendo partidos de:"
                value={currentTeam.id}
                options={myTeams.map(t => ({ label: t.name, value: t.id }))}
                onChange={(id) => {
                    const t = myTeams.find(team => team.id === id)
                    if(t) setCurrentTeam(t)
                }}
            />
        </View>
      )}

      <FlatList 
        data={[]} // Lista vacía principal, usamos ListHeaderComponent para el contenido
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} tintColor="#39FF14" />}
        renderItem={null}
        ListHeaderComponent={
          <View className='p-4 gap-6 pb-20'>
            
            {/* SECCIÓN 1: POR AGENDAR (La Sala de Guerra) */}
            <View>
              <Text className='text-text-main font-title text-xl mb-3'>⚠️ Por Agendar</Text>
              {pendingMatches.length > 0 ? (
                pendingMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))
              ) : (
                <Text className='text-text-muted italic ml-1'>No hay partidos pendientes.</Text>
              )}
            </View>

            {/* SECCIÓN 2: PRÓXIMOS (Calendario) */}
            <View>
              <Text className='text-text-main font-title text-xl mb-3'>📅 Calendario</Text>
              {confirmedMatches.length > 0 ? (
                confirmedMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))
              ) : (
                <View className='bg-card/50 p-6 rounded-xl border border-border border-dashed items-center'>
                    <Calendar size={32} color='#4B5563' />
                    <Text className='text-text-muted text-center mt-2'>Acepta desafíos para llenar tu calendario.</Text>
                </View>
              )}
            </View>

          </View>
        }
      />
    </ScreenLayout>
  )
}

// Componente Local para Tarjeta de Partido
function MatchCard({ match }: { match: MatchPreview }) {
  const isPending = !match.scheduled_at || match.status === 'PENDING'

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      className={`p-4 rounded-xl border mb-3 ${isPending ? 'bg-card border-l-4 border-l-status-gold border-border' : 'bg-card border-border'}`}
    >
      <View className='flex-row justify-between items-center mb-3'>
        <Text className='text-text-muted text-xs font-bold uppercase'>
            {match.is_friendly ? 'Amistoso' : 'Torneo'} • {match.my_role === 'HOME' ? 'Local' : 'Visitante'}
        </Text>
        {isPending && <Text className='text-status-gold text-xs font-bold'>REQUIERE ACCIÓN</Text>}
      </View>

      <View className='flex-row items-center gap-4'>
        <Avatar uri={match.rival.logo_url} fallback="shield" size={48} />
        <View className='flex-1'>
            <Text className='text-text-main font-title text-xl' numberOfLines={1}>{match.rival.name}</Text>
            
            {/* Info de Fecha/Lugar */}
            {match.scheduled_at ? (
                <View className='mt-1'>
                    <View className='flex-row items-center gap-1.5'>
                        <Clock size={12} color='#39FF14' />
                        <Text className='text-primary text-xs font-bold'>
                            {new Date(match.scheduled_at).toLocaleDateString()} • {new Date(match.scheduled_at).getHours()}:00 hs
                        </Text>
                    </View>
                    <View className='flex-row items-center gap-1.5 mt-0.5'>
                        <MapPin size={12} color='#9CA3AF' />
                        <Text className='text-text-muted text-xs'>Sede por definir</Text>
                    </View>
                </View>
            ) : (
                <Text className='text-text-muted text-xs italic mt-1'>Fecha y lugar sin definir</Text>
            )}
        </View>
      </View>

      {/* Botón de Acción Rápida */}
      {isPending && (
        <View className='mt-4 pt-3 border-t border-border'>
            <Button title='Gestionar Partido' variant='secondary' className='h-10 py-0' onPress={() => router.push('/(tabs)/match')} /> 
            {/* TODO: Esto llevará a la pantalla de detalle del partido */}
        </View>
      )}
    </TouchableOpacity>
  )
}