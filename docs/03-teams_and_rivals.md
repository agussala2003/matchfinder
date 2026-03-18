# 03 - Teams and Rivals (Estado Real de Codigo)

## Resumen

Este modulo cubre:

- Creacion y administracion de equipos.
- Ingreso por codigo de equipo.
- Gestion de miembros y roles (`ADMIN`, `SUB_ADMIN`, `PLAYER`).
- Descubrimiento de rivales y flujo de desafios.

La implementacion actual combina:

- Pantallas de equipo (`create-team`, `join-team`, `manage-team`, `rivals`).
- Servicios de negocio (`teamsService`, `challengesService`, `matchesService`).
- Reglas de permisos por rol en cliente + RLS en Supabase.
- RPC para traspaso atomico de capitania.

## Flujo de Usuario (UX)

1. Desde perfil, el usuario crea equipo en `app/create-team.tsx`.
2. Al crear:
   - Se inserta fila en `teams`.
   - Se inserta membership `ADMIN` + `ACTIVE` en `team_members`.
3. Otro usuario puede unirse por codigo en `app/join-team.tsx`.
   - Se crea request con estado `PENDING`.
4. En gestion de equipo `app/manage-team.tsx`:
   - Admin/SubAdmin ven solicitudes pendientes y pueden aceptar/rechazar.
   - Capitan puede promover/degradar roles y transferir capitania.
   - Miembros pueden abandonar el equipo.
5. En rivales `app/(tabs)/rivals.tsx`:
   - Se exploran equipos por nombre y zona.
   - Se envia desafio si hay permisos y no existe desafio/match activo.
   - Se acepta/rechaza/cancela desafio segun relacion y rol.

## Arquitectura Frontend

### Pantallas principales

- `app/create-team.tsx`
  - Form: nombre, categoria, zona.
  - Crea equipo via `teamsService.createTeam`.
- `app/join-team.tsx`
  - Input de codigo de 6 caracteres.
  - Solicita ingreso via `teamsService.joinTeamByCode`.
- `app/manage-team.tsx`
  - Carga equipo + miembros + usuario actual.
  - Calcula permisos locales:
    - `canEdit = ADMIN || SUB_ADMIN`
    - `isCaptain = team.captain_id === currentUser`
  - Gestiona solicitudes, roles, salida del equipo y escudo.
- `app/(tabs)/rivals.tsx`
  - Tabs: `EXPLORE` y `MY_CHALLENGES`.
  - Mantiene cache de matches activos por rival para estado de relacion.
  - Soporta multi-equipo (seleccion de equipo activo para desafiar).

### Componentes de composicion (equipo)

- `components/manage-team/TeamHeader.tsx`
- `components/manage-team/ShareCodeSection.tsx`
- `components/manage-team/PendingRequestsSection.tsx`
- `components/manage-team/ActiveMembersSection.tsx`
- Modales usados desde pantalla:
  - `EditTeamModal`
  - `MemberActionModal`
  - `ConfirmationModal`
  - `TeamStatsModal`

### Componentes de composicion (rivales)

- `components/rivals-list/SearchFilters.tsx`
- `components/rivals-list/RivalsList.tsx`
- `components/rivals-list/ChallengesList.tsx`
- `components/rivals/RivalCard.tsx`
- `components/rivals/TeamDetailModal.tsx`

### Modelo de relacion de desafio (UI)

En `RivalCard` y `RivalsScreen` se usa `ChallengeRelationship`:

- `NONE`
- `SENT`
- `RECEIVED`
- `ACCEPTED`
- `CAN_CANCEL`

Regla clave:

- Si existe match activo entre equipos, la relacion se fuerza a `ACCEPTED` para mostrar estado positivo.

## Arquitectura Backend (Supabase)

### Servicios consumidos

- `services/teams.service.ts`
  - Crear equipo y alta inicial de admin.
  - Obtener equipos del usuario.
  - Obtener miembros.
  - Join por `share_code`.
  - Aceptar/rechazar solicitud (status de membership).
  - Cambiar rol y transferir capitania (RPC).
- `services/challenges.service.ts`
  - Buscar rivales con conteo de miembros.
  - Enviar/reusar desafio.
  - Cancelar desafio pendiente.
  - Validar si puede crearse nuevo desafio.
  - Listar desafios del equipo.
  - Cambiar estado (accept/reject).
- `services/matches.service.ts`
  - Validar existencia de match activo entre dos equipos.

### Consultas SQL relevantes

- Equipo y membresia:
  - `teams.insert(...)`
  - `team_members.insert(...)` (alta admin)
  - `teams.select('*').eq('id', teamId).single()`
  - `team_members.select(...).eq('team_id', teamId)`
  - `team_members.update({ role/status }).eq(team_id, user_id)`
  - `team_members.delete().eq(team_id, user_id)`
- Join por codigo:
  - `teams.select('id').eq('share_code', code).single()`
  - `team_members.maybeSingle()` para evitar duplicados de solicitud.
- Traspaso capitania:
  - `rpc('transfer_team_captain', { team_id, new_captain_id })`
- Rivales:
  - `teams.select('*, member_count:team_members(count)').neq('id', myTeamId)`
  - filtros condicionales `eq('home_zone', zone)` y `ilike('name', query)`
- Desafios:
  - `challenges.insert/update/select` con condiciones OR entre ambos equipos.
  - Validacion de duplicado en `status = PENDING`.
- Match activo:
  - `matches.select(...).in('status', ['PENDING','CONFIRMED','LIVE'])` entre dos equipos.

### Tablas afectadas

- `teams`
- `team_members`
- `challenges`
- `matches`
- `profiles` (joins de miembros)
- Storage bucket de escudos:
  - `team-logos`

### Roles dentro del equipo (implementacion real)

Definidos en `types/core.ts` y coherentes con DB enum:

- `ADMIN`
  - Capitan del equipo.
  - Puede transferir capitania y gestionar miembros.
- `SUB_ADMIN`
  - Puede editar equipo y gestionar solicitudes/miembros segun RLS.
  - Puede enviar desafios desde rivales.
- `PLAYER`
  - Miembro regular.
  - Sin permisos de gestion.

Control en app:

- `manage-team`: acciones criticas dependen de `canEdit` e `isCaptain`.
- `rivals`: enviar desafio exige `canManage` (ADMIN o SUB_ADMIN).

## Deuda Tecnica / Next Steps

1. Navegacion pendiente en modal de rival cuando estado `ACCEPTED`:
   - En `TeamDetailModal`, boton "Ver Partido" aun no implementa accion real.
2. Estadisticas de rival hardcodeadas en UI:
   - `TeamDetailModal` muestra `Partidos/Victorias/Derrotas` en `0` fijo.
3. Revisar lectura de membresias para check de managers:
   - En `dm/team chat` y rivales se mezcla logica por rol entre cliente y RLS; conviene unificar helper comun de permisos.
4. Escalabilidad de busqueda de rivales:
   - Actualmente no hay paginacion ni debounce de busqueda.
5. Consolidar definicion de tipo `TeamMemberDetail`:
   - Existe en servicio y en `types/teams.ts` con diferencias historicas; conviene dejar una sola fuente de verdad.
