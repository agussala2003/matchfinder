import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

export type MatchStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'LIVE'
  | 'FINISHED'
  | 'WO_A'
  | 'WO_B'
  | 'WO_B'
  | 'CANCELLED'

export interface MatchResult {
  match_id: string
  goals_a: number
  goals_b: number
  is_draw?: boolean
  confirmed_by_a?: boolean
  confirmed_by_b?: boolean
}

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

  /**
   * Verifica si hay un match activo entre dos equipos específicos
   * Estados activos: PENDING, CONFIRMED, LIVE
   * Estados terminados: FINISHED, WO_A, WO_B, CANCELLED
   */
  async getActiveMatchBetweenTeams(
    teamAId: string,
    teamBId: string,
  ): Promise<ServiceResponse<MatchDetail | null>> {
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
        .or(
          `and(team_a_id.eq.${teamAId},team_b_id.eq.${teamBId}),and(team_a_id.eq.${teamBId},team_b_id.eq.${teamAId})`,
        )
        .in('status', ['PENDING', 'CONFIRMED', 'LIVE']) // Solo matches activos
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        return { success: true, data: null }
      }

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
      is_friendly: boolean
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

  async saveMatchResult(result: MatchResult): Promise<ServiceResponse> {
    try {
      // Upsert into match_results
      const { error } = await supabase
        .from('match_results')
        .upsert(result, { onConflict: 'match_id' })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error saving match result:', error)
      return { success: false, error: (error as Error).message }
    }
  }
  async getUserUpcomingMatches(userId: string): Promise<ServiceResponse<MatchPreview[]>> {
    try {
      // 1. Get user teams
      const { data: teams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')

      if (!teams || teams.length === 0) return { success: true, data: [] }

      const teamIds = teams.map((t) => t.team_id)

      // 2. Get matches for these teams
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
          team_b:teams!team_b_id (id, name, logo_url)
        `,
        )
        .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
        .in('status', ['CONFIRMED', 'LIVE'])
        .gte('scheduled_at', new Date().toISOString()) // Only future matches
        .order('scheduled_at', { ascending: true }) // Closest first

      if (error) throw error

      const matches: MatchPreview[] = (data || []).map((m: any) => {
        const myTeamId = teamIds.find((id) => id === m.team_a.id || id === m.team_b.id)
        const isHome = m.team_a.id === myTeamId // Approximation, actually implies relation to user's team

        return {
          id: m.id,
          scheduled_at: m.scheduled_at,
          status: m.status as MatchStatus,
          is_friendly: m.is_friendly,
          booking_confirmed: m.booking_confirmed,
          my_role: isHome ? 'HOME' : 'AWAY',
          rival: m.team_a.id === myTeamId ? m.team_b : m.team_a,
          // last_message omitted for list view efficiency if not needed
        }
      })

      return { success: true, data: matches }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}


export const matchesService = new MatchesService()
