import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

class TeamChatService {
    /**
     * Crear o obtener una conversación entre un jugador y un equipo
     */
    async getOrCreateTeamConversation(teamId: string, playerId: string): Promise<ServiceResponse<string>> {
        try {
            // 1. Obtener el capitán del equipo
            const { data: teamData, error: teamError } = await supabase
                .from('team_members')
                .select(`
                    user_id,
                    teams!inner (
                        id,
                        name,
                        logo_url
                    )
                `)
                .eq('team_id', teamId)
                .eq('role', 'ADMIN')
                .single()

            if (teamError || !teamData) {
                return { success: false, error: 'No se encontró el capitán del equipo' }
            }

            const captainId = teamData.user_id

            // 2. Verificar si ya existe una conversación TEAM_PLAYER para este jugador y equipo
            const [p1, p2] = [playerId, captainId].sort()
            
            const { data: existing } = await supabase
                .from('conversations')
                .select('*')
                .eq('chat_type', 'TEAM_PLAYER')
                .eq('team_context_id', teamId)
                .or(`and(participant_a.eq.${p1},participant_b.eq.${p2})`)
                .single()

            if (existing) {
                return { success: true, data: existing.id }
            }

            // 3. Crear nueva conversación de equipo
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    participant_a: p1,
                    participant_b: p2,
                    chat_type: 'TEAM_PLAYER',
                    team_context_id: teamId
                })
                .select()
                .single()

            if (createError) throw createError
            return { success: true, data: newConv.id }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Ya no es necesario este método, la información del equipo viene directamente de la BD
     */
    async enrichConversationWithTeamInfo(conversationId: string, currentUserId: string): Promise<ServiceResponse<any>> {
        // Método obsoleto - la nueva estructura de BD ya incluye esta información
        return { success: false, error: 'Método obsoleto' }
    }
}

export const teamChatService = new TeamChatService()