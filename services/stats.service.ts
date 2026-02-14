import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'

export interface PlayerStat {
    userId: string
    teamId: string
    goals: number
    isMvp: boolean
}

class StatsService {
    /**
     * Guarda las estadísticas de los jugadores para un partido específico.
     * Utiliza upsert para crear o actualizar registros.
     */
    async savePlayerStats(matchId: string, stats: PlayerStat[]): Promise<ServiceResponse> {
        try {
            if (stats.length === 0) return { success: true }

            const payload = stats.map(s => ({
                match_id: matchId,
                user_id: s.userId,
                team_id: s.teamId,
                // SECURITY: Validar y clamp valores de goles para prevenir valores absurdos
                // Máximo 30 goles por jugador (constraint DB), pero validamos aquí también
                goals: Math.max(0, Math.min(s.goals, 30)),
                is_mvp: s.isMvp
            }))

            // Upsert: si ya existe (match_id + user_id usualmente unique), actualiza
            // Necesitamos asegurar que la tabla tenga alguna constraint o simplemente confiamos en el ID si lo tuvieramos.
            // Como no tenemos el ID de la stat, dependemos de que no se dupliquen indiscriminadamente.
            // Idealmente player_stats debería tener un unique constraint en (match_id, user_id).
            // Asumiremos que el backend lo maneja o que insertamos nuevos.
            // Para ser más seguros, podriamos borrar previos de este match+team y reinsertar, 
            // pero UPSERT es mejor si hay constraint.
            // Revisando schema: id es UUID default gen_random. No veo unique constraint explicito en el resumen
            // pero es probable que exista o deba existir. 
            // Intentaremos UPSERT basándonos en match_id y user_id si es posible, pero sin constraint fallará o duplicará.
            // Estrategia segura: Delete for team in match -> Insert.

            const teamId = stats[0].teamId

            // 1. Borrar stats previas de este equipo en este partido para evitar duplicados
            const { error: deleteError } = await supabase
                .from('player_stats')
                .delete()
                .eq('match_id', matchId)
                .eq('team_id', teamId)

            if (deleteError) throw deleteError

            // 2. Insertar nuevas
            const { error } = await supabase
                .from('player_stats')
                .insert(payload)

            if (error) throw error

            return { success: true }
        } catch (error) {
            console.error('Error saving player stats:', error)
            return { success: false, error: (error as Error).message }
        }
    }

    async getMatchStats(matchId: string): Promise<ServiceResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .from('player_stats')
                .select('*')
                .eq('match_id', matchId)

            if (error) throw error
            return { success: true, data }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    async getUserStats(userId: string): Promise<ServiceResponse<{ matches: number; goals: number; wins: number; mvps: number }>> {
        try {
            // 1. Obtener todas las stats del usuario
            // Traemos también el match para ver los equipos
            const { data: playerStats, error: statsError } = await supabase
                .from('player_stats')
                .select(`
                match_id,
                team_id,
                goals,
                is_mvp
            `)
                .eq('user_id', userId)

            if (statsError) throw statsError
            if (!playerStats || playerStats.length === 0) {
                return { success: true, data: { matches: 0, goals: 0, wins: 0, mvps: 0 } }
            }

            const matchIds = playerStats.map(s => s.match_id).filter(Boolean) as string[]

            // 2. Obtener resultados de esos partidos
            const { data: results, error: resultsError } = await supabase
                .from('match_results')
                .select('*')
                .in('match_id', matchIds)

            // 3. Obtener detalles de los partidos para saber quién es team_a y team_b
            const { data: matches, error: matchesError } = await supabase
                .from('matches')
                .select('id, team_a_id, team_b_id')
                .in('id', matchIds)

            if (resultsError) throw resultsError
            if (matchesError) throw matchesError

            let matchesCount = playerStats.length
            let goalsCount = playerStats.reduce((sum, s) => sum + (s.goals || 0), 0)
            let mvpsCount = playerStats.filter(s => s.is_mvp).length
            let winsCount = 0

            playerStats.forEach(stat => {
                const match = matches?.find(m => m.id === stat.match_id)
                const result = results?.find(r => r.match_id === stat.match_id)

                if (match && result) {
                    const isTeamA = match.team_a_id === stat.team_id
                    const isTeamB = match.team_b_id === stat.team_id

                    if (isTeamA && result.goals_a > result.goals_b) {
                        winsCount++
                    } else if (isTeamB && result.goals_b > result.goals_a) {
                        winsCount++
                    }
                }
            })

            return {
                success: true,
                data: {
                    matches: matchesCount,
                    goals: goalsCount,
                    wins: winsCount,
                    mvps: mvpsCount
                }
            }

        } catch (error) {
            console.error('Error fetching user stats:', error)
            return { success: false, error: (error as Error).message }
        }
    }
}

export const statsService = new StatsService()
