import { format } from 'date-fns'
import { router, useFocusEffect } from 'expo-router'
import { Bell, MapPin } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { authService } from '@/services/auth.service'
import { matchesService, MatchPreview } from '@/services/matches.service'
import { teamsService } from '@/services/teams.service'
import { UserProfile } from '@/types/auth'

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [nextMatch, setNextMatch] = useState<MatchPreview | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const loadData = useCallback(async () => {
    try {
      // 1. Get Profile
      const session = await authService.getSession()
      const userId = session.data?.user?.id
      if (!userId) return

      const profileCheck = await authService.checkProfile(userId)
      if (profileCheck.profile) {
        setProfile(profileCheck.profile)
      }

      // 2. Get Next Match (Across all teams)
      const matchesRes = await matchesService.getUserUpcomingMatches(userId)
      if (matchesRes.success && matchesRes.data && matchesRes.data.length > 0) {
        setNextMatch(matchesRes.data[0])
      } else {
        setNextMatch(null)
      }

      // 3. Get Notifications (Pending Requests)
      const requestsRes = await teamsService.getUserPendingRequests(userId)
      if (requestsRes.success && requestsRes.data) {
        setPendingRequestsCount(requestsRes.data.length)
      }

    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  return (
    <SafeAreaView className='flex-1 bg-background'>
      <ScrollView
        className='flex-1 px-4'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#39FF14" />
        }
      >
        {/* HEADER SUPERIOR */}
        <View className='flex-row justify-between items-center mt-4 mb-6'>
          <View>
            <Text className='text-text-muted font-body text-sm'>Bienvenido de nuevo,</Text>
            <Text className='text-text-main font-title text-3xl uppercase tracking-wider'>
              {profile?.full_name?.split(' ')[0] || profile?.username || 'JUGADOR'}
            </Text>
          </View>
          {/* Avatar y Notificaciones */}
          <View className='flex-row items-center gap-4'>
            <TouchableOpacity
              className='bg-card p-2 rounded-full border border-border relative'
              onPress={() => router.push('/(tabs)/profile')} // Or a dedicated Notifications screen if it existed
            >
              <Bell size={24} color={pendingRequestsCount > 0 ? '#EF4444' : '#39FF14'} />
              {pendingRequestsCount > 0 && (
                <View className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full border border-card" />
              )}
            </TouchableOpacity>
            <View className='h-10 w-10 bg-modal rounded-full border-2 border-primary overflow-hidden items-center justify-center'>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
              ) : (
                <Text className="text-primary font-bold">{profile?.username?.substring(0, 2).toUpperCase()}</Text>
              )}
            </View>
          </View>
        </View>

        {/* HERO SECTION: PRÓXIMO PARTIDO */}
        {nextMatch ? (
          <View className='bg-card rounded-2xl p-0 border border-border overflow-hidden mb-6'>
            {/* Cabecera del Hero */}
            <View className='bg-primary/10 p-3 flex-row justify-between items-center'>
              <View className='flex-row items-center gap-1'>
                <MapPin size={14} color='#39FF14' />
                <Text className='text-primary font-bodyBold text-xs uppercase'>
                  {nextMatch.status === 'LIVE' ? 'EN JUEGO' : 'PRÓXIMO PARTIDO'}
                </Text>
              </View>
              {nextMatch.scheduled_at && (
                <Text className='text-text-main font-title text-xs bg-error px-2 py-0.5 rounded'>
                  {format(new Date(nextMatch.scheduled_at), 'dd/MM HH:mm')}
                </Text>
              )}
            </View>

            {/* VS Card */}
            <View className='p-6 flex-row justify-between items-center'>
              {/* Equipo Local (Yo) */}
              <View className='items-center w-1/3'>
                <View className='w-16 h-16 bg-modal rounded-full mb-2 items-center justify-center border border-primary/30'>
                  <Text className='text-2xl'>🛡️</Text>
                </View>
                <Text className='text-text-main font-title text-sm text-center' numberOfLines={1}>TU EQUIPO</Text>
              </View>

              <Text className='text-text-muted font-title text-2xl italic'>VS</Text>

              {/* Rival */}
              <View className='items-center w-1/3'>
                <View className='w-16 h-16 bg-modal/30 rounded-full mb-2 items-center justify-center border border-dashed border-border'>
                  <Text className='text-2xl text-text-muted'>⚔️</Text>
                </View>
                <Text className='text-text-muted font-title text-sm text-center' numberOfLines={1}>{nextMatch.rival.name}</Text>
              </View>
            </View>

            {/* Botón de Acción Principal */}
            <TouchableOpacity
              className='bg-primary m-4 py-3 rounded-xl items-center active:opacity-90'
              onPress={() => router.push(`/match/${nextMatch.id}`)}
            >
              <Text className='text-background font-title text-xl uppercase'>VER DETALLES</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // EMPTY STATE
          <View className='bg-card rounded-2xl p-6 border border-border mb-6 items-center'>
            <Text className='text-text-main font-title text-lg mb-2'>SIN PARTIDOS</Text>
            <Text className='text-text-muted text-center mb-4'>No tienes partidos confirmados próximamente.</Text>
            <TouchableOpacity
              className='bg-primary w-full py-3 rounded-xl items-center active:opacity-90'
              onPress={() => router.push('/(tabs)/rivals')}
            >
              <Text className='text-background font-title text-lg uppercase'>BUSCAR RIVAL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACCESOS RÁPIDOS */}
        <Text className='text-text-main font-title text-xl mb-4 uppercase'>Acciones Rápidas</Text>
        <View className='flex-row gap-3 mb-8'>
          <TouchableOpacity
            className='flex-1 bg-card p-4 rounded-xl border border-border items-start'
            onPress={() => router.push('/create-team')}
          >
            <Text className='text-primary font-title text-lg mb-1'>+ CREAR</Text>
            <Text className='text-text-muted font-body text-xs'>Nuevo Equipo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className='flex-1 bg-card p-4 rounded-xl border border-border items-start'
            onPress={() => router.push('/(tabs)/market')}
          >
            <Text className='text-primary font-title text-lg mb-1'>BUSCO</Text>
            <Text className='text-text-muted font-body text-xs'>Jugador Refuerzo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
