import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/auth'
import { ServiceResponse, TeamMemberStatus, UserRole } from '@/types/core'
import { Team, createTeamSchema } from '@/types/teams'
import { ZodError } from 'zod'

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
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: validatedData.name,
          home_zone: validatedData.homeZone,
          category: validatedData.category,
          captain_id: validatedData.captainId,
          elo_rating: 1200,
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
      return { success: true, data: team as Team }
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

      const teams = (data || []).map((item: any) => item.teams).filter((t) => t !== null) as Team[]

      return { success: true, data: teams }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async getTeamById(teamId: string): Promise<ServiceResponse<Team>> {
    try {
      const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single()
      if (error) throw error
      return { success: true, data: data as Team }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<ServiceResponse<Team>> {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as Team }
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
      const members = (data || []).map((item: any) => ({
        user_id: item.user_id,
        role: item.role,
        status: item.status,
        profile: item.profile,
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

      const requests = (data || []).map((item: any) => ({
        team_id: item.team_id,
        status: item.status,
        joined_at: item.joined_at,
        team: {
          name: item.team?.name || 'Equipo desconocido',
          logo_url: item.team?.logo_url,
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
}

export const teamsService = new TeamsService()
