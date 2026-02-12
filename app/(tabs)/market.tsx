import { CreatePostModal } from '@/components/market/CreatePostModal'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { marketService } from '@/services/market.service'
import { MarketPost } from '@/types/market'
import { useFocusEffect } from 'expo-router'
import { Plus, Shield, User, X } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

export default function MarketScreen() {
  const [posts, setPosts] = useState<MarketPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [filterType, setFilterType] = useState<'ALL' | 'TEAM_SEEKING_PLAYER' | 'PLAYER_SEEKING_TEAM'>('ALL')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const { showToast } = useToast()

  useFocusEffect(
    useCallback(() => {
      loadPosts()
      checkUser()
    }, [filterType])
  )

  async function checkUser() {
    const session = await authService.getSession()
    if (session.data?.user) setCurrentUserId(session.data.user.id)
  }

  async function loadPosts() {
    setLoading(true)
    const type = filterType === 'ALL' ? undefined : filterType
    const res = await marketService.getPosts(type)
    if (res.success && res.data) {
      setPosts(res.data)
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function handleDelete(id: string) {
    const res = await marketService.deletePost(id)
    if (res.success) {
      showToast('Publicación eliminada', 'info')
      setPosts(prev => prev.filter(p => p.id !== id))
    } else {
      showToast('Error al eliminar', 'error')
    }
  }

  const renderPost = ({ item }: { item: MarketPost }) => {
    const isOwner = item.user_id === currentUserId || (item.team && item.team.id /* logic for team owner needed but waiting for expanded profile... for now check user_id if we saved it in post */)
    // Actually we saved user_id in the post for both types!

    const isTeamPost = item.type === 'TEAM_SEEKING_PLAYER'
    const title = isTeamPost ? (item.team?.name || 'Equipo') : (item.profile?.full_name || 'Jugador')
    const subtitle = isTeamPost
      ? `Busca: ${item.position_needed || 'Jugador'}`
      : `Posición: ${item.position_needed || 'Cualquiera'}`

    const imageUrl = isTeamPost ? item.team?.logo_url : item.profile?.avatar_url

    return (
      <View className="bg-card p-4 rounded-xl border border-border mb-3 flex-row gap-4">
        {/* Avatar/Logo */}
        <View className="w-14 h-14 bg-secondary rounded-full items-center justify-center border border-border overflow-hidden shrink-0">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" />
          ) : (
            isTeamPost ? <Shield size={24} color="#A1A1AA" /> : <User size={24} color="#A1A1AA" />
          )}
        </View>

        {/* Content */}
        <View className="flex-1 justify-center">
          <View className="flex-row justify-between items-start">
            <View className="shrink-1">
              <Text className="text-foreground font-bold text-base">{title}</Text>
              <Text className="text-primary font-bold text-sm mb-1">{subtitle}</Text>
            </View>
            {item.user_id === currentUserId && (
              <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-1 -mt-2 -mr-2">
                <X size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          {item.description && (
            <Text className="text-text-muted text-xs italic" numberOfLines={2}>
              "{item.description}"
            </Text>
          )}

          <View className="flex-row items-center gap-2 mt-2">
            <View className={`px-2 py-0.5 rounded border ${isTeamPost ? 'bg-blue-500/10 border-blue-500/50' : 'bg-green-500/10 border-green-500/50'}`}>
              <Text className={`text-[10px] font-bold ${isTeamPost ? 'text-blue-500' : 'text-green-500'}`}>
                {isTeamPost ? 'BUSCA JUGADOR' : 'BUSCA EQUIPO'}
              </Text>
            </View>
            {item.team?.home_zone && (
              <Text className="text-text-muted text-[10px] flex-1">📍 {item.team.home_zone}</Text>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScreenLayout loading={false} withPadding={false} className="bg-background">
      <View className="p-4 gap-4 flex-1">
        {/* Header & Filters */}
        <View>
          <Text className="text-text-main text-2xl font-bold mb-4">Mercado de Pases</Text>
          <View className="flex-row gap-2">
            <FilterChip label="Todos" active={filterType === 'ALL'} onPress={() => setFilterType('ALL')} />
            <FilterChip label="Equipos" active={filterType === 'TEAM_SEEKING_PLAYER'} onPress={() => setFilterType('TEAM_SEEKING_PLAYER')} />
            <FilterChip label="Jugadores" active={filterType === 'PLAYER_SEEKING_TEAM'} onPress={() => setFilterType('PLAYER_SEEKING_TEAM')} />
          </View>
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator color="#00D54B" className="mt-10" />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} tintColor="#00D54B" />}
            ListEmptyComponent={
              <View className="items-center justify-center mt-20">
                <Text className="text-text-muted text-center">No hay publicaciones activas.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB */}
      <View className="absolute bottom-4 right-4">
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg border-2 border-white/20"
        >
          <Plus size={30} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <CreatePostModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={loadPosts}
      />
    </ScreenLayout>
  )
}

const FilterChip = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-4 py-2 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-transparent border-border'}`}
  >
    <Text className={`font-bold text-xs ${active ? 'text-black' : 'text-text-muted'}`}>{label}</Text>
  </TouchableOpacity>
)
