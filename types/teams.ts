// types/teams.ts
import { CATEGORIAS_LISTA, ZONAS_AMBA } from '@/lib/constants'
import { z } from 'zod'
import { UserProfile } from './auth'

// --- INTERFACES (MODELOS) ---

export interface Team {
  id: string
  name: string
  captain_id: string
  elo_rating: number
  home_zone: (typeof ZONAS_AMBA)[number]
  category: 'MALE' | 'FEMALE' | 'MIXED'
  share_code: string
  logo_url?: string
  created_at: string
}

export interface TeamMember {
  team_id: string
  user_id: string
  role: 'ADMIN' | 'SUB_ADMIN' | 'PLAYER'
  status: 'ACTIVE' | 'INACTIVE'
  joined_at: string
}

export interface TeamMemberDetail {
  user_id: string
  role: 'ADMIN' | 'PLAYER'
  profile: UserProfile
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
}

// --- VALIDACIONES ZOD ---

// Schema para crear equipo
// Validamos esto ANTES de tocar la base de datos para ahorrar recursos y evitar errores feos.
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 letras')
    .max(30, 'El nombre es muy largo (máx 30)')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'El nombre contiene caracteres inválidos') // Permite letras, números, espacios, guiones
    .trim(),

  // Validamos que la zona sea una de las permitidas en nuestra lista
  // El "as [string, ...string[]]" es un truco técnico de TypeScript para que Zod acepte el array constante
  homeZone: z.enum(ZONAS_AMBA as unknown as [string, ...string[]], {
    message: 'Selecciona una zona válida del AMBA',
  }),

  category: z.enum(CATEGORIAS_LISTA as [string, ...string[]], {
    message: 'Selecciona una categoría válida',
  }),

  captainId: z.string().uuid('ID de usuario inválido'),
})

// Tipo inferido para usar en el servicio
export type CreateTeamInput = z.infer<typeof createTeamSchema>

// --- TIPOS DE SEGURIDAD ---

/**
 * Campos sensibles que NO pueden ser editados desde el cliente.
 * Solo el servidor (Edge Functions, Database Triggers) puede modificarlos.
 */
export type TeamProtectedFields = 
  | 'elo_rating'      // Solo cambia vía cálculo ELO automático
  | 'captain_id'      // Solo cambia vía función transfer_team_captain()
  | 'share_code'      // Generado automáticamente por trigger
  | 'id'              // Primary key inmutable
  | 'created_at'      // Timestamp automático

/**
 * Tipo seguro para actualizaciones de equipo.
 * Excluye campos protegidos que no deben ser modificables desde el cliente.
 * 
 * Uso:
 * ```typescript
 * const updates: TeamSafeUpdate = {
 *   name: 'Nuevo Nombre',
 *   logo_url: 'https://...',
 *   // elo_rating: 1500  ❌ TypeScript error!
 * }
 * ```
 */
export type TeamSafeUpdate = Omit<Partial<Team>, TeamProtectedFields>
