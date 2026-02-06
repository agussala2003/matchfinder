import { supabase } from '@/lib/supabase';
import {
  AuthCredentials,
  AuthErrorCode,
  AuthResponse,
  ProfileCheckResult,
  ProfileData,
  ProfileResponse,
  UserProfile,
  authCredentialsSchema,
  profileDataSchema
} from '@/types/auth';
import { ServiceResponse } from '@/types/core';
import { AuthError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

class AuthService {
  /**
   * Maneja errores de validación de Zod
   */
  private handleValidationError(error: unknown): string {
    if (error instanceof ZodError) {
      return error.issues[0]?.message || 'Error de validación';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Error de validación desconocido';
  }

  /**
   * Mapea errores de Supabase a mensajes en español
   */
  private mapError(error: AuthError | Error): { code: AuthErrorCode; message: string } {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('invalid login credentials')) {
      return { code: AuthErrorCode.INVALID_CREDENTIALS, message: 'Credenciales incorrectas.' };
    }
    if (errorMessage.includes('email not confirmed')) {
      return { code: AuthErrorCode.EMAIL_NOT_CONFIRMED, message: 'Confirma tu email primero.' };
    }
    if (errorMessage.includes('user already registered')) {
      return { code: AuthErrorCode.USER_ALREADY_EXISTS, message: 'Email ya registrado.' };
    }
    
    return { code: AuthErrorCode.UNKNOWN_ERROR, message: error.message };
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const validatedData = authCredentialsSchema.parse(credentials);
      const { data, error } = await supabase.auth.signInWithPassword(validatedData);

      if (error) {
        const mapped = this.mapError(error);
        return { success: false, error: mapped.message, errorCode: mapped.code };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Error de sesión.', errorCode: AuthErrorCode.UNKNOWN_ERROR };
      }

      return { success: true, data: { user: data.user, session: data.session } };
    } catch (error) {
      return { success: false, error: this.handleValidationError(error), errorCode: AuthErrorCode.INVALID_EMAIL };
    }
  }

  async signup(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const validatedData = authCredentialsSchema.parse(credentials);
      const { data, error } = await supabase.auth.signUp(validatedData);

      if (error) {
        const mapped = this.mapError(error);
        return { success: false, error: mapped.message, errorCode: mapped.code };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Error de registro.', errorCode: AuthErrorCode.UNKNOWN_ERROR };
      }

      return { success: true, data: { user: data.user, session: data.session } };
    } catch (error) {
      return { success: false, error: this.handleValidationError(error), errorCode: AuthErrorCode.INVALID_EMAIL };
    }
  }

  async logout(): Promise<ServiceResponse> {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async getSession(): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return { success: false, error: 'Sin sesión' };
    return { success: true, data: { user: data.session.user, session: data.session } };
  }

  async resetPassword(email: string): Promise<ServiceResponse> {
    try {
      const validatedEmail = authCredentialsSchema.shape.email.parse(email);
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: 'matchfinder://reset-password',
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: this.handleValidationError(error) };
    }
  }

  async checkProfile(userId: string): Promise<ProfileCheckResult> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) return { exists: false, isComplete: false };
      const isComplete = Boolean(profile.username && profile.full_name);
      return { exists: true, isComplete, profile: profile as UserProfile };
    } catch {
      return { exists: false, isComplete: false };
    }
  }

  /**
   * Upsert Profile: Aquí validamos formato (Zod) y Unicidad (Supabase Error 23505)
   */
  async upsertProfile(profileData: ProfileData): Promise<ProfileResponse> {
    try {
      // 1. Parseo y Validación de Formato con Zod (Posición, Regex de usuario, etc.)
      const validatedData = profileDataSchema.parse({
        username: profileData.username,
        full_name: profileData.full_name,
        position: profileData.position,
        avatar_url: profileData.avatar_url,
      });

      const dataToUpsert = {
        id: profileData.id,
        username: validatedData.username,
        full_name: validatedData.full_name,
        position: validatedData.position,
        avatar_url: profileData.avatar_url, // <--- AGREGAR ESTO
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(dataToUpsert)
        .select()
        .single();

      // 2. Validación de Unicidad (Catch de Error SQL)
      if (error) {
        if (error.code === '23505') { // Código PostgreSQL para Unique Violation
          return {
            success: false,
            error: 'Ese usuario ya existe. ¡Prueba otro más creativo!',
            errorCode: AuthErrorCode.USER_ALREADY_EXISTS,
          };
        }
        return { success: false, error: error.message, errorCode: AuthErrorCode.UNKNOWN_ERROR };
      }

      return { success: true, data: data as UserProfile };

    } catch (error) {
      // Catch de errores de validación de Zod
      if (error instanceof Error) {
        return { success: false, error: this.handleValidationError(error), errorCode: AuthErrorCode.INVALID_EMAIL };
      }
      return { success: false, error: 'Error desconocido' };
    }
  }
}

export const authService = new AuthService();