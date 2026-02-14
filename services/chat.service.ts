import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

export interface ChatMessage {
  id: string
  match_id: string
  sender_team_id: string
  content: string
  type: 'TEXT' | 'PROPOSAL'
  proposal_data?: { date: string; time: string; isFriendly?: boolean; venue?: string; modality?: string; duration?: string }
  status: 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  created_at: string
  sender_user_id?: string
  profile?: {
    full_name: string
    username: string
  }
}

class ChatService {
  /**
   * Obtener historial de mensajes
   */
  async getMessages(matchId: string): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase
        .from('match_messages')
        .select(`
          *,
          profile:sender_user_id (
            full_name,
            username
          )
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data as any[] }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Enviar Mensaje de Texto
   */
  async sendText(matchId: string, teamId: string, content: string, userId: string): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.from('match_messages').insert({
        match_id: matchId,
        sender_team_id: teamId,
        sender_user_id: userId,
        content,
        type: 'TEXT',
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Enviar Propuesta de Fecha
   */
  async sendProposal(
    matchId: string,
    teamId: string,
    date: string,
    time: string,
  ): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.from('match_messages').insert({
        match_id: matchId,
        sender_team_id: teamId,
        content: 'Propuesta de partido',
        type: 'PROPOSAL',
        proposal_data: { date, time },
        status: 'SENT',
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Responder Propuesta (Aceptar/Rechazar/Cancelar)
   */
  async respondProposal(
    messageId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED',
  ): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.from('match_messages').update({ status }).eq('id', messageId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}

export const chatService = new ChatService()
