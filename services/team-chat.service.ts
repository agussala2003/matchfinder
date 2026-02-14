import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

class TeamChatService {
    /**
     * Crear o obtener una conversación entre un equipo y un jugador
     * Usado cuando un EQUIPO (Capitán/Sub) contacta a un JUGADOR desde el Mercado
     */
    async getOrCreateTeamToPlayerConversation(teamId: string, targetPlayerId: string): Promise<ServiceResponse<string>> {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return { success: false, error: 'No autenticado' }

            // 1. Verificar permisos (ADMIN o SUB_ADMIN) (CORREGIDO)
            const { data: membership, error: memberError } = await supabase
                .from('team_members')
                .select('role')
                .eq('team_id', teamId)
                .eq('user_id', user.id)
                .in('role', ['ADMIN', 'SUB_ADMIN']) // <-- PERMITE QUE SUB_ADMINS INICIEN CHATS
                .single()

            if (memberError || !membership) {
                return { success: false, error: 'No tienes permisos para contactar en nombre de este equipo' }
            }

            // 2. Verificar si ya existe una conversación TEAM_PLAYER
            const { data: existing } = await supabase
                .from('conversations')
                .select('*')
                .eq('chat_type', 'TEAM_PLAYER')
                .eq('team_id', teamId)
                .eq('player_id', targetPlayerId)
                .maybeSingle()

            if (existing) {
                return { success: true, data: existing.id }
            }

            // 3. Crear nueva conversación
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    chat_type: 'TEAM_PLAYER',
                    team_id: teamId,
                    player_id: targetPlayerId
                })
                .select()
                .single()

            if (createError) throw createError
            return { success: true, data: newConv.id }
        } catch (error: any) {
            console.error('getOrCreateTeamToPlayerConversation error:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Crear o obtener conversación iniciada por un JUGADOR hacia un EQUIPO
     */
    async getOrCreateTeamConversation(teamId: string, playerId: string): Promise<ServiceResponse<string>> {
        try {
            // 1. Verificar que el equipo existe
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('id, name')
                .eq('id', teamId)
                .single()

            if (teamError || !teamData) {
                return { success: false, error: 'No se encontró el equipo' }
            }

            // 2. Verificar si ya existe
            const { data: existing } = await supabase
                .from('conversations')
                .select('*')
                .eq('chat_type', 'TEAM_PLAYER')
                .eq('team_id', teamId)
                .eq('player_id', playerId)
                .maybeSingle()

            if (existing) {
                return { success: true, data: existing.id }
            }

            // 3. Crear nueva
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    chat_type: 'TEAM_PLAYER',
                    team_id: teamId,
                    player_id: playerId
                })
                .select()
                .single()

            if (createError) throw createError
            return { success: true, data: newConv.id }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }
}

export const teamChatService = new TeamChatService()