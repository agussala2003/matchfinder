// types/core.ts

/**
 * Respuesta estándar para todos los servicios de la app
 * T = Tipo de dato que devuelve (ej: User, Team, etc.)
 */
export interface ServiceResponse<T = void> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

/**
 * Roles de usuario dentro de un equipo
 * (Coinciden con el ENUM 'rol_enum' de Supabase)
 */
export enum UserRole {
  ADMIN = 'ADMIN', // Capitán
  SUB_ADMIN = 'SUB_ADMIN', // Subcapitán
  PLAYER = 'PLAYER', // Jugador regular
}

/**
 * Estado de un miembro en el equipo
 * (Coinciden con el ENUM 'estado_miembro_enum' de Supabase)
 */
export enum TeamMemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING', // Para cuando implementemos invitaciones
}
