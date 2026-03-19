import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'
import { Enums, Tables, TablesInsert } from '@/types/supabase'

export interface PlayerStat {
    userId: string
    teamId: string
    goals: number
    isMvp: boolean
}

export interface PlayerStats {
    userId: string
    fullName: string
    username?: string
    avatarUrl?: string
    totalGoals: number
    totalMatches: number
    mvpCount: number
    winRate: number
    drawRate: number
    lossRate: number
    reputation: number
}

type TeamCategory = Enums<'team_category'>
type MatchRow = Tables<'matches'>
type MatchResultRow = Tables<'match_results'>
type PlayerStatRow = Tables<'player_stats'>

type MatchResultWithMatch = MatchResultRow & {
    matches: Pick<MatchRow, 'id' | 'team_a_id' | 'team_b_id'> | null
}

type TeamMatchWithResult = Pick<MatchRow, 'id' | 'team_a_id' | 'team_b_id' | 'status'> & {
    match_results:
        | Pick<MatchResultRow, 'goals_a' | 'goals_b' | 'is_draw'>
        | Pick<MatchResultRow, 'goals_a' | 'goals_b' | 'is_draw'>[]
        | null
}

export interface TeamStats {
    teamId: string
    teamName: string
    logoUrl?: string
    category: TeamCategory
    homeZone: string
    eloRating: number
    totalMatches: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    winRate: number
}

function hasValidScore(result: Pick<MatchResultRow, 'goals_a' | 'goals_b'>): result is {
    goals_a: number
    goals_b: number
} {
    return result.goals_a !== null && result.goals_b !== null
}

function firstResult(
    result:
        | Pick<MatchResultRow, 'goals_a' | 'goals_b' | 'is_draw'>
        | Pick<MatchResultRow, 'goals_a' | 'goals_b' | 'is_draw'>[]
        | null,
): Pick<MatchResultRow, 'goals_a' | 'goals_b' | 'is_draw'> | null {
    if (!result) return null
    return Array.isArray(result) ? result[0] ?? null : result
}

class StatsService {
    /**
     * Guarda las estadísticas de los jugadores para un partido específico.
     * Utiliza upsert para crear o actualizar registros.
     */
    async savePlayerStats(matchId: string, stats: PlayerStat[]): Promise<ServiceResponse> {
        try {
            if (stats.length === 0) return { success: true }

            const payload: TablesInsert<'player_stats'>[] = stats.map((s) => ({
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
        } catch (error: unknown) {
            console.error('Error saving player stats:', error)
            return { success: false, error: (error as Error).message }
        }
    }

    async getMatchStats(matchId: string): Promise<ServiceResponse<PlayerStatRow[]>> {
        try {
            const { data, error } = await supabase
                .from('player_stats')
                .select('*')
                .eq('match_id', matchId)

            if (error) throw error
            return { success: true, data: data ?? [] }
        } catch (error: unknown) {
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

            const matchIds = playerStats
                .map((s) => s.match_id)
                .filter((id): id is string => typeof id === 'string')

            if (matchIds.length === 0) {
                return { success: true, data: { matches: 0, goals: 0, wins: 0, mvps: 0 } }
            }

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
            let mvpsCount = playerStats.filter((s) => s.is_mvp).length
            let winsCount = 0

            playerStats.forEach((stat) => {
                const match = matches?.find((m) => m.id === stat.match_id)
                const result = results?.find((r) => r.match_id === stat.match_id)

                if (match && result) {
                    const isTeamA = match.team_a_id === stat.team_id
                    const isTeamB = match.team_b_id === stat.team_id

                    if (!hasValidScore(result)) return

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

        } catch (error: unknown) {
            console.error('Error fetching user stats:', error)
            return { success: false, error: (error as Error).message }
        }
    }

    /**
     * Obtener estadísticas completas de un jugador
     */
    async getPlayerStats(userId: string): Promise<ServiceResponse<PlayerStats>> {
        try {
            // 1. Obtener información básica del jugador
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, reputation')
                .eq('id', userId)
                .single()

            if (profileError) throw profileError

            // 2. Obtener estadísticas de goles y MVP
            const { data: playerStats, error: statsError } = await supabase
                .from('player_stats')
                .select('goals, is_mvp, match_id, team_id')
                .eq('user_id', userId)

            if (statsError) throw statsError

            // 3. Calcular estadísticas básicas
            const totalGoals = playerStats?.reduce((sum, stat) => sum + (stat.goals || 0), 0) || 0
            const mvpCount = playerStats?.filter((stat) => stat.is_mvp).length || 0
            const totalMatches = playerStats?.length || 0

            // 4. Obtener resultados de partidos para calcular win rate
            let wins = 0, draws = 0, losses = 0

            if (playerStats && playerStats.length > 0) {
                const matchIds = playerStats
                    .map((stat) => stat.match_id)
                    .filter((id): id is string => typeof id === 'string')
                if (matchIds.length === 0) {
                    const emptyStats: PlayerStats = {
                        userId,
                        fullName: profile.full_name,
                        username: profile.username ?? undefined,
                        avatarUrl: profile.avatar_url ?? undefined,
                        totalGoals,
                        totalMatches,
                        mvpCount,
                        winRate: 0,
                        drawRate: 0,
                        lossRate: 0,
                        reputation: profile.reputation ?? 5.0,
                    }
                    return { success: true, data: emptyStats }
                }
                
                const { data: matchResults } = await supabase
                    .from('match_results')
                    .select(`
                        match_id,
                        goals_a,
                        goals_b,
                        is_draw,
                        matches!inner (
                            id,
                            team_a_id,
                            team_b_id
                        )
                    `)
                    .in('match_id', matchIds)

                const typedResults = (matchResults ?? []) as MatchResultWithMatch[]

                // Para cada partido, determinar si ganó, empató o perdió
                for (const result of typedResults) {
                    const playerStat = playerStats.find((ps) => ps.match_id === result.match_id)
                    if (!playerStat) continue

                    const match = result.matches
                    if (!match) continue
                    if (!hasValidScore(result)) continue

                    const isTeamA = playerStat.team_id === match.team_a_id
                    
                    if (result.is_draw) {
                        draws++
                    } else if (
                        (isTeamA && result.goals_a > result.goals_b) ||
                        (!isTeamA && result.goals_b > result.goals_a)
                    ) {
                        wins++
                    } else {
                        losses++
                    }
                }
            }

            const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0
            const drawRate = totalMatches > 0 ? (draws / totalMatches) * 100 : 0
            const lossRate = totalMatches > 0 ? (losses / totalMatches) * 100 : 0

            const stats: PlayerStats = {
                userId,
                fullName: profile.full_name,
                username: profile.username ?? undefined,
                avatarUrl: profile.avatar_url ?? undefined,
                totalGoals,
                totalMatches,
                mvpCount,
                winRate: Math.round(winRate * 100) / 100,
                drawRate: Math.round(drawRate * 100) / 100,
                lossRate: Math.round(lossRate * 100) / 100,
                reputation: profile.reputation ?? 5.0
            }

            return { success: true, data: stats }
        } catch (error: unknown) {
            console.error('getPlayerStats error:', error)
            return { success: false, error: (error as Error).message }
        }
    }

    /**
     * Obtener estadísticas completas de un equipo
     */
    async getTeamStats(teamId: string): Promise<ServiceResponse<TeamStats>> {
        try {
            // 1. Obtener información básica del equipo
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .select('id, name, logo_url, category, home_zone, elo_rating')
                .eq('id', teamId)
                .single()

            if (teamError) throw teamError

            // 2. Obtener todos los partidos del equipo
            const { data: matches, error: matchesError } = await supabase
                .from('matches')
                .select(`
                    id,
                    team_a_id,
                    team_b_id,
                    status,
                    match_results (
                        goals_a,
                        goals_b,
                        is_draw
                    )
                `)
                .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
                .eq('status', 'FINISHED')

            if (matchesError) throw matchesError

            // 3. Calcular estadísticas
            let wins = 0, draws = 0, losses = 0
            let goalsFor = 0, goalsAgainst = 0

            const typedMatches = (matches ?? []) as TeamMatchWithResult[]

            for (const match of typedMatches) {
                const result = firstResult(match.match_results)
                if (!result) continue
                if (!hasValidScore(result)) continue

                const isTeamA = match.team_a_id === teamId
                const teamGoals = isTeamA ? result.goals_a : result.goals_b
                const opponentGoals = isTeamA ? result.goals_b : result.goals_a

                goalsFor += teamGoals
                goalsAgainst += opponentGoals

                if (result.is_draw) {
                    draws++
                } else if (teamGoals > opponentGoals) {
                    wins++
                } else {
                    losses++
                }
            }

            const totalMatches = matches?.length || 0
            const goalDifference = goalsFor - goalsAgainst
            const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0

            const stats: TeamStats = {
                teamId,
                teamName: team.name,
                logoUrl: team.logo_url ?? undefined,
                category: team.category,
                homeZone: team.home_zone,
                eloRating: team.elo_rating ?? 1200,
                totalMatches,
                wins,
                draws,
                losses,
                goalsFor,
                goalsAgainst,
                goalDifference,
                winRate: Math.round(winRate * 100) / 100
            }

            return { success: true, data: stats }
        } catch (error: unknown) {
            console.error('getTeamStats error:', error)
            return { success: false, error: (error as Error).message }
        }
    }

    /**
     * Guarda las estadísticas del partido de forma masiva con soporte para MVP.
     * Hace upsert aprovechando el UNIQUE CONSTRAINT en (match_id, user_id).
     * 
     * @param matchId - ID del partido
     * @param statsData - Array de jugadores con sus estadísticas {userId, teamId, goals}
     * @param mvpUserId - ID del jugador elegido como MVP
     * @returns ServiceResponse indicando éxito o error
     */
    async saveMatchStats(
        matchId: string,
        statsData: Array<{ userId: string; teamId: string; goals: number }>,
        mvpUserId?: string
    ): Promise<ServiceResponse> {
        try {
            if (!matchId || !statsData || statsData.length === 0) {
                return { success: false, error: 'matchId and statsData are required' }
            }

            // 1. Preparar payload: marcar is_mvp correctamente
            const payload: TablesInsert<'player_stats'>[] = statsData.map((stat) => ({
                match_id: matchId,
                user_id: stat.userId,
                team_id: stat.teamId,
                // SECURITY: Validar y clamp valores de goles (máximo 30 por constraint DB)
                goals: Math.max(0, Math.min(stat.goals, 30)),
                // Solo el MVP tiene true, el resto false
                is_mvp: mvpUserId ? stat.userId === mvpUserId : false
            }))

            // 2. Usar UPSERT para insertar o actualizar registros
            // El UNIQUE CONSTRAINT en (match_id, user_id) permite hacer upsert seguro
            const { error: upsertError } = await supabase
                .from('player_stats')
                .upsert(payload, {
                    onConflict: 'match_id,user_id', // Especificar la columna del conflict
                    ignoreDuplicates: false
                })

            if (upsertError) throw upsertError

            // 3. Si mvpUserId fue especificado, garantizar que solo ese tenga is_mvp = true
            // (en caso de que previamente hubiera un MVP diferente)
            if (mvpUserId) {
                // Restablecer todos los MVP a false en este partido
                const { error: resetError } = await supabase
                    .from('player_stats')
                    .update({ is_mvp: false })
                    .eq('match_id', matchId)
                    .neq('user_id', mvpUserId)
                    .eq('is_mvp', true)

                if (resetError) throw resetError

                // Establecer el MVP a true (con upsert ya está, pero confirmamos)
                const { error: mvpError } = await supabase
                    .from('player_stats')
                    .update({ is_mvp: true })
                    .eq('match_id', matchId)
                    .eq('user_id', mvpUserId)

                if (mvpError) throw mvpError
            }

            return { success: true }
        } catch (error: unknown) {
            console.error('Error saving match stats:', error)
            return { success: false, error: (error as Error).message }
        }
    }
}

export const statsService = new StatsService()
