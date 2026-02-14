import { supabase } from '@/lib/supabase'

export interface Conversation {
    id: string
    participant_a: string
    participant_b: string
    last_message_at: string
    created_at: string
    other_user?: {
        id: string
        full_name: string
        username: string
        avatar_url: string
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
    async getOrCreateConversation(otherUserId: string): Promise<{ success: boolean; data?: Conversation; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            // Ensure consistent ordering to check existence
            const [p1, p2] = [user.id, otherUserId].sort()

            // 1. Check if exists
            const { data: existing, error: fetchError } = await supabase
                .from('conversations')
                .select('*')
                .or(`and(participant_a.eq.${p1},participant_b.eq.${p2})`)
                .single()

            if (existing) return { success: true, data: existing }

            // 2. Create if not exists
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    participant_a: p1,
                    participant_b: p2
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
                    user_a:participant_a (id, full_name, username, avatar_url),
                    user_b:participant_b (id, full_name, username, avatar_url)
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            // Determine which one is "other"
            const otherUser = data.participant_a === user.id ? data.user_b : data.user_a

            const conversationData: Conversation = {
                ...data,
                other_user: otherUser
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

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    user_a:participant_a (id, full_name, username, avatar_url),
                    user_b:participant_b (id, full_name, username, avatar_url)
                `)
                .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
                .order('last_message_at', { ascending: false })

            if (error) throw error

            const conversations = data.map(c => ({
                ...c,
                other_user: c.participant_a === user.id ? c.user_b : c.user_a
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
