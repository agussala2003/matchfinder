import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'
import { Team } from '@/types/teams'

class ChallengesService {
  
  // ... (otros métodos)

  /**
   * Buscar rivales con filtros y CONTEO de miembros
   */
  async searchRivals(myTeamId: string, query: string = '', zone: string = 'ANY'): Promise<ServiceResponse<Team[]>> {
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

      // Limpiamos la data para que member_count sea un número
      const formattedData = data.map((team: any) => ({
        ...team,
        // Supabase a veces devuelve [{count: 5}] o {count: 5}, lo normalizamos:
        member_count: Array.isArray(team.member_count) 
            ? team.member_count[0]?.count 
            : team.member_count?.count || 0
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
      // 1. Buscar si YA existe un historial entre estos dos equipos
      // (Buscamos A vs B  O  B vs A)
      const { data: existing } = await supabase
        .from('challenges')
        .select('*')
        .or(`and(challenger_team_id.eq.${challengerId},target_team_id.eq.${targetId}),and(challenger_team_id.eq.${targetId},target_team_id.eq.${challengerId})`)
        .maybeSingle()

      // 2. Si existe...
      if (existing) {
        // Si ya está activo, no hacemos nada (protección)
        if (existing.status === 'PENDING' || existing.status === 'ACCEPTED') {
            return { success: false, error: 'Ya existe un desafío activo' }
        }
        
        // Si estaba RECHAZADO o CANCELADO, lo "Revivimos"
        // Importante: Actualizamos quién desafía ahora (challenger_team_id)
        const { error: updateError } = await supabase
            .from('challenges')
            .update({ 
                status: 'PENDING',
                challenger_team_id: challengerId, 
                target_team_id: targetId,
                created_at: new Date().toISOString() // Refrescamos la fecha
            })
            .eq('id', existing.id)

        if (updateError) throw updateError
        return { success: true }
      }

      // 3. Si NO existe, creamos uno nuevo (Insert normal)
      const { error } = await supabase.from('challenges').insert({
          challenger_team_id: challengerId,
          target_team_id: targetId,
          status: 'PENDING'
      })

      if (error) throw error
      return { success: true }

    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async getMyChallenges(teamId: string) {
      /* ... código existente ... */
      const { data, error } = await supabase
        .from('challenges')
        .select(`
            *,
            challenger:teams!challenger_team_id(*),
            target:teams!target_team_id(*)
        `)
        .or(`challenger_team_id.eq.${teamId},target_team_id.eq.${teamId}`)
        
      if (error) return { success: false, error: error.message }
      return { success: true, data: data }
  }

  async updateStatus(id: string, status: string) {
      /* ... código existente ... */
      const { error } = await supabase.from('challenges').update({ status }).eq('id', id)
      if (error) return { success: false, error: error.message }
      return { success: true }
  }
}

export const challengesService = new ChallengesService()