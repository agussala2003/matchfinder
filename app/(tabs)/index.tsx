import { PageLoader } from '@/components/ui/PageLoader'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { router, useFocusEffect } from 'expo-router'
import { Bell, CalendarX, MapPin, Shield, Trophy, Users } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { MatchDetail, matchesService } from '@/services/matches.service'
import { teamsService } from '@/services/teams.service'
import { UserProfile } from '@/types/auth'
import { Team } from '@/types/teams'

export default function HomeScreen() {
  const { showToast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mainTeam, setMainTeam] = useState<Team | null>(null)
  const [nextMatch, setNextMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const loadData = useCallback(async () => {
    try {
      const session = await authService.getSession()
      const userId = session.data?.user?.id
      if (!userId) return

      // Profile + teams + next match + pending requests in parallel
      const [profileCheck, teamsRes, nextMatchRes, requestsRes] = await Promise.all([
        authService.checkProfile(userId),
        teamsService.getUserTeams(userId),
        matchesService.getUserNextMatch(userId),
        teamsService.getUserPendingRequests(userId),
      ])

      if (profileCheck.profile) setProfile(profileCheck.profile)

      if (teamsRes.success && teamsRes.data) {
        setMainTeam(teamsRes.data[0] ?? null)
      }

      if (nextMatchRes.success) {
        setNextMatch(nextMatchRes.data ?? null)
      }

      if (requestsRes.success && requestsRes.data) {
        setPendingRequestsCount(requestsRes.data.length)
      }
    } catch (e) {
      console.error(e)
      showToast('Error al cargar el dashboard. Intentá de nuevo.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData]),
  )

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  if (loading) {
    return <PageLoader visible={true} />
  }

  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'JUGADOR'

  const statusLabel: Record<string, string> = {
    CONFIRMED: 'CONFIRMADO',
    PENDING: 'PENDIENTE',
    LIVE: 'EN JUEGO',
  }

  return (
    <SafeAreaView className='flex-1 bg-background'>
      <ScrollView
        className='flex-1 px-4'
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor='#39FF14' />
        }
      >
        {/* ─── 1. HEADER ───────────────────────────────────────────── */}
        <View className='flex-row justify-between items-center mt-4 mb-6'>
          <View>
            <Text className='text-text-muted font-body text-sm'>Bienvenido de vuelta,</Text>
            <Text className='text-text-main font-title text-3xl uppercase tracking-wider'>
              {firstName}
            </Text>
          </View>

          <View className='flex-row items-center gap-3'>
            {/* Bell */}
            <TouchableOpacity
              className='bg-card p-2 rounded-full border border-border relative'
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Bell size={22} color={pendingRequestsCount > 0 ? '#EF4444' : '#39FF14'} />
              {pendingRequestsCount > 0 && (
                <View className='absolute top-0 right-0 w-3 h-3 bg-error rounded-full border border-card' />
              )}
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Avatar
                uri={profile?.avatar_url}
                size={40}
                shape='circle'
                fallback='user'
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. HERO — PRÓXIMO PARTIDO ───────────────────────────── */}
        <Text className='text-text-muted font-body text-xs uppercase tracking-widest mb-3'>
          Próximo Partido
        </Text>

        {nextMatch ? (
          <TouchableOpacity
            activeOpacity={0.85}
            className='bg-card rounded-2xl border border-border overflow-hidden mb-6'
            onPress={() => router.push(`/match/${nextMatch.id}`)}
          >
            {/* Status bar */}
            <View className='bg-primary/10 px-4 py-2 flex-row justify-between items-center'>
              <View className='flex-row items-center gap-2'>
                <View
                  className={`w-2 h-2 rounded-full ${nextMatch.status === 'CONFIRMED' ? 'bg-primary' : 'bg-yellow-400'}`}
                />
                <Text className='text-primary font-bodyBold text-xs uppercase'>
                  {statusLabel[nextMatch.status] ?? nextMatch.status}
                </Text>
              </View>
              {nextMatch.scheduled_at && (
                <Text className='text-text-main font-title text-xs'>
                  {format(new Date(nextMatch.scheduled_at), "EEEE d 'de' MMMM · HH:mm", {
                    locale: es,
                  })}
                </Text>
              )}
            </View>

            {/* VS */}
            <View className='px-6 pt-5 pb-4 flex-row items-center justify-between'>
              {/* Team A */}
              <View className='items-center flex-1'>
                <Avatar uri={nextMatch.team_a.logo_url} size={64} shape='circle' fallback='shield' />
                <Text
                  className='text-text-main font-title text-sm text-center mt-2'
                  numberOfLines={2}
                >
                  {nextMatch.team_a.name}
                </Text>
              </View>

              <View className='items-center px-2'>
                <Text className='text-text-muted font-title text-3xl italic'>VS</Text>
              </View>

              {/* Team B */}
              <View className='items-center flex-1'>
                <Avatar uri={nextMatch.team_b.logo_url} size={64} shape='circle' fallback='shield' />
                <Text
                  className='text-text-muted font-title text-sm text-center mt-2'
                  numberOfLines={2}
                >
                  {nextMatch.team_b.name}
                </Text>
              </View>
            </View>

            {/* Venue */}
            {nextMatch.venue && (
              <View className='flex-row items-center gap-1 px-4 pb-3'>
                <MapPin size={12} color='#6B7280' />
                <Text className='text-text-muted font-body text-xs' numberOfLines={1}>
                  {nextMatch.venue.name}
                </Text>
              </View>
            )}

            {/* CTA */}
            <View className='mx-4 mb-4'>
              <Button title='Ver Detalles del Partido' variant='primary' />
            </View>
          </TouchableOpacity>
        ) : (
          <View className='bg-card rounded-2xl border border-border p-6 mb-6 items-center'>
            <CalendarX size={40} color='#6B7280' />
            <Text className='text-text-main font-title text-lg mt-3 mb-1'>
              SIN PARTIDOS A LA VISTA
            </Text>
            <Text className='text-text-muted font-body text-sm text-center mb-5'>
              No tenés partidos confirmados próximamente.{'\n'}¡Desafiá a un rival y acordá una
              fecha!
            </Text>
            <Button
              title='Buscar Rival Ahora'
              variant='primary'
              icon={<Shield size={16} color='#000' />}
              onPress={() => router.push('/(tabs)/rivals')}
              className='w-full'
            />
          </View>
        )}

        {/* ─── 3. MI EQUIPO PRINCIPAL ──────────────────────────────── */}
        <Text className='text-text-muted font-body text-xs uppercase tracking-widest mb-3'>
          Mi Equipo Principal
        </Text>

        {mainTeam ? (
          <TouchableOpacity
            activeOpacity={0.85}
            className='bg-card rounded-2xl border border-border p-4 mb-6'
            onPress={() => router.push('/manage-team')}
          >
            <View className='flex-row items-center gap-4'>
              <Avatar uri={mainTeam.logo_url} size={56} shape='circle' fallback='shield' />

              <View className='flex-1'>
                <Text className='text-text-main font-title text-base uppercase' numberOfLines={1}>
                  {mainTeam.name}
                </Text>
                <Text className='text-text-muted font-body text-xs mt-0.5'>
                  {mainTeam.category === 'MALE'
                    ? 'Varones'
                    : mainTeam.category === 'FEMALE'
                      ? 'Mujeres'
                      : 'Mixto'}{' '}
                  · {mainTeam.home_zone}
                </Text>
              </View>

              {/* ELO badge */}
              <View className='bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 items-center'>
                <Text className='text-primary font-title text-xl leading-none'>
                  {mainTeam.elo_rating}
                </Text>
                <Text className='text-primary/60 font-body text-xs'>ELO</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View className='bg-card rounded-2xl border border-border p-6 mb-6 items-center'>
            <Shield size={40} color='#6B7280' />
            <Text className='text-text-main font-title text-lg mt-3 mb-1'>SIN EQUIPO</Text>
            <Text className='text-text-muted font-body text-sm text-center mb-5'>
              Necesitás un equipo para participar.{'\n'}Creá uno o unite con un código.
            </Text>
            <View className='flex-row gap-3 w-full'>
              <View className='flex-1'>
                <Button
                  title='Crear'
                  variant='primary'
                  onPress={() => router.push('/create-team')}
                />
              </View>
              <View className='flex-1'>
                <Button
                  title='Unirme'
                  variant='outline'
                  onPress={() => router.push('/join-team')}
                />
              </View>
            </View>
          </View>
        )}

        {/* ─── 4. ACCIONES RÁPIDAS ─────────────────────────────────── */}
        <Text className='text-text-muted font-body text-xs uppercase tracking-widest mb-3'>
          Acciones Rápidas
        </Text>

        <View className='flex-row gap-3 mb-10'>
          {/* Mercado */}
          <TouchableOpacity
            className='flex-1 bg-card border border-border rounded-2xl p-4 items-center gap-2 active:opacity-75'
            onPress={() => router.push('/(tabs)/market')}
          >
            <View className='bg-primary/10 p-3 rounded-xl'>
              <Users size={24} color='#39FF14' />
            </View>
            <Text className='text-text-main font-title text-sm uppercase'>Mercado</Text>
          </TouchableOpacity>

          {/* Desafiar */}
          <TouchableOpacity
            className='flex-1 bg-card border border-border rounded-2xl p-4 items-center gap-2 active:opacity-75'
            onPress={() => router.push('/(tabs)/rivals')}
          >
            <View className='bg-primary/10 p-3 rounded-xl'>
              <Shield size={24} color='#39FF14' />
            </View>
            <Text className='text-text-main font-title text-sm uppercase'>Desafiar</Text>
          </TouchableOpacity>

          {/* Mis Stats */}
          <TouchableOpacity
            className='flex-1 bg-card border border-border rounded-2xl p-4 items-center gap-2 active:opacity-75'
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View className='bg-primary/10 p-3 rounded-xl'>
              <Trophy size={24} color='#39FF14' />
            </View>
            <Text className='text-text-main font-title text-sm uppercase'>Mis Stats</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
