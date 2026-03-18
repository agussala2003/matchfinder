import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'
import { Tables } from '@/types/supabase'

type MatchMessageRow = Tables<'match_messages'>
type ProfileRow = Tables<'profiles'>

function toChatMessage(
  row: MatchMessageRow,
  profile: Pick<ProfileRow, 'full_name' | 'username'> | null,
): ChatMessage {
  return {
    id: row.id,
    match_id: row.match_id,
    sender_team_id: row.sender_team_id,
    content: row.content ?? '',
    type: row.type === 'PROPOSAL' ? 'PROPOSAL' : 'TEXT',
    proposal_data:
      row.proposal_data && typeof row.proposal_data === 'object' && !Array.isArray(row.proposal_data)
        ? (row.proposal_data as ChatMessage['proposal_data'])
        : undefined,
    status:
      row.status === 'ACCEPTED' || row.status === 'REJECTED' || row.status === 'CANCELLED'
        ? row.status
        : 'SENT',
    created_at: row.created_at ?? '',
    sender_user_id: row.sender_user_id ?? undefined,
    profile: profile
      ? {
          full_name: profile.full_name,
          username: profile.username ?? '',
        }
      : undefined,
  }
}

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
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = (data ?? []) as MatchMessageRow[]
      const senderIds = Array.from(
        new Set(rows.map((row) => row.sender_user_id).filter((id): id is string => Boolean(id))),
      )

      let profilesById = new Map<string, Pick<ProfileRow, 'full_name' | 'username'>>()

      if (senderIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', senderIds)

        if (profilesError) throw profilesError

        profilesById = new Map(
          (profiles ?? []).map((profile) => [
            profile.id,
            { full_name: profile.full_name, username: profile.username },
          ]),
        )
      }

      return {
        success: true,
        data: rows.map((row) => toChatMessage(row, row.sender_user_id ? profilesById.get(row.sender_user_id) ?? null : null)),
      }
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
