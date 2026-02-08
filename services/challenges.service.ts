import { supabase } from '@/lib/supabase'
import { Challenge } from '@/types/challenges'
import { ServiceResponse } from '@/types/core'
import { Team } from '@/types/teams'

class ChallengesService {
  /**
   * Buscar rivales con filtros (Texto y Zona)
   */
  async searchRivals(
    myTeamId: string,
    query?: string,
    zone?: string,
  ): Promise<ServiceResponse<Team[]>> {
    try {
      // FIX: Eliminado .neq('status', 'Deleted') porque la columna no existe en 'teams'
      let builder = supabase
        .from('teams')
        .select('*')
        .neq('id', myTeamId) // Excluir mi equipo
        .order('elo_rating', { ascending: false })

      // Filtro de Texto (Nombre)
      if (query && query.trim() !== '') {
        builder = builder.ilike('name', `%${query}%`)
      }

      // Filtro de Zona
      if (zone && zone !== 'ANY') {
        builder = builder.eq('home_zone', zone)
      }

      const { data, error } = await builder
      if (error) throw error

      return { success: true, data: data as Team[] }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async sendChallenge(myTeamId: string, targetTeamId: string): Promise<ServiceResponse> {
    try {
      const { data: existing } = await supabase
        .from('challenges')
        .select('id')
        .eq('challenger_team_id', myTeamId)
        .eq('target_team_id', targetTeamId)
        .eq('status', 'PENDING')
        .maybeSingle()

      if (existing) return { success: false, error: 'Ya hay un desafío pendiente con este equipo' }

      const { error } = await supabase.from('challenges').insert({
        challenger_team_id: myTeamId,
        target_team_id: targetTeamId,
        status: 'PENDING',
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async getMyChallenges(myTeamId: string): Promise<ServiceResponse<Challenge[]>> {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(
          `
          *,
          challenger:teams!challenger_team_id(*),
          target:teams!target_team_id(*)
        `,
        )
        .or(`challenger_team_id.eq.${myTeamId},target_team_id.eq.${myTeamId}`)
        .in('status', ['PENDING', 'ACCEPTED'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data as any }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async updateStatus(
    challengeId: string,
    status: 'CANCELLED' | 'REJECTED' | 'ACCEPTED',
  ): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.from('challenges').update({ status }).eq('id', challengeId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}

export const challengesService = new ChallengesService()
