import { supabase } from '@/lib/supabase'
import { Challenge } from '@/types/challenges'
import { ServiceResponse } from '@/types/core'
import { Enums, Tables } from '@/types/supabase'
import { Team } from '@/types/teams'

type TeamRow = Tables<'teams'>
type ChallengeRow = Tables<'challenges'>
type ChallengeStatus = Enums<'challenge_status'>

type TeamWithMemberCount = TeamRow & {
  member_count: { count: number | null }[] | { count: number | null } | null
}

type ChallengeWithTeams = ChallengeRow & {
  challenger: TeamRow | null
  target: TeamRow | null
}

type RivalTeam = Team & {
  member_count: number
}

function toTeam(team: TeamRow): Team {
  return {
    id: team.id,
    name: team.name,
    captain_id: team.captain_id ?? '',
    elo_rating: team.elo_rating ?? 1200,
    home_zone: team.home_zone as Team['home_zone'],
    category: team.category,
    share_code: team.share_code ?? '',
    logo_url: team.logo_url ?? undefined,
    created_at: team.created_at ?? '',
  }
}

function normalizeChallengeStatus(status: ChallengeRow['status']): ChallengeStatus {
  return status ?? 'PENDING'
}

function toChallenge(row: ChallengeWithTeams): Challenge {
  return {
    id: row.id,
    challenger_team_id: row.challenger_team_id,
    target_team_id: row.target_team_id,
    status: normalizeChallengeStatus(row.status),
    created_at: row.created_at ?? '',
    challenger: row.challenger ? toTeam(row.challenger) : undefined,
    target: row.target ? toTeam(row.target) : undefined,
  }
}

class ChallengesService {
  // ... (otros métodos)

  /**
   * Buscar rivales con filtros y CONTEO de miembros
   */
  async searchRivals(
    myTeamId: string,
    query: string = '',
    zone: string = 'ANY',
  ): Promise<ServiceResponse<RivalTeam[]>> {
    try {
      let supabaseQuery = supabase
        .from('teams')
        .select('*, member_count:team_members(count)') // Traemos el conteo
        .neq('id', myTeamId) // No mostrar mi propio equipo

      if (zone !== 'ANY') {
        supabaseQuery = supabaseQuery.eq('home_zone', zone)
      }

      if (query.trim()) {
        supabaseQuery = supabaseQuery.ilike('name', `%${query}%`)
      }

      const { data, error } = await supabaseQuery

      if (error) throw error
      const rows = (data ?? []) as TeamWithMemberCount[]

      // Limpiamos la data para que member_count sea un número
      const formattedData: RivalTeam[] = rows.map((team) => ({
        ...toTeam(team),
        // Supabase a veces devuelve [{count: 5}] o {count: 5}, lo normalizamos:
        member_count: Array.isArray(team.member_count)
          ? (team.member_count[0]?.count ?? 0)
          : team.member_count?.count || 0,
      }))

      return { success: true, data: formattedData }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // ... (resto de métodos sendChallenge, updateStatus, getMyChallenges igual que antes)
  // ... imports

  async sendChallenge(challengerId: string, targetId: string): Promise<ServiceResponse> {
    try {
      // 1. Verificar si se puede enviar nuevo challenge usando la nueva validación
      const canSendRes = await this.canSendNewChallenge(challengerId, targetId)
      if (!canSendRes.success) {
        return { success: false, error: canSendRes.error }
      }

      if (!canSendRes.data) {
        return { success: false, error: 'Ya existe un desafío o partido activo' }
      }

      // 2. Buscar si existe un challenge previo (para reactivar o crear nuevo)
      const { data: existing } = await supabase
        .from('challenges')
        .select('*')
        .or(
          `and(challenger_team_id.eq.${challengerId},target_team_id.eq.${targetId}),and(challenger_team_id.eq.${targetId},target_team_id.eq.${challengerId})`,
        )
        .in('status', ['REJECTED', 'CANCELLED', 'ACCEPTED']) // Solo challenges no activos
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Reactivar challenge existente con nueva información
        const { error: updateError } = await supabase
          .from('challenges')
          .update({
            status: 'PENDING',
            challenger_team_id: challengerId,
            target_team_id: targetId,
            created_at: new Date().toISOString(), // Refrescar fecha
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
        return { success: true }
      }

      // 3. Crear nuevo challenge
      const { error } = await supabase.from('challenges').insert({
        challenger_team_id: challengerId,
        target_team_id: targetId,
        status: 'PENDING',
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Cancela un challenge propio (solo si está PENDING)
   */
  async cancelChallenge(challengeId: string): Promise<ServiceResponse> {
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ status: 'CANCELLED' })
        .eq('id', challengeId)
        .eq('status', 'PENDING') // Solo se puede cancelar si está pending

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Verifica si se puede enviar un nuevo challenge entre dos equipos
   * Criterios:
   * - No hay challenge PENDING entre ellos
   * - No hay match ACTIVO entre ellos
   */
  async canSendNewChallenge(
    challengerTeamId: string,
    targetTeamId: string,
  ): Promise<ServiceResponse<boolean>> {
    try {
      // 1. Verificar si hay challenge PENDING
      const { data: pendingChallenge } = await supabase
        .from('challenges')
        .select('id')
        .or(
          `and(challenger_team_id.eq.${challengerTeamId},target_team_id.eq.${targetTeamId}),and(challenger_team_id.eq.${targetTeamId},target_team_id.eq.${challengerTeamId})`,
        )
        .eq('status', 'PENDING')
        .maybeSingle()

      if (pendingChallenge) {
        return { success: true, data: false } // No se puede, hay challenge pending
      }

      // 2. Verificar si hay match ACTIVO
      const { data: activeMatch } = await supabase
        .from('matches')
        .select('id')
        .or(
          `and(team_a_id.eq.${challengerTeamId},team_b_id.eq.${targetTeamId}),and(team_a_id.eq.${targetTeamId},team_b_id.eq.${challengerTeamId})`,
        )
        .in('status', ['PENDING', 'CONFIRMED', 'LIVE'])
        .maybeSingle()

      if (activeMatch) {
        return { success: true, data: false } // No se puede, hay match activo
      }

      return { success: true, data: true } // Se puede enviar nuevo challenge
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async getMyChallenges(teamId: string): Promise<ServiceResponse<Challenge[]>> {
    /* ... código existente ... */
    const { data, error } = await supabase
      .from('challenges')
      .select(
        `
            *,
            challenger:teams!challenger_team_id(*),
            target:teams!target_team_id(*)
        `,
      )
      .or(`challenger_team_id.eq.${teamId},target_team_id.eq.${teamId}`)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    const rows = (data ?? []) as ChallengeWithTeams[]
    return { success: true, data: rows.map(toChallenge) }
  }

  async updateStatus(id: string, status: ChallengeStatus): Promise<ServiceResponse> {
    /* ... código existente ... */
    const { error } = await supabase.from('challenges').update({ status }).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }
}

export const challengesService = new ChallengesService()
