import { POSICIONES_LISTA } from '@/lib/constants' // <--- Importamos la lista oficial
import { Session, User } from '@supabase/supabase-js'
import { z } from 'zod'
import { ServiceResponse } from './core'

// --- ENUMS & INTERFACES ---

export enum AuthType {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthSession {
  user: User
  session: Session
}

export interface UserProfile {
  id: string
  username: string
  full_name: string
  position?: string
  avatar_url?: string
  reputation?: number
  created_at?: string
}

export interface ProfileData {
  id: string
  username: string
  full_name: string
  position: string
  avatar_url?: string
}

// Interfaces de respuesta
export interface ProfileCheckResult {
  exists: boolean
  isComplete: boolean
  profile?: UserProfile
}

export type AuthResponse = ServiceResponse<AuthSession>
export type ProfileResponse = ServiceResponse<UserProfile>

// --- SCHEMAS DE VALIDACIÓN (ZOD) ---

export const emailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .email('El formato del email no es válido')
  .toLowerCase()
  .trim()

export const passwordSchema = z
  .string()
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
  .max(72, 'La contraseña no puede tener más de 72 caracteres')

export const authCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const usernameSchema = z
  .string()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(20, 'El usuario no puede tener más de 20 caracteres')
  .regex(
    /^[a-z0-9_]+$/,
    'El usuario solo puede contener letras minúsculas, números y guiones bajos',
  )
  .toLowerCase()
  .trim()

export const fullNameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede tener más de 50 caracteres')
  .trim()

// SCHEMA DEL PERFIL (Validación Final)
export const profileDataSchema = z.object({
  username: usernameSchema,
  full_name: fullNameSchema,
  position: z
    .enum(POSICIONES_LISTA as [string, ...string[]], {
      message: 'Selecciona una posición válida de la lista',
    })
    .optional()
    .default('ANY'),
  avatar_url: z.string().url().optional(),
})

export type ValidatedAuthCredentials = z.infer<typeof authCredentialsSchema>
export type ValidatedProfileData = z.infer<typeof profileDataSchema>
