import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

export interface ChatMessage {
  id: string
  match_id: string
  sender_team_id: string
  content: string
  type: 'TEXT' | 'PROPOSAL'
  proposal_data?: { date: string; time: string }
  status: 'SENT' | 'ACCEPTED' | 'REJECTED'
  created_at: string
}

class ChatService {
  /**
   * Obtener historial de mensajes
   */
  async getMessages(matchId: string): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase
        .from('match_messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false }) // Más nuevos primero para el chat invertido

      if (error) throw error
      return { success: true, data: data as ChatMessage[] }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Enviar Mensaje de Texto
   */
  async sendText(matchId: string, teamId: string, content: string): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.from('match_messages').insert({
        match_id: matchId,
        sender_team_id: teamId,
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
   * Responder Propuesta (Aceptar/Rechazar)
   */
  async respondProposal(
    messageId: string,
    status: 'ACCEPTED' | 'REJECTED',
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
