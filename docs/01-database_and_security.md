# 01 - Database and Security (Supabase)

## Resumen

La base de datos de MatchFinder está en PostgreSQL (Supabase, schema `public`) con RLS activa y tipado consumido desde `types/supabase.ts`.

El modelo cubre 4 dominios principales:

- Identidad y perfiles (`profiles`).
- Equipos y competencia (`teams`, `team_members`, `challenges`, `matches`, `match_results`, `player_stats`, `venues`, `seasons`).
- Comunicación (`match_messages`, `conversations`, `direct_messages`, `notifications`).
- Mercado (`market_posts`).

Además de políticas RLS, existen funciones/trigger logic de negocio para automatizar reglas (creación de match al aceptar challenge, transferencia de capitanía, borrado de equipo vacío, generación de share code).

## Flujo de Usuario (UX)

1. Usuario se autentica por Supabase Auth.
2. Se crea/actualiza su perfil en `profiles` (id = `auth.users.id`).
3. Usuario crea o se une a equipos (`teams` + `team_members`) y su rol define capacidades.
4. Desde esos permisos:
   - Gestiona miembros.
   - Envía/acepta desafíos.
   - Crea/actualiza partidos.
   - Envía mensajes en match chat o DM.
   - Publica o elimina avisos de mercado.
5. RLS filtra qué filas puede leer/escribir cada usuario en cada tabla.

## Arquitectura Frontend

### 1) Tipado DB en cliente

- El cliente Supabase se instancia como `createClient<Database>(...)` en `lib/supabase.ts`.
- Los servicios usan utilidades de tipo:
  - `Tables<'tabla'>`
  - `TablesInsert<'tabla'>`
  - `TablesUpdate<'tabla'>`
  - `Enums<'enum'>`

Esto hace que la app compile solo contra columnas/enums existentes en `types/supabase.ts`.

### 2) Enums de negocio confirmados

Desde `types/supabase.ts`:

- `challenge_status`: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`
- `estado_mercado_enum`: `OPEN`, `FILLED`, `EXPIRED`
- `estado_miembro_enum`: `ACTIVE`, `INACTIVE`, `PENDING`
- `estado_partido_enum`: `PENDING`, `CONFIRMED`, `LIVE`, `FINISHED`, `WO_A`, `WO_B`, `CANCELLED`
- `posicion_enum`: `GK`, `DEF`, `MID`, `FWD`, `ANY`
- `rol_enum`: `ADMIN`, `SUB_ADMIN`, `PLAYER`
- `team_category`: `MALE`, `FEMALE`, `MIXED`

### 3) Servicios que aplican permisos de negocio en app

Aunque la seguridad real está en RLS, la app añade filtros/validaciones previas:

- `teams.service.ts`
  - Alta de equipo + alta de capitán en `team_members`.
  - Filtros por estado/rol para membresía activa y equipos gestionados.
  - RPC `transfer_team_captain` para traspaso atómico.
- `challenges.service.ts`
  - Prevención de desafíos duplicados con checks de challenges activos y matches activos.
- `matches.service.ts`
  - Consulta partidos por pertenencia de equipo.
  - Upsert de `match_results`.
- `chat.service.ts`
  - Chat de partido solo por `match_id` asociado.
- `dm.service.ts` y `team-chat.service.ts`
  - Conversaciones directas y asimétricas equipo-jugador.
  - Chequeo de rol `ADMIN/SUB_ADMIN` para iniciar chats en nombre de equipo.

## Arquitectura Backend (Supabase)

### 1) Tablas principales y relaciones

Fuente principal: `types/supabase.ts` y `supabase/database.sql`.

#### Núcleo identidad/equipos

- `profiles`
  - PK/FK: `id -> auth.users.id`.
  - Campos: `username`, `full_name`, `position`, `avatar_url`, `reputation`.
- `teams`
  - FK: `captain_id -> profiles.id`.
  - Campos clave: `name`, `category`, `home_zone`, `elo_rating`, `share_code`.
- `team_members`
  - PK compuesta: `(team_id, user_id)`.
  - FK: `team_id -> teams.id`, `user_id -> profiles.id`.
  - Campos de permiso: `role`, `status`, `joined_at`.

#### Competencia

- `challenges`
  - FK dobles a `teams`: `challenger_team_id`, `target_team_id`.
  - Estado del desafío en `challenge_status`.
- `matches`
  - FK: `team_a_id`, `team_b_id` -> `teams.id`; `season_id` -> `seasons.id`; `venue_id` -> `venues.id`.
  - Estado del partido en `estado_partido_enum`.
- `match_results`
  - PK/FK: `match_id -> matches.id` (1:1).
- `player_stats`
  - FK: `match_id -> matches.id`, `user_id -> profiles.id`, `team_id -> teams.id`.
- `venues`, `seasons`
  - Tablas de soporte para cancha/temporada.

#### Comunicación

- `match_messages`
  - FK: `match_id -> matches.id`, `sender_team_id -> teams.id`, `sender_user_id -> auth.users.id`.
  - Soporta `type`, `proposal_data` JSONB, `status`.
- `conversations`
  - Modelo tipado actual: `chat_type`, `team_id`, `player_id`, `last_message_at`.
- `direct_messages`
  - FK: `conversation_id -> conversations.id`, `sender_id -> profiles.id`, `sender_team_id -> teams.id`.
- `notifications`
  - FK: `user_id -> auth.users.id`.

#### Mercado

- `market_posts`
  - FK: `match_id -> matches.id`, `team_id -> teams.id`, `user_id -> profiles.id`.
  - Estado en `estado_mercado_enum`.

### 2) Funciones SQL / automatismos detectados

Desde `supabase/functions.json`:

- `create_match_from_challenge`
  - Al pasar challenge a `ACCEPTED`, inserta un match amistoso (`is_friendly = TRUE`).
- `generate_unique_team_code`
  - Genera `share_code` único de 6 chars.
- `transfer_team_captain` (RPC pública tipada)
  - Degrada admins actuales, asciende nuevo capitán y sincroniza `teams.captain_id`.
- `sync_team_captain`
  - Sincroniza `captain_id` cuando un miembro pasa a `ADMIN`.
- `handle_captain_exit`
  - Si se elimina ADMIN, busca sucesor por prioridad (`SUB_ADMIN` > `PLAYER`) y antigüedad.
- `delete_team_if_empty`
  - Elimina equipo cuando no quedan miembros.

### 3) Políticas RLS actuales (inventario)

Fuente: `supabase/policies.json`.

#### Lectura pública (SELECT true)

- `profiles`, `teams`, `matches`, `venues`, `seasons`, `market_posts`, `match_results`, `player_stats`, `team_members`.

#### Reglas por ownership/identidad

- `profiles`
  - INSERT: `auth.uid() = id`
  - UPDATE: `auth.uid() = id`
- `notifications`
  - SELECT/UPDATE solo `auth.uid() = user_id`
  - INSERT permitido a usuarios autenticados.

#### Reglas por rol de equipo (`ADMIN`, `SUB_ADMIN`)

- `teams` UPDATE por managers activos del equipo.
- `team_members` UPDATE/DELETE por managers activos del equipo.
- `challenges`
  - ALL para outgoing challenges del equipo challenger.
  - UPDATE para responder incoming challenges del equipo target.
- `matches` INSERT/UPDATE por capitanes/subcapitanes de equipos involucrados.
- `match_results` INSERT/UPDATE por capitanes/subcapitanes activos en equipos del partido.
- `match_messages`
  - INSERT solo si usuario pertenece activo a `sender_team_id` y ese team participa en `match_id`.
  - UPDATE para admins/subadmins de equipos del match.

#### Reglas conversación/DM

- `conversations`: SELECT/INSERT/DELETE restringidos a participantes.
- `direct_messages`: SELECT/INSERT solo para miembros de la conversación.

### 4) Consultas SQL relevantes observadas en servicios

- Validación de desafíos activos:
  - `challenges` con `or(and(...),and(...))` + `status = PENDING`.
  - `matches` entre equipos con `status in (PENDING, CONFIRMED, LIVE)`.
- Guardado de resultados:
  - `match_results.upsert(..., { onConflict: 'match_id' })`.
- Gestión de membresía:
  - `team_members` por `status = ACTIVE/PENDING` y filtros por `role in (ADMIN, SUB_ADMIN)`.
- Chat:
  - `match_messages` y `direct_messages` ordenados por `created_at`.
  - `conversations.last_message_at` se actualiza en envío de DM.

## Deuda Técnica / Next Steps

1. Resolver inconsistencia crítica de modelo en `conversations`:
   - Tipado y SQL actual usan `chat_type/team_id/player_id`.
   - Políticas RLS listadas referencian `participant_a/participant_b`.
   - Riesgo: políticas no alineadas con schema real o snapshot de políticas desactualizado.
2. Unificar fuente de verdad:
   - Regenerar `types/supabase.ts` desde DB real después de aplicar migraciones.
   - Exportar `policies.json` en el mismo pipeline para evitar drift.
3. Endurecer seguridad de tablas con lectura pública:
   - Revisar si `profiles`, `team_members`, `matches`, `player_stats` deben seguir con SELECT público en todos los casos.
4. Agregar matriz formal de permisos por acción (Actor x Tabla x Operación) versionada en `docs/`.
5. Añadir pruebas automáticas de RLS (smoke tests con usuarios fake: jugador, admin, subadmin, outsider).
