import { CONFIG } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/auth'
import { ServiceResponse, TeamMemberStatus, UserRole } from '@/types/core'
import { Enums, Tables, TablesUpdate } from '@/types/supabase'
import { createTeamSchema, Team, TeamSafeUpdate } from '@/types/teams'
import { ZodError } from 'zod'

type TeamRow = Tables<'teams'>
type TeamMemberRow = Tables<'team_members'>
type ProfileRow = Tables<'profiles'>
type TeamCategory = Enums<'team_category'>

type TeamMemberWithTeam = Pick<TeamMemberRow, 'team_id'> & {
  teams: TeamRow | null
}

type TeamMemberWithProfile = Pick<TeamMemberRow, 'user_id' | 'role' | 'status'> & {
  profile: ProfileRow | null
}

type PendingRequestWithTeam = Pick<TeamMemberRow, 'team_id' | 'status' | 'joined_at'> & {
  team: Pick<TeamRow, 'name' | 'logo_url'> | null
}

function isTeamCategory(value: string): value is TeamCategory {
  return value === 'MALE' || value === 'FEMALE' || value === 'MIXED'
}

function mapProfileRow(profile: ProfileRow | null): UserProfile {
  return {
    id: profile?.id ?? '',
    username: profile?.username ?? '',
    full_name: profile?.full_name ?? 'Jugador',
    position: profile?.position ?? undefined,
    avatar_url: profile?.avatar_url ?? undefined,
    reputation: profile?.reputation ?? undefined,
    created_at: profile?.created_at ?? undefined,
  }
}

function mapTeamRow(team: TeamRow): Team {
  return {
    id: team.id,
    name: team.name,
    captain_id: team.captain_id ?? '',
    elo_rating: team.elo_rating ?? CONFIG.defaults.eloRating,
    home_zone: team.home_zone as Team['home_zone'],
    category: team.category,
    share_code: team.share_code ?? '',
    logo_url: team.logo_url ?? undefined,
    created_at: team.created_at ?? '',
  }
}

function toTeamMemberStatus(status: TeamMemberRow['status']): TeamMemberStatus {
  if (status === TeamMemberStatus.ACTIVE) return TeamMemberStatus.ACTIVE
  if (status === TeamMemberStatus.INACTIVE) return TeamMemberStatus.INACTIVE
  return TeamMemberStatus.PENDING
}

export interface TeamMemberDetail {
  user_id: string
  role: 'ADMIN' | 'SUB_ADMIN' | 'PLAYER'
  status: TeamMemberStatus
  profile: UserProfile
}

export interface OutgoingRequest {
  team_id: string
  team: {
    name: string
    logo_url?: string
  }
  status: TeamMemberStatus
  joined_at: string
}

export interface TeamRankingFilters {
  zone?: string
  format?: string
}

export interface TeamRankingItem {
  id: string
  name: string
  logo_url?: string
  elo_rating: number
  home_zone: string
  preferred_format?: string
  wins?: number
  losses?: number
}

class TeamsService {
  private handleError(error: unknown): string {
    if (error instanceof ZodError) {
      return error.issues[0]?.message || 'Error de validación'
    }
    if (error instanceof Error) {
      return error.message
    }
    return 'Error desconocido en servicio de equipos'
  }

  async createTeam(
    name: string,
    homeZone: string,
    category: string,
    captainId: string,
  ): Promise<ServiceResponse<Team>> {
    try {
      const validatedData = createTeamSchema.parse({ name, homeZone, category, captainId })

      if (!isTeamCategory(validatedData.category)) {
        throw new Error('Categoría de equipo inválida')
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: validatedData.name,
          home_zone: validatedData.homeZone,
          category: validatedData.category,
          captain_id: validatedData.captainId,
          elo_rating: CONFIG.defaults.eloRating,
        })
        .select()
        .single()

      if (teamError) throw teamError
      if (!team) throw new Error('Error al crear equipo')

      const { error: memberError } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: validatedData.captainId,
        role: UserRole.ADMIN,
        status: TeamMemberStatus.ACTIVE,
      })

      if (memberError) {
        await supabase.from('teams').delete().eq('id', team.id)
        throw memberError
      }
      return { success: true, data: mapTeamRow(team) }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async getUserTeams(userId: string): Promise<ServiceResponse<Team[]>> {
    try {
      if (!userId) throw new Error('User ID es requerido')

      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', userId)
        .eq('status', TeamMemberStatus.ACTIVE)

      if (error) throw error

      const rows = (data ?? []) as TeamMemberWithTeam[]
      const teams = rows
        .map((item) => item.teams)
        .filter((team): team is TeamRow => team !== null)
        .map(mapTeamRow)

      return { success: true, data: teams }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async getTeamById(teamId: string): Promise<ServiceResponse<Team>> {
    try {
      const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single()
      if (error) throw error
      return { success: true, data: mapTeamRow(data) }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async updateTeam(teamId: string, updates: TeamSafeUpdate): Promise<ServiceResponse<Team>> {
    // Validar que hay campos para actualizar
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No hay campos válidos para actualizar' }
    }

    const payload: TablesUpdate<'teams'> = {
      ...updates,
      logo_url: updates.logo_url ?? undefined,
    }

    const { data, error } = await supabase
      .from('teams')
      .update(payload)
      .eq('id', teamId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: mapTeamRow(data) }
  }

  async getTeamMembers(teamId: string): Promise<ServiceResponse<TeamMemberDetail[]>> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`user_id, role, status, profile:profiles (*)`)
        .eq('team_id', teamId)
        .neq('status', 'INACTIVE')
        .order('role', { ascending: true }) // Ordenar para que el capitán salga primero si es posible

      if (error) throw error
      const rows = (data ?? []) as TeamMemberWithProfile[]
      const members = rows.map((item) => ({
        user_id: item.user_id,
        role: item.role,
        status: toTeamMemberStatus(item.status),
        profile: mapProfileRow(item.profile),
      }))
      return { success: true, data: members }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async joinTeamByCode(code: string, userId: string): Promise<ServiceResponse> {
    try {
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('share_code', code.toUpperCase().trim())
        .single()
      if (!team) return { success: false, error: 'Código inválido' }

      const { data: existing } = await supabase
        .from('team_members')
        .select('status')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .maybeSingle()
      if (existing) {
        if (existing.status === 'ACTIVE')
          return { success: false, error: 'Ya estás en este equipo' }
        if (existing.status === 'PENDING') return { success: false, error: 'Solicitud ya enviada' }
      }

      const { error } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        role: UserRole.PLAYER,
        status: TeamMemberStatus.PENDING,
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async manageMemberStatus(
    teamId: string,
    userId: string,
    status: TeamMemberStatus,
  ): Promise<ServiceResponse> {
    if (status === TeamMemberStatus.INACTIVE) {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('team_members')
        .update({ status })
        .eq('team_id', teamId)
        .eq('user_id', userId)
      if (error) return { success: false, error: error.message }
    }
    return { success: true }
  }

  async leaveTeam(teamId: string, userId: string): Promise<ServiceResponse> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async getUserPendingRequests(userId: string): Promise<ServiceResponse<OutgoingRequest[]>> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(
          `
          team_id,
          status,
          joined_at,
          team:teams (name, logo_url)
        `,
        )
        .eq('user_id', userId)
        .eq('status', TeamMemberStatus.PENDING)

      if (error) throw error

      const rows = (data ?? []) as PendingRequestWithTeam[]
      const requests = rows.map((item) => ({
        team_id: item.team_id,
        status: toTeamMemberStatus(item.status),
        joined_at: item.joined_at ?? '',
        team: {
          name: item.team?.name || 'Equipo desconocido',
          logo_url: item.team?.logo_url ?? undefined,
        },
      }))
      return { success: true, data: requests }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: UserRole,
  ): Promise<ServiceResponse> {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  // --- NUEVO: TRASPASO ATÓMICO DE CAPITANÍA ---
  async transferCaptaincy(teamId: string, newCaptainId: string): Promise<ServiceResponse> {
    try {
      const { error } = await supabase.rpc('transfer_team_captain', {
        team_id: teamId,
        new_captain_id: newCaptainId,
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  // Obtains teams where the user is ADMIN or SUB_ADMIN (for post creation, management, etc)
  async getUserManagedTeams(userId: string): Promise<ServiceResponse<Team[]>> {
    try {
      if (!userId) throw new Error('User ID es requerido')

      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', userId)
        .eq('status', TeamMemberStatus.ACTIVE)
        .in('role', [UserRole.ADMIN, UserRole.SUB_ADMIN])

      if (error) throw error

      const rows = (data ?? []) as TeamMemberWithTeam[]
      const teams = rows
        .map((item) => item.teams)
        .filter((team): team is TeamRow => team !== null)
        .map(mapTeamRow)

      return { success: true, data: teams }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async getTeamsRanking(
    filters: TeamRankingFilters = {},
    limit = 50,
  ): Promise<ServiceResponse<TeamRankingItem[]>> {
    try {
      let query = (supabase as any)
        .from('teams')
        .select('id, name, logo_url, elo_rating, home_zone, preferred_format')
        .order('elo_rating', { ascending: false })
        .limit(limit)

      if (filters.zone && filters.zone !== 'ALL' && filters.zone !== 'ANY') {
        query = query.eq('home_zone', filters.zone)
      }

      if (filters.format && filters.format !== 'GLOBAL') {
        query = query.eq('preferred_format', filters.format)
      }

      let { data, error } = await query

      // Fallback para esquemas que todavía no tienen preferred_format.
      if (error && error.message.toLowerCase().includes('preferred_format')) {
        let legacyQuery = (supabase as any)
          .from('teams')
          .select('id, name, logo_url, elo_rating, home_zone')
          .order('elo_rating', { ascending: false })
          .limit(limit)

        if (filters.zone && filters.zone !== 'ALL' && filters.zone !== 'ANY') {
          legacyQuery = legacyQuery.eq('home_zone', filters.zone)
        }

        const legacyRes = await legacyQuery
        data = legacyRes.data
        error = legacyRes.error
      }

      if (error) throw error

      const ranking = ((data ?? []) as Array<
        Pick<TeamRow, 'id' | 'name' | 'logo_url' | 'elo_rating' | 'home_zone'> & {
          preferred_format?: string | null
        }
      >).map((team) => ({
        id: team.id,
        name: team.name,
        logo_url: team.logo_url ?? undefined,
        elo_rating: team.elo_rating ?? CONFIG.defaults.eloRating,
        home_zone: team.home_zone,
        preferred_format: team.preferred_format ?? undefined,
        wins: undefined,
        losses: undefined,
      }))

      return { success: true, data: ranking }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }
}

export const teamsService = new TeamsService()
