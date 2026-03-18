# 🎯 ROADMAP DE PRE-LANZAMIENTO - MatchFinder

## Fecha: 2026-03-18 | Estado: BUILD PHASE ✅ → POLISH PHASE 🔧

Este documento consolida la **deuda técnica y features pendientes** de la jornada de desarrollo, agrupado por módulo para la sesión de "Pulido y Pre-Lanzamiento".

---

## 📊 RESUMEN EJECUTIVO

- **Features completadas hoy**: GPS real, Check-in + Walkover con validación estricta, Storage bucket
- **Módulos con deuda**: 6 (Arquitectura, Auth, Teams, Market, Matches, Chat)
- **Tareas críticas bloqueo**: 2 (duplicidad inbox, remodelado de DMs)
- **Tareas de UX/pulido**: ~18-20 items
- **Estimado de sesión**: 3-4 horas de trabajo coordinado

---

## 🏗️ MÓDULO 00 - ARQUITECTURA & INFRAESTRUCTURA

### Crítico

- [x] **Resolver drift documental: Conversations (schema vs políticas)**
  - Validado con JSON actualizado: `supabase/policies.json`, `supabase/tables-columns.json` y `types/supabase.ts` están alineados en `chat_type/team_id/player_id`
  - Eliminado riesgo previo de referencia a `participant_a/participant_b`
  - **Estado**: CERRADO (no bloqueador activo)

- [ ] **Crear script CI verificador de drift**
  - Comparar columnas reales de Supabase vs `types/supabase.ts`
  - **Objetivo**: Detectar divergencia en PR antes de merge
  - **Tech**: Node script + Supabase API query

### Importante

- [ ] **Versionar documentación en sync con migraciones**
  - Actualizar docs cuando schema cambia
  - Marcar en cada doc: fecha generada, versión schema, cambios desde última entrada

- [ ] **Añadir ADRs (Architecture Decision Records) por módulo crítico**
  - Módulos: `matches`, `chat`, `teams`
  - Formato: 1 página máximo por decisión
  - Ejemplo: "Por qué match flow usa 4 hooks en lugar de 1 hook monolítico"

---

## 🔐 MÓDULO 01 - DATABASE & SECURITY

### Importante

- [x] **Unificar fuente de verdad en `conversations` (BLOQUEADOR)**
  - Confirmado modelo vigente: `chat_type/team_id/player_id`
  - Políticas y tipos ya están sincronizados con ese modelo
  - **Estado**: CERRADO (bloqueador removido)

- [ ] **Documentar semántica de DIRECT chats (`team_id` como peer user en workaround)**
  - El drift se cerró, pero persiste deuda semántica en `dm.service.ts`
  - Documentar explícitamente el mapping para evitar regresiones hasta migración de modelo DM

### Importante

- [ ] **Endurecer RLS en tablas con lectura pública**
  - Revisión: `profiles`, `team_members`, `matches`, `player_stats`
  - ¿Realmente todo usuario debe ver todos los datos públicamente?
  - Posible tightening: `profiles` solo muestra nombre/avatar (no deleted_at, etc.)
  - `player_stats` por partido público, pero no histórico futuro

- [ ] **Documentar matriz de permisos por rol**
  - Tabla: Tabla x Rol (PLAYER/SUB_ADMIN/ADMIN) x Operación (SELECT/INSERT/UPDATE/DELETE)
  - Incluir en doc 01

---

## 👤 MÓDULO 02 - AUTH & PROFILES

### Importante

- [ ] **Unificar lógica de validación visual por campo**
  - Hoy hay `errors` local pero feedback sale por toast inconsistentemente
  - Crear helper `validateFormField` que retorne error para mostrar inline
  - Aplicar en: `login.tsx`, `onboarding.tsx`, `edit-profile.tsx`

- [ ] **Endurecer flujo de signup según política de email**
  - ¿App requiere confirmación de email?
  - Si sí: manejar estado de `user_metadata.email_confirmed === false`
  - UI: mostrar banner "Confirma email antes de acceder"

- [ ] **Agregar refresh optimista de perfil post-edición**
  - Hoy: toda edit dispara `initializeProfile` que recarga desde server
  - Mejor: actualizar state local inmediatamente, luego sync en background
  - Usar SWR pattern o `useOptimisticUpdate` custom

- [ ] **Estandarizar cache busting de assets**
  - Avatar usa query param timestamp: `avatar_url?t=123456`
  - Aplicar mismo patrón a logos/banners de equipo y marketplace
  - Crear helper centralizado en `lib/cache.ts`

- [ ] **Tests de contrato para `auth.service.ts`**
  - Casos de error mapeados: `invalid credentials`, `email not confirmed`, `23505` (unique violation)
  - Mock de Supabase para cada caso
  - Cobertura: login, signup, resetPassword

---

## 👥 MÓDULO 03 - TEAMS & RIVALS

### Importante

- [ ] **Implementar navegación en modal TeamDetailModal estado ACCEPTED**
  - Botón "Ver Partido" actualmente no hace nada
  - Acción: navegar a `app/match/[id]` con partido actual entre equipos
  - Validación: partido debe estar activo entre ambos

- [ ] **Poblar estadísticas reales de rival en TeamDetailModal**
  - Hoy: hardcodeado a `Partidos: 0 | Victorias: 0 | Derrotas: 0`
  - Agregar: query de `match_results` + `matches` para equipo
  - Mostrar: W-D-L, goles promedio, ELO rating

- [ ] **Unificar helper de permisos de gestión de equipo**
  - Lógica de "¿puedo hacer X?" vive en N lugares (rivals, dm, manage-team)
  - Crear `isTeamManager(userId, teamId, membersList)` en `lib/permissions.ts`
  - Usar en: checks de enviable de desafío, acceso a chat de equipo, etc.

- [ ] **Agregar paginación + debounce en búsqueda de rivales**
  - Hoy: sin paginación, busca `LIKE` en cada keystroke
  - Añadir: `limit(20)` en query, offset pagination + scroll infinite
  - Debounce: esperar 300ms sin keystroke antes de lanzar query
  - Componente: `RivalsSearchFilters.tsx` + cargar lazy en scroll

- [ ] **Consolidar `TeamMemberDetail` en única fuente de verdad**
  - Existe en servicio + `types/teams.ts` con inconsistencias
  - Decidir ubicación: `types/teams.ts` preferente
  - Sincronizar todos los imports

---

## 🛍️ MÓDULO 04 - MARKET & FICHAJES

### Importante

- [ ] **Alinear enum de estados: tipos vs DB**
  - `types/market.ts`: usa `OPEN | CLOSED`
  - DB enum (`estado_mercado_enum`): `OPEN | FILLED | EXPIRED`
  - Decisión: usar enum DB, normalizar en app a `OPEN | FILLED | EXPIRED | CLOSED (deprecated)`
  - Actualizar `market.service.ts` normalizador

- [ ] **Completar joins en query de mercado**
  - Select no trae `team.category` pero card intenta usarla
  - Revisar select en `market.service.getMarketPosts()`: asegurar `team(*, category)` o similar
  - Aplicar a todas las vistas de market

- [ ] **Implementar paginación + búsqueda textual en mercado**
  - Hoy: solo filtro por posición, refresh manual
  - Agregar:
    - Búsqueda ILIKE por nombre equipo / posición favorita del jugador
    - Infinite scroll con offset pagination
    - Filtro de "equipos de mi zona"
  - Componente: `MarketSearchFilters.tsx`

- [ ] **Agregar telemetría de conversión en mercado**
  - Métrica: ¿cuántas publicaciones terminan en conversación activa?
  - Track evento: `post_contacted` con `(postId, tipo)`
  - Dashboard simple en dev: contador en tab Mensajes

- [ ] **Mejorar UX de owner de post**
  - Hoy: botón "Tu publicación" sin acciones, solo delete
  - Agregar: botón "Editar" (reabrir modal), botón "Marcar como resuelta" (FILLED manual)
  - Permitir editar descripción mientras esté OPEN

---

## ⚽ MÓDULO 05 - MATCHES CORE

### Crítico

- [ ] **Implementar estado LIVE con etapa diferenciada en UI**
  - Hoy: estado existe en DB pero UI no lo muestra distinto
  - Crear: [components/match/LiveMatchView.tsx](components/match/LiveMatchView.tsx)
  - Mostrar: cronómetro, scoreboard live, sustituciones, tarjetas
  - Transición: auto a LIVE cuando timestamp >= scheduled_at + ventana checkin

### Importante

- [ ] **Validación robusta de cancelación de partido**
  - Update en `cancelMatch`: evitar setear `scheduled_at` a `undefined`
  - Mejor: setBitwise `status = CANCELLED` explícitamente
  - Agregar: check de permiso (solo managers + >24h antes)
  - UI feedback: mostrar banner de confirmación, timer countdown

- [ ] **Confirmar handshake bilateral de resultado**
  - DB tiene `confirmed_by_a` y `confirmed_by_b` pero submitResult no los usa
  - Implementar: submit marca `confirmed_by_X = true`, estado pasa a FINISHED solo si ambos true
  - UI: mostrar "Esperando confirmación del rival" hasta bilateral

- [ ] **Flujo robusto de actualizacion de `booking_confirmed`**
  - Campo existe pero no hay UI para activarlo
  - Caso de uso: cancha se reserva/confirma booking antes del partido
  - Agregar: botón en EditMatchModal "Confirmar Booked" post-schedule
  - Mostrar badge en MatchHeader si booking_confirmed=true

- [ ] **Parametrizar defaults de modalidad/duración**
  - Hoy: hardcodeado en frontend (ej: "Futsal 90min")
  - Crear: tabla `match_presets` (id, modalidad, duracion, zona_aplicable) o enum
  - Cargar en: modales de propuesta y edición
  - Permitir admin override en future

---

## 💬 MÓDULO 06 - CHAT SYSTEM

### Crítico (BLOQUEADOR)

- [ ] **Resolver duplicidad de implementaciones Inbox**
  - [app/chat/inbox.tsx](app/chat/inbox.tsx) y [components/chat/ChatInbox.tsx](components/chat/ChatInbox.tsx) solapan
  - Decisión:
    - Opción A: Mantener ChatInbox como componente reutilizable, app/inbox lo usa
    - Opción B: Eliminar app/inbox, solo ChatInbox en tabs/market
  - **Recomendación**: Opción A, consolidar prop/state interface de ChatInbox
  - **Riesgo**: Sync issues entre dos inboxes si divergen

- [ ] **Remodelar conversaciones DM: eliminar workaround de team_id**
  - Hoy: `dm.service` usa `team_id` para guardar "otro user id" en DIRECT chat
  - Problema: semánticamente confuso, riesgo de bug cuando se filtran equipos
  - Solución:
    - Opción A: Agregar columna `participant_ids: UUID[]` JSONB
    - Opción B: Crear tabla `conversation_participants` pivot
  - **Recomendación**: Opción B por clarity, migración en próxima sesión
  - **Interim**: Documentar explícitamente en `dm.service.ts` este mapping

### Importante

- [ ] **Sincronizar enriquecimiento realtime en chat**
  - DM rehidrata sender prima de pintar: ✅ correcto
  - Match chat inserta payload crudo sin join: ❌ inconsistente
  - Acción: En `ChatSection.tsx` realtime handler, rehidratar `match_messages` con sender profile
  - Precedente: copiar patrón de DM

- [ ] **Implementar flujo robusto de marcación read/unread**
  - Columna `is_read` existe pero no hay lógica en UI
  - Agregar:
    - `updateMessageRead(messageId)` en servicio
    - Badge de contador en tab Chat si hay no leído
    - Mark as read on scroll sobre mensaje en conversación
  - Estrategia: batch update cada 1s de mensajes "visitados"

- [ ] **Extraer lógica asimétrica de bando para TEAM_PLAYER**
  - Hoy: regla de "lado de burbuja" vive principalmente en pantalla
  - Crear: `getBandoOrientation(message, userId, teamId)` en `lib/chat-utils.ts`
  - Usar en: `ChatMessageItem.tsx`, `DmMessageBubble.tsx`
  - Beneficio: menor riesgo de regresiones visuales

---

## 🎁 MÓDULO BONUS - NEW FEATURES (Post Pre-Launch)

Estas son features que salen en sesiones posteriores pero conviene documentar:

- [ ] **Real-time player presence en partido**
  - Estado: "Jugador X acaba de llegar" durante checkin
  - Usar: Supabase Realtime + presencia corta vida

- [ ] **Estadísticas históricas y leaderboards**
  - Top scorers, best win rate, MVP count por temporada
  - Tablas: `seasonal_stats`, `leaderboards` (cache)

- [ ] **Notificaciones push**
  - Aceptación de desafío, inicio de partido, resultado cargado
  - Setup: Expo Notifications + backend trigger

- [ ] **Integración de mapas**
  - Mostrar ubicación real de cancha en partido + ruta GPS
  - Lib: `expo-location` + `react-native-maps`

- [ ] **Video/replay de conforme a highlights**
  - Upload de video corto post-partido
  - Storage: `match-replays` bucket con políticas restrictivas

---

## 📋 TABLA DE PRIORIZACIÓN

| Módulo | Tarea                         | Prioridad  | Est. (mins) | Bloqueador |
| ------ | ----------------------------- | ---------- | ----------- | ---------- |
| 00     | Script CI verificador         | MEDIA      | 45          | NO         |
| 01     | Documentar semántica DIRECT   | MEDIA      | 25          | NO         |
| 01     | Endurecer RLS tablas públicas | MEDIA      | 30          | NO         |
| 02     | Unificar validación visual    | MEDIA      | 40          | NO         |
| 02     | Email confirmation flow       | MEDIA      | 35          | NO         |
| 02     | Optimistic profile refresh    | BAJA       | 30          | NO         |
| 03     | Navegación rival ACCEPTED     | MEDIA      | 25          | NO         |
| 03     | Estadísticas rival reales     | MEDIA      | 40          | NO         |
| 03     | Helper permisos equipo        | IMPORTANTE | 35          | NO         |
| 03     | Paginación rivales            | MEDIA      | 50          | NO         |
| 03     | Consolidar TeamMemberDetail   | BAJA       | 20          | NO         |
| 04     | Alinear enum estados          | IMPORTANTE | 30          | NO         |
| 04     | Completar joins market        | MEDIA      | 15          | NO         |
| 04     | Paginación + búsqueda market  | MEDIA      | 60          | NO         |
| 04     | Telemetría conversión         | BAJA       | 25          | NO         |
| 04     | Owner post UX                 | BAJA       | 35          | NO         |
| 05     | Estado LIVE con UI            | IMPORTANTE | 80          | NO         |
| 05     | Validación cancelación        | MEDIA      | 25          | NO         |
| 05     | Handshake bilateral resultado | IMPORTANTE | 50          | NO         |
| 05     | Flujo booking_confirmed       | BAJA       | 40          | NO         |
| 05     | Parametrizar defaults         | BAJA       | 30          | NO         |
| 06     | Eliminar duplicidad inbox     | CRÍTICA    | 45          | SÍ         |
| 06     | Remodelar DM conversations    | CRÍTICA    | 120         | SÍ         |
| 06     | Sincronizar realtime          | MEDIA      | 35          | NO         |
| 06     | Marcación read/unread         | MEDIA      | 45          | NO         |
| 06     | Lógica bando TEAM_PLAYER      | MEDIA      | 30          | NO         |

---

## 🚀 PRÓXIMAS SESIONES (FASES)

### Fase 1: PULIDO (Esta sesión - 3.5h)

**Orden recomendado:**

1. Eliminar duplicidad Inbox (architecture, 45min)
2. Remodelar DM conversations (data model, 120min)
3. Estadísticas rival (feature completeness, 40min)
4. Implementar estado LIVE (feature completeness, 80min)
5. Handshake bilateral (correctness, 50min)

**Timebox total**: 5h 35min

### Fase 1.5: Folklore y Retención (MVPs, Goleadores y Ranking)

Objetivo: convertir cada partido en una historia compartible y medible para mejorar recurrencia semanal.

Backend

- [ ] Diseñar y aplicar modelo de eventos/estadísticas por partido (tabla dedicada por jugador y partido con constraints de unicidad por `match_id + user_id`)
- [ ] Definir fuente de verdad del MVP por partido (un solo MVP por match con constraint único parcial o tabla dedicada)
- [ ] Implementar reglas de puntuación/ranking por equipo (victoria/empate/derrota + diferencial opcional)
- [ ] Crear vistas/RPC para leaderboard de goleadores (global + por temporada)
- [ ] Crear vistas/RPC para ranking de equipos (por puntos y desempates)
- [ ] Exponer endpoint/servicio para actualizar stats al confirmar resultado bilateral
- [ ] Añadir validaciones de consistencia: suma de goles por jugador = goles de `match_results` por equipo
- [ ] Endurecer RLS para que solo managers/autores válidos puedan cargar y confirmar stats

Frontend

- [ ] Extender flujo postpartido para registrar goleadores y seleccionar MVP
- [ ] Crear UI de confirmación de stats entre ambos equipos (estado pendiente/confirmado)
- [ ] Agregar sección "Folklore" en partido: MVP destacado + tabla de goleadores del match
- [ ] Crear pantalla/tab de rankings con 2 vistas: "Tabla de Equipos" y "Top Goleadores"
- [ ] Agregar indicadores de progresión (racha, subida/bajada en ranking, badges MVP)
- [ ] Integrar estados vacíos y skeletons para rankings sin datos
- [ ] Instrumentar eventos analíticos (view_ranking, submit_mvp, submit_scorers)
- [ ] QA visual mobile-first (listas largas, empate de puntos, manejo de nulls)

### Fase 2: QA & REFINEMENT (Próxima sesión)

- Tests de contrato para servicios críticos
- E2E testing de flujos core
- Performance profiling
- Accesibilidad (a11y) pass

### Fase 3: LAUNCH PREP

- Security audit (OWASP mobile)
- Compliance review (datasharing, GDPR si aplica)
- Store assets (screenshots, descriptions)
- Versión bump y release notes

## ⚙️ DevOps & CI/CD

- [ ] Configurar pipeline GitHub Actions en push/PR a `main`
- [ ] Validar `npm ci` + `tsc --noEmit` + `eslint` como quality gate obligatorio
- [ ] Bloquear merge si falla el pipeline (branch protection)
- [ ] Agregar badge de estado CI en `README.md`
- [ ] Definir convención de ramas y PR template mínimo (scope, pruebas, riesgo)
- [ ] Estandarizar checks locales con script único (`npm run verify`)
- [ ] Planificar workflow adicional de release (tag + changelog + build profile)
- [ ] Documentar runbook de fallas CI para onboarding rápido

---

## 📝 NOTAS FINALES

- **GPS & Walkover**: ✅ **COMPLETADO HOY** - feature lista y en producción
- **Storage bucket match-evidence**: ✅ **COMPLETADO HOY** - migraciones aplicadas, RLS configuradas
- **Check-in con validación estricta**: ✅ **COMPLETADO HOY** - backend + UI sincronizadas
- **Preview de evidencia W.O. (UX crítico)**: ✅ **COMPLETADO HOY** - captura con preview, reintento y confirmación antes de upload
- **Debt acumulado**: ~14-17h de trabajo (realista para sprint de pulido)
- **Recomendación**: Priorizar bloqueadores de Chat (Inbox + modelo DM) antes de features

---

Documento generado: **2026-03-18 | Build Session 1 - GPS + Walkover + Check-in Completion**
