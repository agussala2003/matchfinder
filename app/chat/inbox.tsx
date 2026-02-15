import { useToast } from '@/context/ToastContext'
import { Conversation, dmService } from '@/services/dm.service'
import { router, Stack, useFocusEffect } from 'expo-router'
import { MessageCircle, Trash2 } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
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

export default function ChatInboxScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const { showToast } = useToast()

    const loadConversations = useCallback(async () => {
        if (!refreshing) setLoading(true)
        const res = await dmService.getConversations()
        if (res.success && res.data) {
            setConversations(res.data)
        }
        setLoading(false)
        setRefreshing(false)
    }, [refreshing])

    useFocusEffect(
        useCallback(() => {
            loadConversations()
        }, [loadConversations]),
    )

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
        return (
            <TouchableOpacity
                onPress={() => router.push(`/chat/${item.id}` as any)}
                className='bg-card p-4 rounded-xl border border-border mb-3 flex-row items-center gap-4 active:bg-secondary/50'
            >
                {/* Avatar */}
                <View className='w-14 h-14 bg-secondary rounded-full overflow-hidden border border-border items-center justify-center flex-shrink-0'>
                    {item.other_user?.avatar_url ? (
                        <Image
                            source={{ uri: item.other_user.avatar_url }}
                            className='w-full h-full'
                            resizeMode='cover'
                        />
                    ) : (
                        <Text className='text-muted-foreground font-bold text-xl'>
                            {item.other_user?.full_name?.[0] || '?'}
                        </Text>
                    )}
                </View>

                {/* Info */}
                <View className='flex-1 min-w-0'>
                    <Text className='text-foreground font-bold text-base mb-1' numberOfLines={1}>
                        {item.other_user?.full_name || 'Usuario'}
                    </Text>
                    {item.other_user?.username && (
                        <Text className='text-muted-foreground text-xs mb-1.5'>
                            @{item.other_user.username}
                        </Text>
                    )}
                    <View className='flex-row items-center gap-1.5'>
                        <MessageCircle size={12} color='#A1A1AA' strokeWidth={2} />
                        <Text className='text-muted-foreground text-xs'>
                            {new Date(item.last_message_at).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                            })}
                        </Text>
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

    return (
        <View className='flex-1 bg-background'>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Mensajes',
                    headerStyle: { backgroundColor: '#1A1A21' },
                    headerTintColor: '#FBFBFB',
                    headerTitleStyle: { fontFamily: 'Inter_700Bold' },
                    headerShadowVisible: false,
                }}
            />

            {loading && !refreshing ? (
                <View className='flex-1 items-center justify-center'>
                    <ActivityIndicator size='large' color='#00D54B' />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
            )}
        </View>
    )
}