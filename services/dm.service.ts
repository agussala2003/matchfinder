import { supabase } from '@/lib/supabase'
import { Enums, Tables } from '@/types/supabase'

type ConversationRow = Tables<'conversations'>
type DirectMessageRow = Tables<'direct_messages'>
type ProfileRow = Tables<'profiles'>
type TeamRow = Tables<'teams'>

type ConversationChatType = 'DIRECT' | 'TEAM_PLAYER'

type ProfileLite = Pick<ProfileRow, 'id' | 'full_name' | 'username' | 'avatar_url'>
type TeamLite = Pick<TeamRow, 'id' | 'name' | 'logo_url' | 'category' | 'home_zone'>

type ConversationWithRelations = ConversationRow & {
    team: TeamLite | null
    player: ProfileLite | null
}

type MessageWithSender = DirectMessageRow & {
    sender: ProfileLite | null
}

function normalizeChatType(chatType: string): ConversationChatType {
    return chatType === 'TEAM_PLAYER' ? 'TEAM_PLAYER' : 'DIRECT'
}

export interface Conversation {
    id: string
    team_id: string | null
    player_id: string | null  
    chat_type: 'DIRECT' | 'TEAM_PLAYER'
    last_message_at: string
    created_at: string
    last_message_preview?: string | null
    unread_count?: number
    has_unread?: boolean
    other_user?: {
        id: string
        full_name: string
        username: string | null
        avatar_url: string | null
    }
    team_info?: {
        id: string
        name: string
        logo_url: string | null
        category: Enums<'team_category'>
        home_zone: string
    }
}

export interface DirectMessage {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_read: boolean
    created_at: string
}

export interface DirectMessageWithSender extends DirectMessage {
    sender?: {
        id: string
        full_name: string
        username: string | null
        avatar_url: string | null
    } | null
    sender_team_id: string | null
}

function toConversationBase(row: ConversationRow): Conversation {
    return {
        id: row.id,
        team_id: row.team_id,
        player_id: row.player_id,
        chat_type: normalizeChatType(row.chat_type),
        last_message_at: row.last_message_at,
        created_at: row.created_at,
    }
}

async function getProfileById(userId: string): Promise<ProfileLite | null> {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', userId)
        .maybeSingle()

    return data
}

export const dmService = {
    // Obtener o Crear conversación DIRECTA (Usuario a Usuario)
    async getOrCreateConversation(otherUserId: string): Promise<{ success: boolean; data?: Conversation; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            // 1. Verificar si ya existe
            const { data: existing, error: fetchError } = await supabase
                .from('conversations')
                .select('*')
                .eq('chat_type', 'DIRECT')
                .or(`and(player_id.eq.${user.id},team_id.eq.${otherUserId}),and(player_id.eq.${otherUserId},team_id.eq.${user.id})`)
                .maybeSingle()

            if (fetchError) throw fetchError

            if (existing) return { success: true, data: toConversationBase(existing) }

            // 2. Crear si no existe
            // Workaround: Usamos team_id para guardar el ID del otro usuario en chats directos
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    player_id: user.id,
                    team_id: otherUserId, 
                    chat_type: 'DIRECT'
                })
                .select()
                .single()

            if (createError) throw createError
            return { success: true, data: toConversationBase(newConv) }
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message }
        }
    },

    // Obtener detalle de una conversación por ID
    async getConversationById(id: string): Promise<{ success: boolean; data?: Conversation; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    team:team_id (id, name, logo_url, category, home_zone),
                    player:player_id (id, full_name, username, avatar_url)
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            const row = data as ConversationWithRelations

            let otherUser: ProfileLite | null = null
            let teamInfo: TeamLite | null = null

            if (row.chat_type === 'TEAM_PLAYER') {
                if (row.player_id === user.id) {
                    // Soy el JUGADOR -> Veo la info del Equipo
                    teamInfo = row.team
                } else {
                    // Soy el CAPITÁN/SUB -> Veo la info del Jugador
                    otherUser = row.player
                    teamInfo = row.team // (Opcional: guardar ref del equipo)
                }
            } else if (row.chat_type === 'DIRECT') {
                if (row.player_id === user.id) {
                    if (row.team_id) {
                        otherUser = await getProfileById(row.team_id)
                    }
                } else {
                    otherUser = row.player
                }
            }

            const conversationData: Conversation = {
                ...toConversationBase(row),
                other_user: otherUser ?? undefined,
                team_info: teamInfo ?? undefined,
            }

            return { success: true, data: conversationData }
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message }
        }
    },

    // Traer mensajes de una conversación
    async getMessages(conversationId: string): Promise<{ success: boolean; data?: DirectMessageWithSender[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('direct_messages')
            .select(`
                *,
                sender:profiles!sender_id (id, full_name, username, avatar_url)
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })

        if (error) throw error
        const messages = ((data ?? []) as MessageWithSender[]).map((message) => ({
            id: message.id,
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            sender_team_id: message.sender_team_id,
            content: message.content,
            is_read: message.is_read ?? false,
            created_at: message.created_at,
            sender: message.sender ?? null,
        }))

        return { success: true, data: messages }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
},

    // Enviar mensaje
    async sendMessage(conversationId: string, content: string): Promise<{ success: boolean; data?: DirectMessage; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const { data, error } = await supabase
                .from('direct_messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content
                })
                .select()
                .single()

            if (error) throw error

            // Actualizar timestamp de último mensaje
            await supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversationId)

            return {
                success: true,
                data: {
                    id: data.id,
                    conversation_id: data.conversation_id,
                    sender_id: data.sender_id,
                    content: data.content,
                    is_read: data.is_read ?? false,
                    created_at: data.created_at,
                },
            }
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message }
        }
    },

    // Listar todas las conversaciones (Inbox)
    async getConversations(): Promise<{ success: boolean; data?: Conversation[]; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            // 1. Obtener equipos donde soy ADMIN o SUB_ADMIN (CORREGIDO)
            const { data: myTeams } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id)
                .in('role', ['ADMIN', 'SUB_ADMIN']) // <-- PERMITE QUE SUB_ADMINS VEAN CHATS

            const myTeamIds = myTeams?.map(t => t.team_id) || []

            // 2. Construir query
            let orCondition = `player_id.eq.${user.id},team_id.eq.${user.id}`
            
            // Si gestiono equipos, incluyo los chats dirigidos a esos equipos
            if (myTeamIds.length > 0) {
                orCondition += `,team_id.in.(${myTeamIds.join(',')})`
            }

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    team:team_id (id, name, logo_url, category, home_zone),
                    player:player_id (id, full_name, username, avatar_url)
                `)
                .or(orCondition)
                .order('last_message_at', { ascending: false })

            if (error) throw error

            const rows = (data ?? []) as ConversationWithRelations[]
            const conversationIds = rows.map((c) => c.id)

            let messageRows: Pick<
                DirectMessageRow,
                'conversation_id' | 'content' | 'sender_id' | 'is_read' | 'created_at'
            >[] = []

            if (conversationIds.length > 0) {
                const { data: fetchedMessageRows, error: messagesError } = await supabase
                    .from('direct_messages')
                    .select('conversation_id, content, sender_id, is_read, created_at')
                    .in('conversation_id', conversationIds)
                    .order('created_at', { ascending: false })

                if (messagesError) throw messagesError
                messageRows = fetchedMessageRows ?? []
            }

            const lastMessageByConversation = new Map<string, string>()
            const unreadCountByConversation = new Map<string, number>()

            for (const message of messageRows) {
                const conversationId = message.conversation_id
                if (!conversationId) continue

                if (!lastMessageByConversation.has(conversationId)) {
                    lastMessageByConversation.set(conversationId, message.content ?? '')
                }

                const isUnreadFromOtherUser =
                    message.is_read === false &&
                    !!message.sender_id &&
                    message.sender_id !== user.id

                if (isUnreadFromOtherUser) {
                    unreadCountByConversation.set(
                        conversationId,
                        (unreadCountByConversation.get(conversationId) ?? 0) + 1,
                    )
                }
            }

            // 3. Procesar para vista asimétrica
            const conversations = await Promise.all(rows.map(async (c) => {
                let otherUser: ProfileLite | null = null
                let teamInfo: TeamLite | null = null

                if (c.chat_type === 'TEAM_PLAYER') {
                    if (c.player_id === user.id) {
                        // Soy el JUGADOR -> Muestro el Equipo
                        teamInfo = c.team
                    } else {
                        // Soy ADMIN/SUB -> Muestro al Jugador postulante
                        otherUser = c.player
                        teamInfo = c.team // Referencia útil
                    }
                } else if (c.chat_type === 'DIRECT') {
                    if (c.player_id === user.id && c.team_id) {
                        otherUser = await getProfileById(c.team_id)
                    } else {
                        otherUser = c.player
                    }
                }

                return {
                    ...toConversationBase(c),
                    last_message_preview: lastMessageByConversation.get(c.id) ?? null,
                    unread_count: unreadCountByConversation.get(c.id) ?? 0,
                    has_unread: (unreadCountByConversation.get(c.id) ?? 0) > 0,
                    other_user: otherUser ?? undefined,
                    team_info: teamInfo ?? undefined,
                }
            }))

            return { success: true, data: conversations }
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message }
        }
    },

    async deleteConversation(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', id)

            if (error) throw error
            return { success: true }
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message }
        }
    },

    async markConversationAsRead(
        conversationId: string,
        currentUserId: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('direct_messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .eq('is_read', false)
                .neq('sender_id', currentUserId)

            if (error) throw error
            return { success: true }
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message }
        }
    }
}