import { supabase } from '@/lib/supabase'

export interface Conversation {
    id: string
    team_id: string | null
    player_id: string | null  
    chat_type: 'DIRECT' | 'TEAM_PLAYER'
    last_message_at: string
    created_at: string
    other_user?: {
        id: string
        full_name: string
        username: string
        avatar_url: string
    }
    team_info?: {
        id: string
        name: string
        logo_url: string
        category: string
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

            if (existing) return { success: true, data: existing }

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
            return { success: true, data: newConv }
        } catch (error: any) {
            return { success: false, error: error.message }
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

            let otherUser = null
            let teamInfo = null

            if (data.chat_type === 'TEAM_PLAYER') {
                if (data.player_id === user.id) {
                    // Soy el JUGADOR -> Veo la info del Equipo
                    teamInfo = data.team
                } else {
                    // Soy el CAPITÁN/SUB -> Veo la info del Jugador
                    otherUser = data.player
                    teamInfo = data.team // (Opcional: guardar ref del equipo)
                }
            } else if (data.chat_type === 'DIRECT') {
                if (data.player_id === user.id) {
                    if (data.team_id) {
                        const { data: otherUserData } = await supabase
                            .from('profiles')
                            .select('id, full_name, username, avatar_url')
                            .eq('id', data.team_id)
                            .single()
                        otherUser = otherUserData
                    }
                } else {
                    otherUser = data.player
                }
            }

            const conversationData: Conversation = {
                ...data,
                other_user: otherUser,
                team_info: teamInfo
            }

            return { success: true, data: conversationData }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // Traer mensajes de una conversación
    async getMessages(conversationId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
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
        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
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

            return { success: true, data }
        } catch (error: any) {
            return { success: false, error: error.message }
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

            // 3. Procesar para vista asimétrica
            const conversations = await Promise.all(data.map(async (c) => {
                let otherUser = null
                let teamInfo = null

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
                        const { data: otherUserData } = await supabase
                            .from('profiles')
                            .select('id, full_name, username, avatar_url')
                            .eq('id', c.team_id)
                            .single()
                        otherUser = otherUserData
                    } else {
                        otherUser = c.player
                    }
                }

                return {
                    ...c,
                    other_user: otherUser,
                    team_info: teamInfo
                }
            }))

            return { success: true, data: conversations }
        } catch (error: any) {
            return { success: false, error: error.message }
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
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }
}