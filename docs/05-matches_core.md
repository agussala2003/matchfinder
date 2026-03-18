# 05 - Matches Core (Estado Real de Codigo)

## Resumen

Este es el modulo central de MatchFinder para ciclo completo de partido: descubrimiento, negociacion, confirmacion, check-in y cierre.

Arquitectura actual dividida en dos capas:

1. Lista y entrada a partidos

- [app/(tabs)/match.tsx](<app/(tabs)/match.tsx>)

2. Contenedor de partido individual y flujo interno

- [app/match/[id].tsx](app/match/[id].tsx)
- Hook de wiring: [hooks/useMatchScreenWiring.ts](hooks/useMatchScreenWiring.ts)
- Hooks de dominio:
  - [hooks/useMatchDetails.ts](hooks/useMatchDetails.ts)
  - [hooks/useMatchCriticalActions.ts](hooks/useMatchCriticalActions.ts)
  - [hooks/useMatchDerivedState.ts](hooks/useMatchDerivedState.ts)
  - [hooks/useMatchScreenState.ts](hooks/useMatchScreenState.ts)

## Flujo de Usuario (UX)

### A) Lista de partidos

1. Usuario abre tab partidos.
2. App resuelve equipos del usuario y permisos de gestion (ADMIN/SUB_ADMIN).
3. Se listan partidos de equipo actual agrupados por seccion:
   - En vivo
   - Por agendar
   - Calendario
   - Finalizados
4. Si no hay equipo o no hay partidos, muestra estados vacios guiados.

### B) Pantalla de partido individual

1. Se carga partido por id y se valida pertenencia del usuario a team A o B.
2. El flujo de pantalla deriva en 3 vistas:
   - `previa`
   - `checkin`
   - `postmatch`
3. En previa:
   - Chat y propuestas.
   - Detalles del partido.
   - Plantel citado.
4. En checkin:
   - Simulacion de proximidad GPS y check-in.
   - Opcion de reclamar W.O. con evidencia.
5. En postmatch:
   - Carga de resultado.
   - MVP y goles por jugador.
   - Envio de stats y cierre de partido.

## Arquitectura Frontend

### 1) Lista de partidos

- [app/(tabs)/match.tsx](<app/(tabs)/match.tsx>)
  - Carga `myTeams` + `currentTeam`.
  - Ejecuta `matchesService.getMyMatches(teamId)`.
  - Evalua `canManage` con membresia y rol.
  - Usa componentes de lista:
    - [components/match-list/MatchSection.tsx](components/match-list/MatchSection.tsx)
    - [components/match-list/MatchCard.tsx](components/match-list/MatchCard.tsx)
    - [components/match-list/EmptyState.tsx](components/match-list/EmptyState.tsx)

### 2) Contenedor de detalle de partido

- [app/match/[id].tsx](app/match/[id].tsx)
  - Orquesta todo via `useMatchScreenWiring`.
  - Render condicional por `matchState`:
    - [components/match/PreMatchView.tsx](components/match/PreMatchView.tsx)
    - [components/match/CheckinMatchView.tsx](components/match/CheckinMatchView.tsx)
    - [components/match/PostMatchView.tsx](components/match/PostMatchView.tsx)
  - Monta modales comunes via [components/match/MatchFlowModals.tsx](components/match/MatchFlowModals.tsx).

### 3) Wiring y estado (desacople por hooks)

#### `useMatchScreenState`

- UI state local y efimero:
  - tab activa (`chat`, `lineup`, `details`)
  - input de chat
  - modales (proposal/edit/WO)
  - fecha/hora propuesta
  - modalidad/duracion/tipo
  - checkin y gpsDistance
  - score, mvp y goles

#### `useMatchDetails`

- Carga de dominio:
  - Match por id
  - Identidad del usuario
  - `myTeam` / `rivalTeam`
  - miembros y citados
  - historial de mensajes
- Define acciones de negocio:
  - enviar/aceptar/rechazar/cancelar propuesta
  - actualizar detalles
  - cancelar partido
  - enviar resultado
  - reclamar walkover
- Realtime:
  - suscripcion a `match_messages` por `match_id`
  - cleanup con `supabase.removeChannel(channel)`

#### `useMatchDerivedState`

- Deriva estado de etapa `matchState`:
  - `FINISHED` -> `postmatch`
  - `CONFIRMED` y ventana horaria activa -> `checkin`
  - resto -> `previa`
- Regla de cancelacion:
  - solo managers
  - solo si faltan >= 24h

#### `useMatchCriticalActions`

- Encapsula mutaciones criticas con loader/toast:
  - enviar texto
  - enviar propuesta
  - actualizar detalles
  - submit resultado
  - flujo evidencia + claim walkover

### 4) Vistas principales

#### PreMatchView

- [components/match/PreMatchView.tsx](components/match/PreMatchView.tsx)
- Composicion:
  - [components/match/MatchHeader.tsx](components/match/MatchHeader.tsx)
  - [components/match/MatchTabs.tsx](components/match/MatchTabs.tsx)
  - [components/match/ChatSection.tsx](components/match/ChatSection.tsx)
  - [components/match/DetailsView.tsx](components/match/DetailsView.tsx)
  - [components/match/LineupView.tsx](components/match/LineupView.tsx)

#### CheckinMatchView

- [components/match/CheckinMatchView.tsx](components/match/CheckinMatchView.tsx)
- Delega en [components/match/CheckinSection.tsx](components/match/CheckinSection.tsx):
  - checkin por umbral de distancia (`<= 100m`)
  - controles dev para simular distancia en `__DEV__`
  - boton de W.O.

#### PostMatchView

- [components/match/PostMatchView.tsx](components/match/PostMatchView.tsx)
- Delega en [components/match/PostmatchSection.tsx](components/match/PostmatchSection.tsx):
  - score home/away
  - seleccion MVP
  - goles por jugador
  - submit de resultado

### 5) Flujo de modales (Propuesta, Edicion, Walkover)

Montados via [components/match/MatchFlowModals.tsx](components/match/MatchFlowModals.tsx):

1. Propuesta

- [components/match/modals/MatchProposalFlowModal.tsx](components/match/modals/MatchProposalFlowModal.tsx)
- [components/match/modals/ProposalModal.tsx](components/match/modals/ProposalModal.tsx)
- Define fecha, hora, tipo, modalidad y duracion.

2. Edicion

- [components/match/modals/MatchEditFlowModal.tsx](components/match/modals/MatchEditFlowModal.tsx)
- [components/match/modals/EditMatchModal.tsx](components/match/modals/EditMatchModal.tsx)
- Permite confirmar/ajustar fecha, hora y sede.

3. DateTime picker compartido

- [components/match/modals/MatchDateTimePickerSheet.tsx](components/match/modals/MatchDateTimePickerSheet.tsx)
- iOS: sheet tipo spinner.
- Android: picker nativo inline.

4. Walkover

- [components/match/modals/MatchWalkoverModal.tsx](components/match/modals/MatchWalkoverModal.tsx)
- Solicita evidencia fotografica antes de reclamar W.O.

## Arquitectura Backend (Supabase)

### Servicios consumidos

- [services/matches.service.ts](services/matches.service.ts)
  - listados y detalle de matches
  - update de datos/estado
  - save de resultados
- [services/chat.service.ts](services/chat.service.ts)
  - chat de partido y propuestas en `match_messages`
- [services/stats.service.ts](services/stats.service.ts)
  - guardado de `player_stats`
- [services/storage.service.ts](services/storage.service.ts)
  - upload evidencia W.O. a bucket `match-evidence`

### Consultas SQL relevantes

- Lista por equipo:
  - `matches` + joins `team_a/team_b` + `match_messages`.
- Match activo entre equipos:
  - filtro simetrico teamA/teamB + status activos.
- Detalle por id:
  - match + teams + venue.
- Update match:
  - `update(payload).eq('id', matchId)`.
- Resultado:
  - `match_results.upsert(..., onConflict: 'match_id')`.
- Mensajeria de partido:
  - insert/update/select en `match_messages`.
- Estadisticas:
  - insert en `player_stats` por partido.

### Estados de partido en backend

Enum DB (`estado_partido_enum`) usado por servicio y hooks:

- `PENDING`
- `CONFIRMED`
- `LIVE`
- `FINISHED`
- `WO_A`
- `WO_B`
- `CANCELLED`

### Mapping de etapas UI vs estado DB

- UI `previa`: mayormente `PENDING/CONFIRMED` fuera de ventana checkin.
- UI `checkin`: `CONFIRMED` dentro de ventana horaria.
- UI `postmatch`: `FINISHED` (o forzado local en submit exitoso).
- Walkover: update de estado a `WO_A` o `WO_B` segun team reclamante.

## Deuda Tecnica / Next Steps

1. Estado `LIVE` poco explotado en detalle:
   - El flujo principal no muestra una etapa dedicada distinta en pantalla de detalle.
2. Checkin GPS es simulado:
   - `gpsDistance` se maneja localmente, sin validacion de geolocalizacion real.
3. Riesgo de carrera en mensajes realtime:
   - Al insertar por realtime se usa `payload.new` sin rehidratar joins de perfil, puede quedar inconsistente respecto a mensajes iniciales.
4. `cancelMatch` limpia `scheduled_at` con `undefined`:
   - Dependiendo de serializacion, conviene confirmar si realmente persiste `NULL` en DB cuando se espera.
5. `submitResult` marca `FINISHED` directamente:
   - No hay handshake de confirmacion bilateral completo pese a columnas `confirmed_by_a` y `confirmed_by_b`.
6. Campo `booking_confirmed` existe en modelo pero no se ve flujo robusto de actualizacion en UI.
7. Algunos defaults de modalidad/duracion son hardcoded en frontend, no persistidos como entidad separada.
