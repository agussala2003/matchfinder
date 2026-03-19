import { supabase } from '@/lib/supabase'
import { notificationsService } from '@/services/notifications.service'
import { ServiceResponse } from '@/types/core'
import { Enums, Tables, TablesInsert, TablesUpdate } from '@/types/supabase'
import { calculateNewElos } from '@/utils/elo'

export type MatchStatus = Enums<'estado_partido_enum'>

type TeamRow = Tables<'teams'>
type VenueRow = Tables<'venues'>
type MatchRow = Tables<'matches'>
type MatchMessageRow = Tables<'match_messages'>

type TeamSummary = Pick<TeamRow, 'id' | 'name' | 'logo_url'>
type VenueSummary = Pick<VenueRow, 'id' | 'name' | 'address' | 'latitude' | 'longitude'>
type LastMessageSummary = Pick<MatchMessageRow, 'content' | 'sender_team_id' | 'created_at' | 'type'>
type TeamEloSummary = Pick<TeamRow, 'id' | 'elo_rating'>
type TeamLeadershipRow = {
  user_id: string
  role: Enums<'rol_enum'> | null
  status: Enums<'estado_miembro_enum'> | null
}

type MatchWithTeams = MatchRow & {
  team_a: TeamSummary | null
  team_b: TeamSummary | null
  venue?: VenueSummary | null
  match_messages?: LastMessageSummary[] | null
}

const ACTIVE_MATCH_STATUSES: MatchStatus[] = ['PENDING', 'CONFIRMED', 'LIVE']
const UPCOMING_MATCH_STATUSES: MatchStatus[] = ['PENDING', 'CONFIRMED']
const LIVE_OR_CONFIRMED_STATUSES: MatchStatus[] = ['CONFIRMED', 'LIVE']

function normalizeStatus(status: MatchRow['status']): MatchStatus {
  return status ?? 'PENDING'
}

function mapTeamSummary(team: TeamSummary): { id: string; name: string; logo_url?: string } {
  return {
    id: team.id,
    name: team.name,
    logo_url: team.logo_url ?? undefined,
  }
}

function mapVenueSummary(venue: VenueSummary | null | undefined):
  | {
      id: string
      name: string
      address: string
      latitude: number
      longitude: number
    }
  | undefined {
  if (!venue) return undefined
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }
}

function mapLastMessage(
  message: LastMessageSummary | undefined,
):
  | {
      content: string
      sender_team_id: string
      created_at: string
      type: string
    }
  | undefined {
  if (!message) return undefined
  if (!message.content || !message.sender_team_id || !message.created_at || !message.type) return undefined

  return {
    content: message.content,
    sender_team_id: message.sender_team_id,
    created_at: message.created_at,
    type: message.type,
  }
}

function toMatchDetail(row: MatchWithTeams): MatchDetail | null {
  if (!row.team_a || !row.team_b) return null

  return {
    id: row.id,
    scheduled_at: row.scheduled_at,
    status: normalizeStatus(row.status),
    is_friendly: row.is_friendly ?? false,
    booking_confirmed: row.booking_confirmed ?? false,
    wo_evidence_url: row.wo_evidence_url,
    team_a: mapTeamSummary(row.team_a),
    team_b: mapTeamSummary(row.team_b),
    venue: mapVenueSummary(row.venue),
    season_id: row.season_id,
    checkin_team_a: row.checkin_team_a ?? false,
    checkin_team_b: row.checkin_team_b ?? false,
  }
}

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
  venue?: { id: string; name: string; address: string; latitude: number; longitude: number }
  season_id: string | null
  checkin_team_a: boolean
  checkin_team_b: boolean
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

      const rows = (data ?? []) as MatchWithTeams[]
      const matches = rows
        .map((row): MatchPreview | null => {
          if (!row.team_a || !row.team_b) return null

          const isHome = row.team_a.id === teamId
          const messages = (row.match_messages ?? []).slice().sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
            return bTime - aTime
          })

          const lastMessage = mapLastMessage(messages[0])

          const preview: MatchPreview = {
            id: row.id,
            scheduled_at: row.scheduled_at,
            status: normalizeStatus(row.status),
            is_friendly: row.is_friendly ?? false,
            booking_confirmed: row.booking_confirmed ?? false,
            my_role: isHome ? 'HOME' : 'AWAY',
            rival: mapTeamSummary(isHome ? row.team_b : row.team_a),
          }

          if (lastMessage) {
            preview.last_message = lastMessage
          }

          return preview
        })
        .filter((m): m is MatchPreview => m !== null)

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
        .in('status', ACTIVE_MATCH_STATUSES) // Solo matches activos
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        return { success: true, data: null }
      }

      const row = data as MatchWithTeams
      const match = toMatchDetail(row)
      if (!match) {
        return { success: false, error: 'Partido incompleto: faltan equipos relacionados' }
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
          venue:venues (id, name, address, latitude, longitude)
        `,
        )
        .eq('id', matchId)
        .single()

      if (error) throw error

      const row = data as MatchWithTeams
      const match = toMatchDetail(row)
      if (!match) {
        return { success: false, error: 'Partido incompleto: faltan equipos relacionados' }
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
      const payload: TablesUpdate<'matches'> = updates
      const { error } = await supabase.from('matches').update(payload).eq('id', matchId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async saveMatchResult(result: MatchResult): Promise<ServiceResponse> {
    try {
      const payload: TablesInsert<'match_results'> = { ...result }

      // Always persist latest submitted scoreboard.
      const { error: upsertError } = await supabase
        .from('match_results')
        .upsert(payload, { onConflict: 'match_id' })

      if (upsertError) throw upsertError

      // Idempotency guard: if match is already FINISHED, Elo must not be recalculated.
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, status, team_a_id, team_b_id')
        .eq('id', result.match_id)
        .single()

      if (matchError) throw matchError

      if (!matchData.team_a_id || !matchData.team_b_id) {
        throw new Error('No se pudieron resolver ambos equipos del partido')
      }

      if (matchData.status === 'FINISHED') {
        return { success: true }
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, elo_rating')
        .in('id', [matchData.team_a_id, matchData.team_b_id])

      if (teamsError) throw teamsError

      const typedTeams = (teamsData ?? []) as TeamEloSummary[]
      const teamA = typedTeams.find((team) => team.id === matchData.team_a_id)
      const teamB = typedTeams.find((team) => team.id === matchData.team_b_id)

      if (!teamA || !teamB) {
        throw new Error('No se encontraron ratings Elo de ambos equipos')
      }

      const eloA = teamA.elo_rating ?? 1000
      const eloB = teamB.elo_rating ?? 1000

      const { newEloA, newEloB } = calculateNewElos(eloA, eloB, result.goals_a, result.goals_b)

      const { error: applyEloError } = await supabase.rpc('apply_match_elo_once', {
        p_match_id: result.match_id,
        p_team_a_id: matchData.team_a_id,
        p_team_b_id: matchData.team_b_id,
        p_new_elo_a: newEloA,
        p_new_elo_b: newEloB,
      })

      if (applyEloError) throw applyEloError

      // Notify rival leadership to review and confirm the loaded match result.
      try {
        const submittingTeamId = result.confirmed_by_a
          ? matchData.team_a_id
          : result.confirmed_by_b
            ? matchData.team_b_id
            : null
        const rivalTeamId = result.confirmed_by_a
          ? matchData.team_b_id
          : result.confirmed_by_b
            ? matchData.team_a_id
            : null

        if (submittingTeamId && rivalTeamId) {
          const { data: submitterTeam, error: submitterTeamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', submittingTeamId)
            .single()

          if (!submitterTeamError && submitterTeam?.name) {
            const { data: rivalLeads, error: rivalLeadsError } = await supabase
              .from('team_members')
              .select('user_id, role, status')
              .eq('team_id', rivalTeamId)
              .eq('status', 'ACTIVE')
              .in('role', ['ADMIN', 'SUB_ADMIN'])

            if (!rivalLeadsError) {
              const typedLeads = (rivalLeads ?? []) as TeamLeadershipRow[]
              const notifications = typedLeads
                .filter((lead) => lead.user_id)
                .map((lead) =>
                  notificationsService.createNotification({
                    user_id: lead.user_id,
                    type: 'MATCH_RESULT',
                    title: 'Resultado pendiente de confirmacion',
                    message: `⚽ ${submitterTeam.name} ha cargado el resultado del partido. ¡Entra a confirmar para actualizar tu Ranking!`,
                    data: { matchId: result.match_id, source: 'MATCH_RESULT_CONFIRMATION' },
                  }),
                )

              if (notifications.length > 0) {
                await Promise.all(notifications)
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('Error sending match result notifications:', notificationError)
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving match result:', error)
      return { success: false, error: (error as Error).message }
    }
  }
  async getUserNextMatch(userId: string): Promise<ServiceResponse<MatchDetail | null>> {
    try {
      // 1. Get active team memberships
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')

      if (!memberships || memberships.length === 0) return { success: true, data: null }

      const teamIds = memberships.map((m) => m.team_id)

      // 2. Fetch the single closest upcoming match
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
        .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
        .in('status', UPCOMING_MATCH_STATUSES)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return { success: true, data: null }

      const row = data as MatchWithTeams
      const match = toMatchDetail(row)
      if (!match) {
        return { success: false, error: 'Partido incompleto: faltan equipos relacionados' }
      }

      return { success: true, data: match }
    } catch (error) {
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
        .in('status', LIVE_OR_CONFIRMED_STATUSES)
        .gte('scheduled_at', new Date().toISOString()) // Only future matches
        .order('scheduled_at', { ascending: true }) // Closest first

      if (error) throw error

      const rows = (data ?? []) as MatchWithTeams[]
      const matches: MatchPreview[] = rows
        .map((row) => {
          if (!row.team_a || !row.team_b) return null

          const myTeamId = teamIds.find((id) => id === row.team_a?.id || id === row.team_b?.id)
          if (!myTeamId) return null

          const isHome = row.team_a.id === myTeamId

          return {
            id: row.id,
            scheduled_at: row.scheduled_at,
            status: normalizeStatus(row.status),
            is_friendly: row.is_friendly ?? false,
            booking_confirmed: row.booking_confirmed ?? false,
            my_role: isHome ? 'HOME' : 'AWAY',
            rival: mapTeamSummary(row.team_a.id === myTeamId ? row.team_b : row.team_a),
          }
        })
        .filter((m): m is MatchPreview => m !== null)

      return { success: true, data: matches }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async submitTeamCheckin(matchId: string, isTeamA: boolean): Promise<ServiceResponse> {
    try {
      const columnToUpdate = isTeamA ? 'checkin_team_a' : 'checkin_team_b'
      const { error } = await supabase
        .from('matches')
        .update({ [columnToUpdate]: true })
        .eq('id', matchId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}


export const matchesService = new MatchesService()
