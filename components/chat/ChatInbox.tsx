import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth.service'
import { Conversation, dmService } from '@/services/dm.service'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { router, useFocusEffect } from 'expo-router'
import { MessageCircle, Trash2 } from 'lucide-react-native'
import React, { useCallback, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

export function ChatInbox() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    const { showToast } = useToast()

    // SECURITY FIX (Task 0.3): useRef to store channel reference for proper cleanup
    // This prevents memory leaks by ensuring we can remove the exact channel instance
    const channelRef = useRef<RealtimeChannel | null>(null)

    useFocusEffect(
        useCallback(() => {
            let isMounted = true

            async function setup() {
                loadConversations()

                // Realtime setup with race condition protection
                const session = await authService.getSession()
                if (!isMounted) return

                const uid = session.data?.user?.id
                if (!uid) return

                setCurrentUserId(uid)

                // Clean up any existing channel before creating a new one (safety net)
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current)
                    channelRef.current = null
                }

                // Create new channel
                const channel = supabase.channel(`inbox-${uid}`)
                channelRef.current = channel

                channel
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'direct_messages',
                            // SECURITY (Task 0.5): We rely on Supabase RLS policies to filter messages.
                            // The policy "Users can view messages in their conversations" ensures
                            // we only receive events for messages where we are participants.
                        },
                        (payload) => {
                            // When a new message arrives, reload conversations to update order and unread status
                            console.log('New message received via realtime', payload)
                            if (isMounted) {
                                loadConversations()
                            }
                        },
                    )
                    .subscribe()
            }

            setup()

            return () => {
                isMounted = false
                // SECURITY FIX: Proper cleanup of Realtime channel
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current)
                    channelRef.current = null
                }
            }
        }, []),
    )

    async function loadConversations() {
        if (!refreshing) setLoading(true)
        const res = await dmService.getConversations()
        if (res.success && res.data) {
            setConversations(res.data)
        }
        setLoading(false)
        setRefreshing(false)
    }

    async function handleDelete(id: string) {
        Alert.alert(
            'Eliminar chat',
            '¿Estás seguro de que quieres eliminar esta conversación?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const res = await dmService.deleteConversation(id)
                        if (res.success) {
                            showToast('Chat eliminado', 'success')
                            setConversations((prev) => prev.filter((c) => c.id !== id))
                        } else {
                            showToast('Error al eliminar chat', 'error')
                        }
                    },
                },
            ],
        )
    }

    const renderItem = ({ item }: { item: Conversation }) => {
        // LÓGICA ASIMÉTRICA para chats TEAM_PLAYER
        let displayName = item.other_user?.full_name || 'Usuario'
        let displayAvatar = item.other_user?.avatar_url
        let displaySubtext = item.other_user?.username ? `@${item.other_user.username}` : ''
        
        if (item.chat_type === 'TEAM_PLAYER' && item.team_info) {
            // Es un chat jugador-equipo, determinar qué mostrar
            const imThePlayer = currentUserId === item.player_id;
            
            if (imThePlayer) {
                // SOY EL JUGADOR: Mostrar info del EQUIPO
                displayName = item.team_info.name
                displayAvatar = item.team_info.logo_url
                displaySubtext = `${item.team_info.category} • ${item.team_info.home_zone}`
            } else {
                // SOY PARTE DEL EQUIPO: Mostrar info del JUGADOR
                displayName = item.other_user?.full_name || 'Jugador'
                displayAvatar = item.other_user?.avatar_url
                displaySubtext = item.other_user?.username ? `@${item.other_user.username}` : 'Interesado en el equipo'
            }
        }

        return (
            <TouchableOpacity
                onPress={() => router.push(`/chat/${item.id}` as any)}
                className='bg-card p-4 rounded-xl border border-border mb-3 flex-row items-center gap-4 active:bg-secondary/50'
            >
                {/* Avatar */}
                <View className='w-14 h-14 bg-secondary rounded-full overflow-hidden border border-border items-center justify-center flex-shrink-0'>
                    {displayAvatar ? (
                        <Image
                            source={{ uri: displayAvatar }}
                            className='w-full h-full'
                            resizeMode='cover'
                        />
                    ) : (
                        <Text className='text-muted-foreground font-bold text-xl'>
                            {displayName[0] || '?'}
                        </Text>
                    )}
                </View>

                {/* Info */}
                <View className='flex-1 min-w-0'>
                    <View className='flex-row justify-between items-center mb-1'>
                        <Text className='text-foreground font-bold text-base flex-1 mr-2' numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text className='text-muted-foreground text-xs'>
                            {new Date(item.last_message_at).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                            })}
                        </Text>
                    </View>

                    {displaySubtext && (
                        <Text className='text-muted-foreground text-xs mb-1.5' numberOfLines={1}>
                            {displaySubtext}
                        </Text>
                    )}

                    <View className='flex-row items-center justify-between'>
                        <View className='flex-row items-center gap-1.5'>
                            <MessageCircle size={12} color='#A1A1AA' strokeWidth={2} />
                            <Text className='text-muted-foreground text-xs'>
                                Ver conversación
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Delete Action */}
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                    }}
                    className='p-2.5 bg-destructive/10 rounded-lg border border-destructive/30 active:bg-destructive/20'
                >
                    <Trash2 size={18} color='#D93036' strokeWidth={2} />
                </TouchableOpacity>
            </TouchableOpacity>
        )
    }

    if (loading && !refreshing) {
        return (
            <View className='flex-1 items-center justify-center pt-20'>
                <ActivityIndicator size='large' color='#00D54B' />
            </View>
        )
    }

    return (
        <View className='flex-1 bg-background'>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true)
                            loadConversations()
                        }}
                        tintColor='#00D54B'
                    />
                }
                ListEmptyComponent={
                    <View className='items-center justify-center mt-20 px-6'>
                        <View className='w-20 h-20 bg-card rounded-2xl items-center justify-center mb-4 border border-border'>
                            <MessageCircle size={40} color='#6B7280' strokeWidth={2} />
                        </View>
                        <Text className='text-foreground font-title text-xl text-center mb-2'>
                            Sin conversaciones
                        </Text>
                        <Text className='text-muted-foreground text-center'>
                            Tus chats aparecerán aquí
                        </Text>
                    </View>
                }
            />
        </View>
    )
}
