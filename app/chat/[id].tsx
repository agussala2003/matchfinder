import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth.service'
import { Conversation, DirectMessage, dmService } from '@/services/dm.service'

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Send } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function ChatScreen() {
    const { id } = useLocalSearchParams()
    const conversationId = id as string
    const router = useRouter()
    const { showToast } = useToast()
    const insets = useSafeAreaInsets()

    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<DirectMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string>('')
    const [inputText, setInputText] = useState('')
    const [sending, setSending] = useState(false)

    const flatListRef = useRef<FlatList>(null)

    useEffect(() => {
        let isMounted = true

        async function setup() {
            setLoading(true)
            const session = await authService.getSession()
            const uid = session.data?.user?.id

            if (!isMounted) return
            if (!uid) {
                setLoading(false)
                return
            }

            setUserId(uid)

            // Load Chat Data
            const convRes = await dmService.getConversationById(conversationId)
            if (isMounted && convRes.success && convRes.data) {
                setConversation(convRes.data)
            } else if (isMounted) {
                showToast('Error al cargar chat', 'error')
            }

            const msgRes = await dmService.getMessages(conversationId)
            if (isMounted && msgRes.success && msgRes.data) {
                setMessages(msgRes.data)
            }

            if (isMounted) setLoading(false)
        }

        setup()

        // Setup Realtime Subscription (simplified like match chat)
        if (!conversationId) return

        const channel = supabase
            .channel(`dm-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    console.log('[Chat] New message received via Realtime:', payload.new)
                    setMessages((prev) => [payload.new as DirectMessage, ...prev])
                }
            )
            .subscribe((status) => {
                console.log(`[Chat] Subscription status for dm-${conversationId}:`, status)
            })

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [conversationId, showToast])

    // Helper functions moved inside effect or kept if pure, but logic is now inside setup()
    // We removed loadChat and setupRealtime standalone functions to avoid race conditions and closure staleness

    async function handleSend() {
        if (!inputText.trim() || sending) return

        setSending(true)
        const content = inputText.trim()
        setInputText('')

        const res = await dmService.sendMessage(conversationId, content)
        if (!res.success) {
            showToast('Error al enviar mensaje', 'error')
            setInputText(content)
        }
        setSending(false)
    }

    const renderMessage = ({ item }: { item: DirectMessage }) => {
        const isMe = item.sender_id === userId
        return (
            <View className={`mb-2 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                {/* Avatar para mensajes del otro usuario */}
                {!isMe && (
                    <View className='mr-2 justify-end pb-1'>
                        <View className='w-8 h-8 bg-card rounded-full items-center justify-center border border-border overflow-hidden'>
                            {conversation?.other_user?.avatar_url ? (
                                <Image
                                    source={{ uri: conversation.other_user.avatar_url }}
                                    className='w-full h-full'
                                    resizeMode='cover'
                                />
                            ) : (
                                <Text className='text-muted-foreground font-bold text-sm'>
                                    {conversation?.other_user?.full_name?.[0] || '?'}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <View className='max-w-[75%]'>
                    {/* Nombre del usuario (solo para el otro) */}
                    {!isMe && (
                        <Text className='text-primary text-xs font-bold mb-1 ml-1'>
                            {conversation?.other_user?.full_name}
                        </Text>
                    )}

                    {/* Burbuja de mensaje */}
                    <View
                        className={`px-3 py-2 rounded-2xl ${isMe ? 'bg-secondary rounded-tr-sm' : 'bg-primary/90 rounded-tl-sm'
                            }`}
                    >
                        <Text
                            className={`text-base leading-5 ${isMe ? 'text-foreground' : 'text-primary-foreground font-medium'
                                }`}
                        >
                            {item.content}
                        </Text>
                        <Text
                            className={`text-[10px] mt-1 self-end ${isMe ? 'text-muted-foreground' : 'text-primary-foreground/60'
                                }`}
                        >
                            {new Date(item.created_at).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            })}
                        </Text>
                    </View>
                </View>
            </View>
        )
    }

    if (loading) {
        return (
            <View className='flex-1 bg-background items-center justify-center'>
                <ActivityIndicator size='large' color='#00D54B' />
            </View>
        )
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className='flex-1 bg-background'
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className='px-4 py-3 pt-12 bg-card border-b-2 border-border flex-row items-center gap-3'>
                <TouchableOpacity onPress={() => router.back()} className='p-2 -ml-2 active:opacity-60'>
                    <ArrowLeft size={24} color='#FBFBFB' strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Avatar */}
                <View className='w-11 h-11 bg-secondary rounded-full overflow-hidden border border-border items-center justify-center'>
                    {conversation?.chat_type === 'TEAM_PLAYER' && conversation?.team_info?.logo_url ? (
                        <Image
                            source={{ uri: conversation.team_info.logo_url }}
                            className='w-full h-full'
                            resizeMode='cover'
                        />
                    ) : conversation?.other_user?.avatar_url ? (
                        <Image
                            source={{ uri: conversation.other_user.avatar_url }}
                            className='w-full h-full'
                            resizeMode='cover'
                        />
                    ) : (
                        <Text className='text-muted-foreground font-bold text-xl'>
                            {conversation?.chat_type === 'TEAM_PLAYER'
                                ? (conversation?.team_info?.name?.[0] || 'E')
                                : (conversation?.other_user?.full_name?.[0] || '?')
                            }
                        </Text>
                    )}
                </View>

                <View className='flex-1 min-w-0'>
                    <Text className='text-foreground font-bold text-base' numberOfLines={1}>
                        {conversation?.chat_type === 'TEAM_PLAYER'
                            ? conversation?.team_info?.name || 'Equipo'
                            : (conversation?.other_user?.full_name || 'Usuario')
                        }
                    </Text>
                    {conversation?.chat_type === 'TEAM_PLAYER' ? (
                        <Text className='text-muted-foreground text-xs'>
                            {conversation?.team_info?.category} • {conversation?.team_info?.home_zone}
                        </Text>
                    ) : (
                        conversation?.other_user?.username && (
                            <Text className='text-muted-foreground text-xs'>@{conversation.other_user.username}</Text>
                        )
                    )}
                </View>
            </View>

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Input Area */}
            <View
                className='px-3 py-3 bg-card border-t-2 border-border flex-row items-end gap-3'
                style={{
                    paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 12) : 12,
                }}
            >
                <TextInput
                    className='flex-1 bg-background text-foreground min-h-[48px] max-h-[120px] px-4 py-3 rounded-2xl border-2 border-border focus:border-primary'
                    placeholder='Escribe un mensaje...'
                    placeholderTextColor='#6B7280'
                    multiline
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => {
                        handleSend()
                        Keyboard.dismiss()
                    }}
                    returnKeyType='send'
                    textAlignVertical='center'
                    blurOnSubmit={false}
                />

                <TouchableOpacity
                    onPress={() => {
                        handleSend()
                        Keyboard.dismiss()
                    }}
                    disabled={!inputText.trim() || sending}
                    className={`w-12 h-12 rounded-full items-center justify-center ${!inputText.trim() ? 'bg-muted' : 'bg-primary active:bg-primary/80'
                        }`}
                >
                    <Send
                        size={20}
                        color={!inputText.trim() ? '#6B7280' : '#121217'}
                        strokeWidth={2.5}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    )
}