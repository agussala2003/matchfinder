# 02 - Auth and Profiles (Estado Real de Codigo)

## Resumen

Este modulo cubre autenticacion, onboarding inicial y mantenimiento de perfil del jugador.

En el estado actual, el flujo de acceso y perfil se apoya en:

- Auth de Supabase (email/password y reset password).
- Tabla `profiles` como extension del usuario autenticado.
- Validaciones con Zod en cliente antes de enviar datos a backend.
- Pantallas separadas para login, onboarding, recuperacion de password, perfil y edicion.

No hay pantalla de registro separada: el alta se ejecuta desde la misma pantalla de login con el boton "Crear Cuenta".

## Flujo de Usuario (UX)

1. Usuario entra a `app/login.tsx`.
2. Puede:
   - Iniciar sesion con email/password.
   - Crear cuenta (signup) desde el mismo formulario.
3. Tras login/signup exitoso:
   - Se ejecuta `authService.checkProfile(userId)`.
   - Si el perfil esta incompleto, redirige a `app/onboarding.tsx`.
   - Si esta completo, entra a tabs `/(tabs)`.
4. En onboarding:
   - Completa nombre, username y posicion.
   - Se persiste con `upsertProfile` en `profiles`.
5. En perfil (`app/(tabs)/profile.tsx`):
   - Ve datos personales, equipos, solicitudes pendientes y estadisticas.
   - Puede abrir edicion de perfil (`app/edit-profile.tsx`).
   - Puede cambiar avatar (subida a Supabase Storage y update de `profiles.avatar_url`).
6. En "Olvide mi contrasena" (`app/forgot-password.tsx`):
   - Ingresa email.
   - Se envia email de reset via Supabase.

## Arquitectura Frontend

### Pantallas principales

- `app/login.tsx`
  - Estado local: `email`, `password`, `errors`.
  - Acciones: `authService.login`, `authService.signup`, `checkProfileAndRedirect`.
  - Infra global: `useToast`, `useGlobalLoading.withGlobalLoading`.
- `app/onboarding.tsx`
  - Estado local: `username`, `fullName`, `position`, `userId`.
  - Carga sesion con `authService.getSession`.
  - Guarda perfil con `authService.upsertProfile`.
- `app/forgot-password.tsx`
  - Estado local: `email`, `loading`, `emailSent`.
  - Usa `authService.resetPassword`.
- `app/edit-profile.tsx`
  - Carga sesion + perfil actual.
  - Actualiza perfil via `upsertProfile` conservando `avatar_url` existente.
- `app/(tabs)/profile.tsx`
  - Carga paralela de perfil, equipos y requests de ingreso.
  - Carga stats agregadas de usuario (`statsService.getUserStats`).
  - Avatar: selector de imagen + upload + upsert de perfil.

### Componentes involucrados

- `components/auth/AuthHeader.tsx`
  - Encabezado visual de auth y onboarding.
- `components/profile/ProfileHeader.tsx`
  - Avatar, nombre, username, badge de posicion.
- `components/profile/StatsGrid.tsx`
  - Resumen de estadisticas (partidos/goles/victorias/mvps).
- `components/profile/PlayerStatsModal.tsx`
  - Estadisticas detalladas del jugador (win/draw/loss rate, promedios, reputacion).

### Contratos y validacion en frontend

- `types/auth.ts`
  - `AuthCredentials`, `AuthResponse`, `ProfileData`, `UserProfile`.
  - Esquemas Zod:
    - `authCredentialsSchema` (email/password)
    - `profileDataSchema` (username, full_name, position, avatar_url)
- `lib/constants.ts`
  - Catalogos de posiciones (`POSICIONES_LISTA`, `POSICIONES_ARGENTINAS`).

### Estado local y patron de errores

- Patrons predominantes:
  - Estados locales por pantalla (`useState`) para formularios.
  - `showToast` para feedback UX.
  - `ServiceResponse` uniforme para exito/error en servicios.
- Observacion:
  - Algunas pantallas declaran `errors` locales pero no setean validaciones por campo de forma consistente; la validacion final recae mas en Zod + toast.

## Arquitectura Backend (Supabase)

### Servicios consumidos

- `services/auth.service.ts`
  - `login`: `supabase.auth.signInWithPassword`
  - `signup`: `supabase.auth.signUp`
  - `logout`: `supabase.auth.signOut`
  - `getSession`: `supabase.auth.getSession`
  - `resetPassword`: `supabase.auth.resetPasswordForEmail`
  - `checkProfile`: `from('profiles').select('*').eq('id', userId).single()`
  - `upsertProfile`: `from('profiles').upsert(...).select().single()`
- `services/stats.service.ts`
  - `getUserStats`, `getPlayerStats` para vista perfil.
- `services/storage.service.ts`
  - `supabase.storage.from(bucket).upload(path, arrayBuffer, { upsert: true })`
  - `getPublicUrl(path)` para URL publica de avatar.

### Consultas SQL relevantes

- Perfil:
  - `profiles` SELECT por `id`.
  - `profiles` UPSERT de username/full_name/position/avatar.
- Estadisticas de usuario:
  - `player_stats` por `user_id`.
  - `match_results` por `match_id` para calcular victorias.
  - `matches` por `id` para distinguir team A/B.
- Estadisticas detalladas:
  - join `match_results` con `matches` para win/draw/loss.

### Tablas afectadas

- `profiles`
- `player_stats`
- `match_results`
- `matches`
- Buckets Storage:
  - `avatars`

### Seguridad y permisos efectivos

- RLS principal en `profiles`:
  - INSERT/UPDATE solo propio usuario (`auth.uid() = id`).
- App agrega validacion adicional:
  - Zod para formato de email/password/username/nombre.
  - Mapeo de errores Supabase a mensajes UX.

## Deuda Tecnica / Next Steps

1. Unificar logica de validacion visual por campo:
   - Hoy hay `errors` en pantalla pero la mayoria del feedback final sale por toast.
2. Endurecer flujo de signup dependiendo de politica de confirmacion de email:
   - Si el proyecto usa confirmacion de email estricta, `signup` puede no traer sesion inmediata.
3. Agregar refresh optimista de perfil tras editar sin recarga completa de pantalla.
4. Revisar estrategia de cache busting de avatar:
   - Se usa query param de timestamp, funciona, pero conviene estandarizar para todos los assets de perfil.
5. Agregar tests de contrato para `auth.service`:
   - Casos de error mapeados (`invalid credentials`, `email not confirmed`, `23505`).
