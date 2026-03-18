# 06 - Chat System (Estado Real de Codigo)

## Resumen

El sistema de chat actual tiene 2 dominios complementarios:

1. DM conversacional (tabla `conversations` + `direct_messages`)
2. Chat de negociacion de partido (tabla `match_messages`)

En UI hay dos entradas principales:

- Inbox/Conversaciones:
  - [app/chat/inbox.tsx](app/chat/inbox.tsx)
  - [components/chat/ChatInbox.tsx](components/chat/ChatInbox.tsx)
- Detalle de conversacion:
  - [app/chat/[id].tsx](app/chat/[id].tsx)

Ademas, el chat de partido se consume desde [components/match/ChatSection.tsx](components/match/ChatSection.tsx) y se alimenta por [services/chat.service.ts](services/chat.service.ts).

## Flujo de Usuario (UX)

### Inbox

1. Usuario entra a inbox de chats.
2. Carga conversaciones visibles para su identidad (jugador o manager de equipo).
3. Ve cards con vista asimetrica segun tipo de chat.
4. Puede abrir conversacion o eliminarla.

### Conversacion DM

1. Al abrir [app/chat/[id].tsx](app/chat/[id].tsx), se cargan:
   - metadata de la conversacion
   - historial de mensajes
2. UI decide lado de cada burbuja segun rol/participacion.
3. Envio de mensaje actualiza `direct_messages` y `last_message_at`.
4. Nuevos mensajes entran por realtime.

### Chat de partido

1. Desde vista previa de partido, tab Chat permite managers negociar.
2. Se envian mensajes de texto y propuestas.
3. Respuestas a propuestas actualizan estado del mensaje y pueden confirmar partido.
4. Realtime actualiza el stream por `match_id`.

## Arquitectura Frontend

### Pantallas/Componentes clave

- [app/chat/inbox.tsx](app/chat/inbox.tsx)
  - Inbox standalone con listado y borrado.
- [components/chat/ChatInbox.tsx](components/chat/ChatInbox.tsx)
  - Inbox reusable (usado en tab Mensajes del Mercado).
  - Incluye suscripcion realtime de inbox.
- [app/chat/[id].tsx](app/chat/[id].tsx)
  - Vista de chat con header dinamico.
  - Render animado de mensajes (`AnimatedMessageItem`).
  - Logica de lado de burbuja para TEAM_PLAYER.
- [components/match/ChatSection.tsx](components/match/ChatSection.tsx)
  - Chat del contexto de partido (pre-match).

### Servicios de chat

- [services/dm.service.ts](services/dm.service.ts)
  - `getOrCreateConversation` (DIRECT)
  - `getConversationById`
  - `getMessages`
  - `sendMessage`
  - `getConversations`
  - `deleteConversation`
- [services/team-chat.service.ts](services/team-chat.service.ts)
  - Conversaciones `TEAM_PLAYER` iniciadas por equipo o jugador.
- [services/chat.service.ts](services/chat.service.ts)
  - Chat de partido (`match_messages`), propuestas y respuestas.

## Arquitectura Backend (Supabase)

### Tablas afectadas

- `conversations`
- `direct_messages`
- `match_messages`
- `profiles` (joins de sender/perfil)
- `teams` (joins de contexto equipo)

### Diferencia: DM clasico vs conversacion asimetrica TEAM_PLAYER

1. DM clasico (`DIRECT`)

- Conversacion entre dos usuarios.
- En implementacion actual se reutiliza `team_id` para guardar id del "otro usuario" en direct chat (workaround explicito en servicio).
- `player_id` representa uno de los extremos.

2. Conversacion asimetrica (`TEAM_PLAYER`)

- Conversacion entre una entidad equipo (`team_id`) y un jugador (`player_id`).
- En inbox/detalle la UI cambia avatar, nombre y lado de mensajes segun si usuario actua como:
  - jugador candidato
  - miembro administrador del equipo
- Soporta que capitan y subcapitan escriban por el mismo bando de equipo.

### Consultas SQL relevantes

- Conversaciones:
  - `from('conversations').select(...joins...)`
  - filtros OR por participacion directa y equipos gestionados.
- Mensajes DM:
  - `direct_messages.select(...sender join...)`
  - insert de mensaje + update de `conversations.last_message_at`.
- Chat de partido:
  - `match_messages.select/insert/update` con status de propuesta.

## Realtime (supabase.channel)

### Canales implementados

1. Inbox realtime

- [components/chat/ChatInbox.tsx](components/chat/ChatInbox.tsx)
- Canal: `inbox-${uid}`
- Evento: INSERT en `direct_messages`
- Estrategia: recargar conversaciones (`loadConversations`) al recibir evento.
- Cleanup: `supabase.removeChannel(channelRef.current)`.

2. Conversacion DM realtime

- [app/chat/[id].tsx](app/chat/[id].tsx)
- Canal: `dm-${conversationId}`
- Evento: INSERT en `direct_messages` filtrado por `conversation_id`.
- Estrategia: rehidratar mensaje insertado con join de sender antes de agregar al estado.
- Cleanup: `supabase.removeChannel(channel)`.

3. Match chat realtime

- [hooks/useMatchDetails.ts](hooks/useMatchDetails.ts)
- Canal: `match-${matchId}`
- Evento: INSERT en `match_messages` filtrado por `match_id`.
- Estrategia: prepend de `payload.new` en estado local de mensajes.
- Cleanup: `supabase.removeChannel(channel)`.

## Seguridad y permisos efectivos

- RLS (documentado en modulo DB/security) restringe:
  - lectura/escritura de direct messages a participantes de conversacion.
  - lectura/escritura de match messages a miembros habilitados de equipos del partido.
- Capa app suma guardas:
  - Solo ADMIN/SUB_ADMIN pueden iniciar ciertas conversaciones en nombre de equipo.
  - En chat de partido, solo managers pueden escribir y gestionar propuestas.

## Deuda Tecnica / Next Steps

1. Duplicidad de inbox implementations:
   - [app/chat/inbox.tsx](app/chat/inbox.tsx) y [components/chat/ChatInbox.tsx](components/chat/ChatInbox.tsx) solapan funcionalidad.
2. Modelo DIRECT con workaround en `team_id`:
   - `dm.service` documenta explicitamente uso de `team_id` para guardar otro user id en chat directo.
   - Esto incrementa complejidad semantica y riesgo de confusion.
3. Drift de politicas/modelo de conversations:
   - Ya detectado entre snapshots de schema/policies (participant_a/b vs modelo actual).
4. Inconsistencia de enriquecimiento realtime:
   - DM rehidrata sender antes de pintar; match chat inserta payload crudo sin join, posible disparidad de UI.
5. Estado de lectura (`is_read`) subutilizado:
   - Hay columna y tipo, pero no hay flujo robusto de marcacion leido/no leido en UI.
6. Falta consolidacion de reglas de "bando" para TEAM_PLAYER:
   - La logica asimetrica vive principalmente en pantalla y podria extraerse a util compartida para menor riesgo de regresiones.
