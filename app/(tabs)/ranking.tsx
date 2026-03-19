import { TeamDetailModal } from '@/components/rivals/TeamDetailModal'
import { useToast } from '@/context/ToastContext'
import { ZONAS_AMBA } from '@/lib/constants'
import { authService } from '@/services/auth.service'
import { TeamRankingItem, teamsService } from '@/services/teams.service'
import { Team } from '@/types/teams'
import LottieView from 'lottie-react-native'
import { Crown, MapPin, Search, Shield, TrendingDown, TrendingUp, Trophy } from 'lucide-react-native'
import React, { useCallback, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const FORMAT_CHIPS = [
  { label: 'Global', value: 'GLOBAL' },
  { label: 'F5', value: 'F5' },
  { label: 'F7', value: 'F7' },
  { label: 'F8', value: 'F8' },
  { label: 'F11', value: 'F11' },
] as const

export default function RankingScreen() {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [ranking, setRanking] = useState<TeamRankingItem[]>([])

  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [myTeamIds, setMyTeamIds] = useState<Set<string>>(new Set())

  const [selectedFormat, setSelectedFormat] = useState<(typeof FORMAT_CHIPS)[number]['value']>('GLOBAL')
  const [selectedZone, setSelectedZone] = useState<string>('ALL')
  const [zoneSearch, setZoneSearch] = useState('')

  const [showTop10Celebration, setShowTop10Celebration] = useState(false)
  const [lottieFailed, setLottieFailed] = useState(false)

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<any[]>([])
  const [showDetailModal, setShowDetailModal] = useState(false)

  const canUseLottie = Platform.OS !== 'web' && !lottieFailed

  const filteredZones = useMemo(() => {
    if (!zoneSearch.trim()) return ZONAS_AMBA
    const query = zoneSearch.toLowerCase().trim()
    return ZONAS_AMBA.filter((zone) => zone.toLowerCase().includes(query))
  }, [zoneSearch])

  const loadRanking = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const sessionRes = await authService.getSession()
      const userId = sessionRes.data?.user?.id
      let currentMyTeamIds = new Set<string>()

      if (userId) {
        const myTeamsRes = await teamsService.getUserTeams(userId)
        const teams = myTeamsRes.success && myTeamsRes.data ? myTeamsRes.data : []
        currentMyTeamIds = new Set(teams.map((team) => team.id))
        setMyTeams(teams)
        setMyTeamIds(currentMyTeamIds)
      } else {
        setMyTeams([])
        setMyTeamIds(new Set())
      }

      const rankingRes = await teamsService.getTeamsRanking(
        {
          zone: selectedZone === 'ALL' ? undefined : selectedZone,
          format: selectedFormat === 'GLOBAL' ? undefined : selectedFormat,
        },
        100,
      )

      if (!rankingRes.success || !rankingRes.data) {
        throw new Error(rankingRes.error || 'No se pudo cargar el ranking')
      }

      setRanking(rankingRes.data)

      const top10Ids = new Set(rankingRes.data.slice(0, 10).map((team) => team.id))
      const hasMyTeamInTop10 = Array.from(currentMyTeamIds).some((id) => top10Ids.has(id))
      setShowTop10Celebration(hasMyTeamInTop10)
    } catch (error) {
      console.error('Ranking load error:', error)
      showToast('Error al cargar ranking', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedZone, selectedFormat, showToast])

  React.useEffect(() => {
    loadRanking()
  }, [loadRanking])

  async function handleOpenTeam(teamId: string) {
    const [teamRes, membersRes] = await Promise.all([
      teamsService.getTeamById(teamId),
      teamsService.getTeamMembers(teamId),
    ])

    if (!teamRes.success || !teamRes.data) {
      showToast('No se pudo abrir el detalle del equipo', 'error')
      return
    }

    setSelectedTeam(teamRes.data)
    setSelectedTeamMembers(membersRes.success && membersRes.data ? membersRes.data : [])
    setShowDetailModal(true)
  }

  function getRankTrend(rank: number) {
    // Placeholder para lógica real de tendencia reciente.
    if (rank % 5 === 0) return 'down'
    if (rank % 3 === 0) return 'up'
    return 'stable'
  }

  const podium = ranking.slice(0, 3)
  const listData = ranking.slice(3)

  const renderRow = ({ item, index }: { item: TeamRankingItem; index: number }) => {
    const rank = index + 4
    const isMine = myTeamIds.has(item.id)
    const trend = getRankTrend(rank)

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleOpenTeam(item.id)}
        className={`mx-4 mb-3 rounded-2xl border px-4 py-3 ${
          isMine
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card'
        }`}
      >
        <View className='flex-row items-center'>
          <Text className='w-10 text-center font-title text-lg text-foreground'>#{rank}</Text>

          <View className='mx-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary'>
            {item.logo_url ? (
              <Image source={{ uri: item.logo_url }} className='h-full w-full' resizeMode='cover' />
            ) : (
              <Shield size={20} color='#A1A1AA' strokeWidth={2} />
            )}
          </View>

          <View className='flex-1'>
            <Text className='font-semibold text-foreground' numberOfLines={1}>
              {item.name}
            </Text>
            <View className='mt-1 flex-row items-center gap-1'>
              <MapPin size={12} color='#A1A1AA' />
              <Text className='text-xs text-muted-foreground' numberOfLines={1}>
                {item.home_zone}
              </Text>
              {isMine && (
                <View className='ml-2 rounded-full border border-primary bg-primary/20 px-2 py-0.5'>
                  <Text className='text-[10px] font-semibold text-primary'>TU EQUIPO</Text>
                </View>
              )}
            </View>
          </View>

          <View className='items-end'>
            <Text className='font-title text-xl text-primary'>{item.elo_rating}</Text>
            {trend === 'up' && <TrendingUp size={13} color='#00D54B' />}
            {trend === 'down' && <TrendingDown size={13} color='#F97316' />}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View className='flex-1 bg-background'>
      <View
        className='absolute left-0 right-0 z-20 border-b border-border bg-background/95 px-4 pb-3'
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text className='font-title text-2xl text-foreground'>Leaderboard</Text>
        <Text className='mt-1 text-xs text-muted-foreground'>
          El orgullo barrial se mide en puntos Elo.
        </Text>

        <View className='mt-3'>
          <FlatList
            data={FORMAT_CHIPS as readonly { label: string; value: string }[]}
            horizontal
            keyExtractor={(chip) => chip.value}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedFormat(item.value as (typeof FORMAT_CHIPS)[number]['value'])}
                className={`mr-2 rounded-full border px-4 py-2 ${
                  selectedFormat === item.value
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-card'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedFormat === item.value ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View className='mt-3 rounded-xl border border-border bg-card px-3 py-2'>
          <View className='flex-row items-center gap-2'>
            <Search size={16} color='#A1A1AA' />
            <TextInput
              value={zoneSearch}
              onChangeText={setZoneSearch}
              placeholder='Buscar zona (Palermo, Lanús...)'
              placeholderTextColor='#6B7280'
              className='flex-1 text-sm text-foreground'
            />
          </View>
          <FlatList
            data={[{ label: 'Global', value: 'ALL' }, ...filteredZones.map((zone) => ({ label: zone, value: zone }))]}
            horizontal
            keyExtractor={(item) => item.value}
            showsHorizontalScrollIndicator={false}
            className='mt-2'
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedZone(item.value)}
                className={`mr-2 rounded-full border px-3 py-1 ${
                  selectedZone === item.value
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-secondary'
                }`}
              >
                <Text
                  className={`text-[11px] ${
                    selectedZone === item.value ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRanking(true)}
            tintColor='#00D54B'
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 220,
          paddingBottom: 32,
        }}
        ListHeaderComponent={
          <View>
            {loading && (
              <View className='items-center py-12'>
                <ActivityIndicator size='large' color='#00D54B' />
                <Text className='mt-2 text-sm text-muted-foreground'>Cargando ranking...</Text>
              </View>
            )}

            {!loading && showTop10Celebration && (
              <View className='mx-4 mb-5 flex-row items-center rounded-2xl border border-primary/30 bg-primary/10 p-3'>
                {canUseLottie ? (
                  <LottieView
                    source={require('../../assets/animations/soccer-loader3.json')}
                    autoPlay={true}
                    loop={true}
                    style={{ width: 56, height: 56 }}
                    onAnimationFailure={() => setLottieFailed(true)}
                  />
                ) : (
                  <Trophy size={28} color='#FBBF24' />
                )}
                <View className='ml-2 flex-1'>
                  <Text className='font-semibold text-primary'>Top 10 desbloqueado</Text>
                  <Text className='text-xs text-muted-foreground'>
                    Tu equipo está peleando arriba. Mantené el ritmo.
                  </Text>
                </View>
              </View>
            )}

            {!loading && podium.length > 0 && (
              <View className='mx-4 mb-6 rounded-3xl border border-border bg-card px-4 pb-4 pt-5'>
                <Text className='mb-4 text-center font-title text-lg text-foreground'>Hall of Fame</Text>

                <View className='flex-row items-end justify-center'>
                  <PodiumSlot rank={2} team={podium[1]} onPress={handleOpenTeam} />
                  <PodiumSlot rank={1} team={podium[0]} onPress={handleOpenTeam} center />
                  <PodiumSlot rank={3} team={podium[2]} onPress={handleOpenTeam} />
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View className='items-center py-10'>
              <Text className='font-semibold text-foreground'>Sin resultados</Text>
              <Text className='mt-1 text-xs text-muted-foreground'>
                Ajustá los filtros para explorar otras zonas.
              </Text>
            </View>
          ) : null
        }
      />

      <TeamDetailModal
        visible={showDetailModal}
        team={selectedTeam}
        teamMembers={selectedTeamMembers}
        myTeams={myTeams}
        selectedTeamId={myTeams[0]?.id ?? ''}
        onSelectTeam={() => {}}
        onClose={() => setShowDetailModal(false)}
        onChallenge={() => showToast('Desafía a este equipo desde la pestaña Rivales', 'info')}
        onAccept={() => {}}
        onReject={() => {}}
        onCancel={() => {}}
        relationship='NONE'
      />
    </View>
  )
}

function PodiumSlot({
  rank,
  team,
  onPress,
  center = false,
}: {
  rank: 1 | 2 | 3
  team?: TeamRankingItem
  onPress: (teamId: string) => void
  center?: boolean
}) {
  if (!team) {
    return <View className='w-[30%]' />
  }

  const colors = {
    1: {
      border: 'border-amber-300/70',
      bg: 'bg-amber-200/10',
      badge: 'bg-amber-300/25 text-amber-200',
      medal: '🥇',
    },
    2: {
      border: 'border-slate-300/60',
      bg: 'bg-slate-300/10',
      badge: 'bg-slate-300/20 text-slate-200',
      medal: '🥈',
    },
    3: {
      border: 'border-orange-400/55',
      bg: 'bg-orange-400/10',
      badge: 'bg-orange-300/20 text-orange-200',
      medal: '🥉',
    },
  }[rank]

  return (
    <TouchableOpacity
      onPress={() => onPress(team.id)}
      activeOpacity={0.85}
      className={`mx-1 w-[31%] rounded-2xl border ${colors.border} ${colors.bg} p-3 ${
        center ? 'pb-5 pt-4' : ''
      }`}
    >
      <View className='items-center'>
        {rank === 1 && <Crown size={18} color='#FBBF24' />}

        <View className='my-2 h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary'>
          {team.logo_url ? (
            <Image source={{ uri: team.logo_url }} className='h-full w-full' resizeMode='cover' />
          ) : (
            <Shield size={20} color='#A1A1AA' strokeWidth={2} />
          )}
        </View>

        <Text className='text-center text-xs font-semibold text-foreground' numberOfLines={1}>
          {team.name}
        </Text>
        <Text className='mt-1 text-sm font-title text-primary'>{team.elo_rating}</Text>

        <View className='mt-2 rounded-full border border-white/10 px-2 py-0.5'>
          <Text className='text-[11px] text-foreground'>
            {colors.medal} {rank}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
