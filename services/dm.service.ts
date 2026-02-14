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
    // Get or Create a conversation between current user and another user
    // NOTE: This handles DIRECT chats. Team chats are handled in team-chat.service.ts
    async getOrCreateConversation(otherUserId: string): Promise<{ success: boolean; data?: Conversation; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            // For DIRECT conversations, we'll use player_id to store current user
            // and check if the other user has a conversation with us
            // This is a workaround since the current structure doesn't fully support DIRECT chats natively with separate participants table
            
            // 1. Check if exists - look for conversations where we are the player or where other user is the player
            const { data: existing, error: fetchError } = await supabase
                .from('conversations')
                .select('*')
                .eq('chat_type', 'DIRECT')
                .or(`and(player_id.eq.${user.id},team_id.eq.${otherUserId}),and(player_id.eq.${otherUserId},team_id.eq.${user.id})`)
                .maybeSingle()

            if (existing) return { success: true, data: existing }

            // 2. Create if not exists - use player_id for current user, team_id for other user (as workaround)
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    player_id: user.id,
                    team_id: otherUserId, // Using team_id as second participant (workaround)
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
                // Lógica Asimétrica:
                if (data.player_id === user.id) {
                    // Soy el Jugador -> Hablo con el Equipo
                    teamInfo = data.team
                    // otherUser se deja null para que la UI sepa que debe mostrar al equipo
                } else {
                    // Soy el Capitán/Admin -> Hablo con el Jugador
                    otherUser = data.player
                    teamInfo = data.team // Mantenemos ref al equipo por si acaso
                }
            } else if (data.chat_type === 'DIRECT') {
                // Direct chat (workaround logic)
                if (data.player_id === user.id) {
                    // Current user is the 'player', fetch 'team_id' as the other profile
                    if (data.team_id) {
                        const { data: otherUserData } = await supabase
                            .from('profiles')
                            .select('id, full_name, username, avatar_url')
                            .eq('id', data.team_id)
                            .single()
                        otherUser = otherUserData
                    }
                } else {
                    // I am the 'team_id' (other side), so 'player_id' is the other user
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

    async getMessages(conversationId: string): Promise<{ success: boolean; data?: DirectMessage[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('direct_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return { success: true, data }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

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

            // Update conversation last_timestamp
            await supabase
                .from('conversations')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', conversationId)

            return { success: true, data }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    async getConversations(): Promise<{ success: boolean; data?: Conversation[]; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            // 1. Obtener equipos donde soy ADMIN (para ver chats entrantes a mis equipos)
            const { data: myTeams } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id)
                .eq('role', 'ADMIN')

            const myTeamIds = myTeams?.map(t => t.team_id) || []

            // 2. Construir condición OR:
            // - Chats donde soy el usuario directo (player_id)
            // - Chats directos donde estoy en el slot 'team_id' (workaround)
            // - Chats de EQUIPO donde el equipo es uno de los míos (team_id IN myTeamIds)
            
            let orCondition = `player_id.eq.${user.id},team_id.eq.${user.id}`
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

            // 3. Procesar resultados para determinar "other_user" según el contexto
            const conversations = await Promise.all(data.map(async (c) => {
                let otherUser = null
                let teamInfo = null

                if (c.chat_type === 'TEAM_PLAYER') {
                    // Lógica Asimétrica
                    if (c.player_id === user.id) {
                        // Soy el Jugador: Me interesa ver la info del Equipo
                        teamInfo = c.team
                    } else {
                        // Soy el Capitán: Me interesa ver la info del Jugador postulante
                        otherUser = c.player
                        teamInfo = c.team
                    }
                } else if (c.chat_type === 'DIRECT') {
                    // Direct Chat Workaround
                    if (c.player_id === user.id && c.team_id) {
                        // Buscar info del otro usuario almacenado en team_id
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