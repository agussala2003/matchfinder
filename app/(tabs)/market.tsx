import { ChatInbox } from '@/components/chat/ChatInbox'
import { CreatePostModal } from '@/components/market/CreatePostModal'
import { MarketPostCard } from '@/components/market/MarketPostCard'
import { TeamSelectionModal } from '@/components/market/TeamSelectionModal'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { marketService } from '@/services/market.service'
import { teamsService } from '@/services/teams.service'
import { MarketPost } from '@/types/market'
import { Team } from '@/types/teams'
import { router, useFocusEffect } from 'expo-router'
import { MessageCircle, Plus, Shield, User, Users } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

const POSITIONS = [
  { label: 'Cualquiera', value: 'ANY' },
  { label: 'Arquero', value: 'Arquero' },
  { label: 'Defensor', value: 'Defensor' },
  { label: 'Mediocampista', value: 'Mediocampista' },
  { label: 'Delantero', value: 'Delantero' },
]

type Tab = 'PLAYERS' | 'TEAMS' | 'MESSAGES'

export default function MarketScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('PLAYERS') // 'PLAYERS' = Teams seeking players, 'TEAMS' = Players seeking teams

  // Data States
  const [posts, setPosts] = useState<MarketPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [teamSelectionVisible, setTeamSelectionVisible] = useState(false)
  const [selectedPost, setSelectedPost] = useState<MarketPost | null>(null)

  // Filters
  const [selectedPosition, setSelectedPosition] = useState<string>('ANY')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myTeamIds, setMyTeamIds] = useState<string[]>([])
  const { showToast } = useToast()

  useFocusEffect(
    useCallback(() => {
      checkUser()
    }, [])
  )

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'MESSAGES') {
        loadPosts()
      }
    }, [activeTab, selectedPosition, currentUserId, myTeamIds.length])
  )

  async function checkUser() {
    const session = await authService.getSession()
    if (session.data?.user) {
      const uid = session.data.user.id
      setCurrentUserId(uid)
      const teamsRes = await teamsService.getUserTeams(uid)
      if (teamsRes.success && teamsRes.data) {
        setMyTeamIds(teamsRes.data.map(t => t.id))
      }
    }
  }

  async function loadPosts() {
    setLoading(true)
    // Map Tab to Filter Type:
    // 'PLAYERS' Tab -> Display posts where TEAMS are seeking players (TEAM_SEEKING_PLAYER)
    // 'TEAMS' Tab -> Display posts where PLAYERS are seeking teams (PLAYER_SEEKING_TEAM)
    const type = activeTab === 'PLAYERS' ? 'TEAM_SEEKING_PLAYER' : (activeTab === 'TEAMS' ? 'PLAYER_SEEKING_TEAM' : undefined)

    if (type) {
      const res = await marketService.getPosts(type)
      if (res.success && res.data) {
        let data = res.data

        // Filter by Position
        if (selectedPosition && selectedPosition !== 'ANY') {
          data = data.filter(p => p.position_needed === selectedPosition)
        }

        // Filter out my teams (if I am in the team but not the owner of the post)
        if (type === 'TEAM_SEEKING_PLAYER' && myTeamIds.length > 0) {
          data = data.filter(p => {
            // Keep if I am the owner
            if (p.user_id === currentUserId) return true
            // Filter out if it is one of my teams
            if (p.team_id && myTeamIds.includes(p.team_id)) return false
            return true
          })
        }

        setPosts(data)
      }
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

  async function handleContact(post: MarketPost) {
    if (!currentUserId) {
      showToast('Debes iniciar sesión', 'error')
      return
    }

    setLoading(true)
    
    try {
      if (post.type === 'TEAM_SEEKING_PLAYER' && post.team_id) {
        // CASO 1: Equipo busca jugador - el jugador contacta al equipo
        const { teamChatService } = await import('@/services/team-chat.service')
        const res = await teamChatService.getOrCreateTeamConversation(post.team_id, currentUserId)
        
        if (res.success && res.data) {
          router.push(`/chat/${res.data}`)
        } else {
          showToast(res.error || 'Error al iniciar chat con el equipo', 'error')
        }
      } else if (post.type === 'PLAYER_SEEKING_TEAM') {
        // CASO 2: Jugador busca equipo - un equipo quiere contactar al jugador
        
        // Verificar qué equipos administro
        const managedTeamsRes = await teamsService.getUserManagedTeams(currentUserId)
        
        if (!managedTeamsRes.success || !managedTeamsRes.data || managedTeamsRes.data.length === 0) {
          showToast('Solo los capitanes pueden contactar jugadores', 'error')
          return
        }
        
        const managedTeams = managedTeamsRes.data
        
        if (managedTeams.length === 1) {
          // Solo administro un equipo, usar automáticamente
          await createTeamToPlayerConversation(post, managedTeams[0])
        } else {
          // Administro múltiples equipos, mostrar modal de selección
          setSelectedPost(post)
          setTeamSelectionVisible(true)
        }
      } else {
        showToast('Tipo de publicación no reconocido', 'error')
      }
    } catch (error) {
      console.error('Error in handleContact:', error)
      showToast('Error inesperado', 'error')
    } finally {
      if (post.type !== 'PLAYER_SEEKING_TEAM' || !selectedPost) {
        setLoading(false)
      }
    }
  }
  
  async function createTeamToPlayerConversation(post: MarketPost, fromTeam: Team) {
    if (!currentUserId || !post.user_id) return
    
    try {
      const { teamChatService } = await import('@/services/team-chat.service')
      const res = await teamChatService.getOrCreateTeamToPlayerConversation(
        fromTeam.id, 
        currentUserId,
      )
      
      if (res.success && res.data) {
        router.push(`/chat/${res.data}`)
      } else {
        showToast(res.error || 'Error al iniciar chat', 'error')
      }
    } catch (error) {
      console.error('Error creating team conversation:', error)
      showToast('Error inesperado', 'error')
    } finally {
      setLoading(false)
      setSelectedPost(null)
    }
  }
  
  function handleTeamSelection(team: Team) {
    if (selectedPost) {
      createTeamToPlayerConversation(selectedPost, team)
    }
    setTeamSelectionVisible(false)
  }

  function handleViewStats(post: MarketPost) {
    showToast('Ver Perfil: Próximamente', 'info')
  }

  return (
    <ScreenLayout loading={false} withPadding={false} className="bg-background">
      <View className="flex-1">

        {/* Tabs Header */}
        <View className="flex-row border-b border-border bg-card elevation-sm">
          <TouchableOpacity
            onPress={() => setActiveTab('PLAYERS')}
            className={`flex-1 items-center justify-center py-4 border-b-2 ${activeTab === 'PLAYERS' ? 'border-primary' : 'border-transparent'}`}
          >
            <Users size={20} color={activeTab === 'PLAYERS' ? '#00D54B' : '#A1A1AA'} />
            <Text className={`text-[10px] font-bold mt-1 uppercase ${activeTab === 'PLAYERS' ? 'text-primary' : 'text-muted-foreground'}`}>
              Buscan Jugador
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('TEAMS')}
            className={`flex-1 items-center justify-center py-4 border-b-2 ${activeTab === 'TEAMS' ? 'border-primary' : 'border-transparent'}`}
          >
            <User size={20} color={activeTab === 'TEAMS' ? '#00D54B' : '#A1A1AA'} />
            <Text className={`text-[10px] font-bold mt-1 uppercase ${activeTab === 'TEAMS' ? 'text-primary' : 'text-muted-foreground'}`}>
              Buscan Equipo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('MESSAGES')}
            className={`flex-1 items-center justify-center py-4 border-b-2 ${activeTab === 'MESSAGES' ? 'border-primary' : 'border-transparent'}`}
          >
            <MessageCircle size={20} color={activeTab === 'MESSAGES' ? '#00D54B' : '#A1A1AA'} />
            <Text className={`text-[10px] font-bold mt-1 uppercase ${activeTab === 'MESSAGES' ? 'text-primary' : 'text-muted-foreground'}`}>
              Mensajes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View className="flex-1 bg-background">
          {activeTab === 'MESSAGES' ? (
            <ChatInbox />
          ) : (
            <View className="flex-1">
              {/* Filters (Only for market tabs) */}
              <View className="px-4 py-4 bg-background z-10">
                <Select
                  label="Filtrar por Posición"
                  value={selectedPosition}
                  onChange={setSelectedPosition}
                  options={POSITIONS}
                  placeholder="Selecciona posición"
                />
              </View>

              {/* List */}
              {loading ? (
                <ActivityIndicator color="#00D54B" className="mt-10" />
              ) : (
                <FlatList
                  data={posts}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View className="px-4">
                      <MarketPostCard
                        item={item}
                        currentUserId={currentUserId}
                        onContact={handleContact}
                        onDelete={handleDelete}
                        onViewStats={handleViewStats}
                      />
                    </View>
                  )}
                  contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} tintColor="#00D54B" />}
                  ListEmptyComponent={
                    <View className="items-center justify-center mt-20 px-10">
                      <Shield size={48} color="#27272A" />
                      <Text className="text-muted-foreground text-center text-lg mt-4 mb-2">No hay publicaciones</Text>
                      <Text className="text-muted-foreground/60 text-center text-sm">
                        {activeTab === 'PLAYERS' ? 'Ningún equipo busca jugadores.' : 'Ningún jugador busca equipo.'}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </View>

        {/* FAB (Only for market tabs) */}
        {activeTab !== 'MESSAGES' && (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/30 z-50"
          >
            <Plus size={28} color="#121217" strokeWidth={3} />
          </TouchableOpacity>
        )}

        <CreatePostModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            loadPosts()
            setModalVisible(false)
          }}
        />
        
        <TeamSelectionModal
          visible={teamSelectionVisible}
          onClose={() => {
            setTeamSelectionVisible(false)
            setSelectedPost(null)
            setLoading(false)
          }}
          onSelectTeam={handleTeamSelection}
          userId={currentUserId || ''}
        />
      </View>
    </ScreenLayout>
  )
}
