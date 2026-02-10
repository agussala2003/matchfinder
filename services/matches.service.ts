import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

export type MatchStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'LIVE'
  | 'FINISHED'
  | 'WO_A'
  | 'WO_B'
  | 'CANCELLED'

export interface MatchPreview {
  id: string
  scheduled_at: string | null
  status: MatchStatus
  is_friendly: boolean
  booking_confirmed: boolean
  rival: {
    id: string
    name: string
    logo_url?: string
  }
  my_role: 'HOME' | 'AWAY'
  last_message?: {
    content: string
    sender_team_id: string
    created_at: string
    type: string
  }
}

export interface MatchDetail {
  id: string
  scheduled_at: string | null
  status: MatchStatus
  is_friendly: boolean
  booking_confirmed: boolean
  wo_evidence_url: string | null
  team_a: { id: string; name: string; logo_url?: string }
  team_b: { id: string; name: string; logo_url?: string }
  venue?: { id: string; name: string; address: string }
  season_id: string | null
}

class MatchesService {
  async getMyMatches(teamId: string): Promise<ServiceResponse<MatchPreview[]>> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          id,
          scheduled_at,
          status,
          is_friendly,
          booking_confirmed,
          team_a:teams!team_a_id (id, name, logo_url),
          team_b:teams!team_b_id (id, name, logo_url),
          match_messages (
            content,
            sender_team_id,
            created_at,
            type
          )
        `,
        )
        .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })

      if (error) throw error

      const matches: MatchPreview[] = (data || []).map((m: any) => {
        const isHome = m.team_a.id === teamId

        // Obtener el último mensaje
        const messages = m.match_messages || []
        const lastMsg = messages.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]

        return {
          id: m.id,
          scheduled_at: m.scheduled_at,
          status: m.status as MatchStatus,
          is_friendly: m.is_friendly,
          booking_confirmed: m.booking_confirmed,
          my_role: isHome ? 'HOME' : 'AWAY',
          rival: isHome ? m.team_b : m.team_a,
          last_message: lastMsg,
        }
      })

      return { success: true, data: matches }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async getMatchById(matchId: string): Promise<ServiceResponse<MatchDetail>> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          *,
          team_a:teams!team_a_id (id, name, logo_url),
          team_b:teams!team_b_id (id, name, logo_url),
          venue:venues (id, name, address)
        `,
        )
        .eq('id', matchId)
        .single()

      if (error) throw error

      const match: MatchDetail = {
        id: data.id,
        scheduled_at: data.scheduled_at,
        status: data.status as MatchStatus,
        is_friendly: data.is_friendly,
        booking_confirmed: data.booking_confirmed,
        wo_evidence_url: data.wo_evidence_url,
        team_a: data.team_a,
        team_b: data.team_b,
        venue: data.venue,
        season_id: data.season_id,
      }

      return { success: true, data: match }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async updateMatch(
    matchId: string,
    updates: Partial<{
      scheduled_at: string
      status: MatchStatus
      booking_confirmed: boolean
      venue_id: string
      wo_evidence_url: string
    }>,
  ): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.from('matches').update(updates).eq('id', matchId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}

export const matchesService = new MatchesService()
