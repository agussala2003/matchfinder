# 04 - Market y Fichajes (Estado Real de Codigo)

## Resumen

El modulo de Mercado funciona como board de postulaciones bidireccional:

- Equipo buscando jugador (`TEAM_SEEKING_PLAYER`).
- Jugador buscando equipo (`PLAYER_SEEKING_TEAM`).

La UX esta centralizada en [app/(tabs)/market.tsx](<app/(tabs)/market.tsx>) con tres tabs:

- Buscan Jugador
- Buscan Equipo
- Mensajes

El tercer tab reutiliza inbox de chat dentro del mercado via [components/chat/ChatInbox.tsx](components/chat/ChatInbox.tsx).

## Flujo de Usuario (UX)

1. Usuario entra a Mercado y ve tabs.
2. En tabs de board (`PLAYERS` o `TEAMS`) puede:
   - Filtrar por posicion.
   - Ver cards de publicaciones OPEN.
   - Crear publicacion desde FAB.
3. Al crear publicacion se abre [components/market/CreatePostModal.tsx](components/market/CreatePostModal.tsx):
   - Elige tipo de publicacion.
   - Selecciona posicion.
   - Opcionalmente agrega descripcion.
   - Si es equipo buscando jugador, debe elegir equipo administrado.
4. En una card ajena puede:
   - Contactar.
   - Ver estadisticas (jugador o equipo segun tipo).
5. Contactar dispara flujo diferente segun tipo:
   - `TEAM_SEEKING_PLAYER`: jugador inicia chat hacia equipo.
   - `PLAYER_SEEKING_TEAM`: capitan/subcapitan elige equipo emisor y abre chat hacia jugador.
6. El owner del post puede eliminar su propia publicacion.

## Arquitectura Frontend

### Pantalla contenedora

- [app/(tabs)/market.tsx](<app/(tabs)/market.tsx>)
  - Estado de tab: `PLAYERS | TEAMS | MESSAGES`.
  - Estado de datos: `posts`, `currentUserId`, `myTeamIds`.
  - Filtro por posicion con `Select`.
  - Carga de posts con `marketService.getPosts(type)`.
  - Exclusion de posts de equipos propios (cuando corresponde) para evitar autoposteo en feed de equipos.

### Componentes principales

- [components/market/CreatePostModal.tsx](components/market/CreatePostModal.tsx)
  - Form de alta de post.
  - Si tipo = `TEAM_SEEKING_PLAYER`, usa `teamsService.getUserManagedTeams` y exige seleccion de equipo.
- [components/market/MarketPostCard.tsx](components/market/MarketPostCard.tsx)
  - Render dinamico de card segun tipo.
  - Contactar, ver stats y borrar (si owner).
- [components/market/TeamSelectionModal.tsx](components/market/TeamSelectionModal.tsx)
  - Selector de equipo cuando el emisor administra multiples equipos.

### Diferencia funcional entre tipos de post

Implementada explicitamente en [app/(tabs)/market.tsx](<app/(tabs)/market.tsx>):

1. `TEAM_SEEKING_PLAYER`
   - Publica un equipo.
   - Contacto iniciado por jugador.
   - Se usa `teamChatService.getOrCreateTeamConversation(teamId, playerId)`.

2. `PLAYER_SEEKING_TEAM`
   - Publica un jugador.
   - Contacto iniciado por un equipo administrado por capitan/sub.
   - Se usa `teamChatService.getOrCreateTeamToPlayerConversation(teamId, targetPlayerId)`.
   - Si hay multiples equipos administrados, se muestra modal de seleccion.

### Tipos y contratos

- [types/market.ts](types/market.ts)
  - `MarketPostType`: `TEAM_SEEKING_PLAYER | PLAYER_SEEKING_TEAM`.
  - `MarketPostStatus`: `OPEN | CLOSED`.
  - Modelo de joins `team` y `profile` para render de feed.

## Arquitectura Backend (Supabase)

### Servicios consumidos

- [services/market.service.ts](services/market.service.ts)
  - `getPosts(filterType?)`
  - `createPost(...)`
  - `deletePost(postId)`
- [services/team-chat.service.ts](services/team-chat.service.ts)
  - Creacion/recuperacion de conversaciones `TEAM_PLAYER`.
- [services/teams.service.ts](services/teams.service.ts)
  - `getUserManagedTeams` para permisos de contacto en nombre de equipo.

### Consultas SQL relevantes

- Feed mercado:
  - `from('market_posts').select('*, team:teams(...), profile:profiles(...)')`
  - `eq('status', 'OPEN')`
  - `eq('type', filterType)` cuando aplica.
- Alta de post:
  - `insert(payload).select().single()` en `market_posts`.
- Borrado:
  - `delete().eq('id', postId)`.

### Tablas afectadas

- `market_posts`
- `teams` (join)
- `profiles` (join)
- `conversations` (cuando se inicia contacto)

### Permisos y seguridad efectiva

- RLS observada en `market_posts` (documentada en modulo DB/security):
  - SELECT publico.
  - INSERT para autenticados.
  - DELETE condicionado a owner/capitan.
- Capa app agrega guardas adicionales:
  - Contacto hacia jugador requiere rol ADMIN/SUB_ADMIN en equipo emisor.
  - Seleccion de equipos gestionados para evitar spoofing de identidad de equipo.

## Deuda Tecnica / Next Steps

1. Desalineacion de estado en tipos:
   - `types/market.ts` define `OPEN | CLOSED`, pero enum DB usa `OPEN | FILLED | EXPIRED`.
   - `market.service.ts` normaliza a `CLOSED` todo lo no OPEN.
2. Joins incompletos en query de mercado:
   - En `market.service.ts`, select de `team` no trae `category`, pero la card intenta usarla.
3. Falta paginacion/busqueda textual en mercado:
   - Actualmente solo filtro por posicion y refresh manual.
4. Falta telemetria de conversion:
   - No hay tracking de cuantas publicaciones terminan en conversacion efectiva.
5. Posible friccion UX en owner post:
   - Owner solo ve "Tu publicacion" sin acciones de edicion (solo delete).
