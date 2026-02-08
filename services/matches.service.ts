import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'
import { MatchPreview } from '@/types/matches'

class MatchesService {
  
  async getMyMatches(teamId: string): Promise<ServiceResponse<MatchPreview[]>> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          scheduled_at,
          status,
          is_friendly,
          team_a:teams!team_a_id (id, name, logo_url),
          team_b:teams!team_b_id (id, name, logo_url)
        `)
        .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
        .neq('status', 'CANCELLED') // Opcional: Ocultar cancelados
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transformar la data para que sea fácil de usar en el frontend
      const matches: MatchPreview[] = (data || []).map((m: any) => {
        const isHome = m.team_a.id === teamId
        return {
          id: m.id,
          scheduled_at: m.scheduled_at,
          status: m.status,
          is_friendly: m.is_friendly,
          my_role: isHome ? 'HOME' : 'AWAY',
          rival: isHome ? m.team_b : m.team_a // El rival es el otro
        }
      })

      return { success: true, data: matches }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}

export const matchesService = new MatchesService()