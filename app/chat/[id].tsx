import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth.service'
import { Conversation, dmService } from '@/services/dm.service'

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Send, Shield } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
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

// --- COMPONENTE DE MENSAJE ANIMADO ---
const AnimatedMessageItem = ({ item, userId, conversation }: { item: any, userId: string, conversation: Conversation | null }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(10)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start()
    }, [])

    const isMe = item.sender_id === userId
    
    // --- LÓGICA DE BANDO (CRÍTICA) ---
    let isMySide = false
    
    // Verificamos si estamos en un chat de equipo
    // Nota: Agregamos check de team_id por si chat_type viene mal de una migración vieja
    if (conversation?.chat_type === 'TEAM_PLAYER' || conversation?.team_id) {
        const amIThePlayer = userId === conversation?.player_id
        
        if (amIThePlayer) {
            // CASO 1: SOY EL JUGADOR CANDIDATO
            // Solo mis mensajes van a la derecha. El resto (Equipo) a la izquierda.
            isMySide = isMe
        } else {
            // CASO 2: SOY PARTE DEL EQUIPO (Capitán o Sub)
            // Cualquier mensaje que NO sea del jugador externo, es de "MI BANDO" (Equipo).
            // Esto agrupa a Capitán y Sub-Capitán a la derecha.
            isMySide = item.sender_id !== conversation?.player_id
        }
    } else {
        // Chat Directo estándar
        isMySide = isMe
    }

    // Identificar roles para mostrar nombres
    // Es compañero si está en mi lado pero NO soy yo
    const isTeammate = isMySide && !isMe

    return (
        <Animated.View 
            style={{ 
                opacity: fadeAnim, 
                transform: [{ translateY: slideAnim }],
                marginBottom: 8,
                flexDirection: 'row',
                justifyContent: isMySide ? 'flex-end' : 'flex-start',
                width: '100%'
            }}
        >
            {/* Avatar del Oponente (Izquierda) */}
            {!isMySide && (
                <View className='mr-2 justify-end pb-1'>
                    <View className='w-8 h-8 bg-card rounded-full items-center justify-center border border-border overflow-hidden'>
                        <AvatarDisplay item={item} conversation={conversation} userId={userId} />
                    </View>
                </View>
            )}

            <View className={`max-w-[75%] ${isMySide ? 'items-end' : 'items-start'}`}>
                
                {/* ETIQUETA DE NOMBRE (Arriba de la burbuja) */}
                <Text className={`text-[10px] mb-1 font-bold ${isMySide ? 'mr-1 text-right' : 'ml-1 text-left'}`}>
                    {isMe ? (
                        <Text className="text-primary">Yo</Text>
                    ) : isTeammate ? (
                        <Text className="text-primary">{item.sender?.full_name?.split(' ')[0]}</Text>
                    ) : (
                        <Text className="text-muted-foreground">{item.sender?.full_name}</Text>
                    )}
                </Text>

                {/* BURBUJA */}
                <View
                    className={`px-4 py-2.5 rounded-2xl ${
                        isMySide 
                            ? 'bg-primary/90 rounded-tr-sm' // Mis mensajes / Equipo -> Verde
                            : 'bg-card rounded-tl-sm border border-border' // Oponente -> Gris
                    }`}
                >
                    <Text
                        className={`text-base leading-5 ${
                            isMySide ? 'text-primary-foreground font-medium' : 'text-foreground'
                        }`}
                    >
                        {item.content}
                    </Text>
                </View>
                
                {/* HORA */}
                <Text
                    className={`text-[9px] text-muted-foreground mt-1 ${
                        isMySide ? 'mr-1' : 'ml-1'
                    }`}
                >
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </Animated.View>
    )
}

// --- PANTALLA PRINCIPAL ---
export default function ChatScreen() {
    const { id } = useLocalSearchParams()
    const conversationId = id as string
    const router = useRouter()
    const { showToast } = useToast()
    const insets = useSafeAreaInsets()

    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<any[]>([]) 
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

            // Cargar datos del chat
            const convRes = await dmService.getConversationById(conversationId)
            if (isMounted && convRes.success && convRes.data) {
                setConversation(convRes.data)
            }

            const msgRes = await dmService.getMessages(conversationId)
            if (isMounted && msgRes.success && msgRes.data) {
                setMessages(msgRes.data)
            }

            if (isMounted) setLoading(false)
        }

        setup()

        // Suscripción Realtime
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
                async (payload) => {
                    // Traer mensaje completo con datos del sender
                    const { data } = await supabase
                        .from('direct_messages')
                        .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
                        .eq('id', payload.new.id)
                        .single()
                    
                    if (data) {
                        setMessages((prev) => [data, ...prev])
                    }
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [conversationId])

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

    // Información del Header Dinámico
    const getHeaderInfo = () => {
        if (!conversation) return { title: 'Chat', subtitle: '' }
        
        // Si soy el jugador, hablo con el Equipo
        if (conversation.player_id === userId && conversation.team_info) {
            return {
                title: conversation.team_info.name,
                subtitle: 'Equipo',
                avatar: conversation.team_info.logo_url,
                isTeam: true
            }
        }
        
        // Si soy el equipo, hablo con el Jugador
        return {
            title: conversation.other_user?.full_name || 'Usuario',
            subtitle: conversation.other_user?.username ? `@${conversation.other_user.username}` : 'Candidato',
            avatar: conversation.other_user?.avatar_url,
            isTeam: false
        }
    }

    const headerData = getHeaderInfo()

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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View 
                style={{ paddingTop: insets.top }} 
                className='bg-card border-b border-border px-4 pb-3 pt-2 flex-row items-center gap-3'
            >
                <TouchableOpacity onPress={() => router.back()} className='p-2 -ml-2 rounded-full active:bg-secondary'>
                    <ArrowLeft size={24} color='#FBFBFB' />
                </TouchableOpacity>
                
                <View className='w-10 h-10 rounded-full overflow-hidden border border-border bg-secondary items-center justify-center'>
                    {headerData.avatar ? (
                        <Image source={{ uri: headerData.avatar }} className='w-full h-full' resizeMode='cover' />
                    ) : (
                        headerData.isTeam ? <Shield size={20} color="#A1A1AA" /> : <Text className='text-muted-foreground font-bold'>{headerData.title[0]}</Text>
                    )}
                </View>
                
                <View className='flex-1'>
                    <Text className='text-foreground font-bold text-base' numberOfLines={1}>{headerData.title}</Text>
                    <Text className='text-muted-foreground text-xs'>{headerData.subtitle}</Text>
                </View>
            </View>

            {/* Lista de Mensajes */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <AnimatedMessageItem item={item} userId={userId} conversation={conversation} />
                )}
                inverted
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Input */}

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
                    }}
                    disabled={!inputText.trim() || sending}
                    className={`w-11 h-11 rounded-full items-center justify-center ${
                        !inputText.trim() ? 'bg-muted' : 'bg-primary active:bg-primary/80'
                    }`}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color={!inputText.trim() ? '#6B7280' : '#121217'} />
                    ) : (
                        <Send
                            size={20}
                            color={!inputText.trim() ? '#6B7280' : '#121217'}
                            strokeWidth={2.5}
                            className="ml-0.5"
                        />
                    )}
                </TouchableOpacity>
            </View>

            
        </KeyboardAvoidingView>
    )
}

// Subcomponente para renderizar Avatar en la lista
const AvatarDisplay = ({ item, conversation, userId }: any) => {
    // Si es chat de equipo y yo soy el jugador, el otro lado es el Equipo (usamos logo si no hay avatar individual)
    if (conversation?.chat_type === 'TEAM_PLAYER' && conversation.player_id === userId) {
        // Mostrar avatar del sender (miembro del equipo) o fallback al escudo
        return item.sender?.avatar_url ? (
            <Image source={{ uri: item.sender.avatar_url }} className='w-full h-full' resizeMode='cover' />
        ) : (
            conversation.team_info?.logo_url ? (
                <Image source={{ uri: conversation.team_info.logo_url }} className='w-full h-full' resizeMode='cover' />
            ) : (
                <Shield size={16} color="#A1A1AA" strokeWidth={2} />
            )
        )
    }

    // Caso normal (o yo soy el capitán viendo al jugador)
    return item.sender?.avatar_url ? (
        <Image source={{ uri: item.sender.avatar_url }} className='w-full h-full' resizeMode='cover' />
    ) : (
        <Text className='text-muted-foreground font-bold text-xs'>
            {item.sender?.full_name?.[0] || '?'}
        </Text>
    )
}