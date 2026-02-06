// services/teams.service.ts
import { supabase } from '@/lib/supabase';
import { ServiceResponse, TeamMemberStatus, UserRole } from '@/types/core';
import { Team, createTeamSchema } from '@/types/teams';
import { ZodError } from 'zod';

class TeamsService {
  
  /**
   * Helper privado para manejar errores de forma consistente
   */
  private handleError(error: unknown): string {
    if (error instanceof ZodError) {
      // Devuelve solo el primer error de validación para no marear al usuario
      return error.issues[0]?.message || 'Error de validación';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Error desconocido en servicio de equipos';
  }

  /**
   * Crea un nuevo equipo validando datos primero con Zod
   */
  async createTeam(name: string, homeZone: string, category: string, captainId: string): Promise<ServiceResponse<Team>> {
    try {
      // 1. Validar inputs
      const validatedData = createTeamSchema.parse({ name, homeZone, category, captainId });

      // 2. Insertar Equipo (Incluyendo category)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: validatedData.name,
          home_zone: validatedData.homeZone,
          category: validatedData.category, // <--- Nuevo campo
          captain_id: validatedData.captainId,
          elo_rating: 1200,
        })
        .select()
        .single();

      if (teamError) throw teamError;
      if (!team) throw new Error('Error al crear registro de equipo');

      // 3. Insertar Capitán
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: validatedData.captainId,
          role: UserRole.ADMIN,
          status: TeamMemberStatus.ACTIVE
        });

      if (memberError) {
        await supabase.from('teams').delete().eq('id', team.id);
        throw memberError;
      }

      return { success: true, data: team as Team };

    } catch (error) {
      console.error('TeamsService Error:', error);
      return { success: false, error: this.handleError(error) };
    }
  }

  /**
   * Obtiene el equipo activo del usuario
   */
  async getUserTeam(userId: string): Promise<ServiceResponse<Team>> {
    try {
      if (!userId) throw new Error('User ID es requerido');

      const { data: memberData, error } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', userId)
        .eq('status', TeamMemberStatus.ACTIVE) // Solo equipos activos
        .maybeSingle();

      if (error) throw error;

      if (!memberData || !memberData.teams) {
        return { success: false, error: 'Usuario sin equipo' };
      }

      return { success: true, data: memberData.teams as unknown as Team };

    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }
}

export const teamsService = new TeamsService();