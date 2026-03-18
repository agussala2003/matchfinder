# Changelog

## v1.0.0 (MVP Release) - 2026-03-18

### Nuevas Funcionalidades (Features)

- Check-in de partidos con geolocalizacion real usando Expo Location.
- Validacion de distancia por Haversine para habilitar check-in dentro del rango permitido.
- Flujo de Walkover (W.O.) con evidencia fotografica y validaciones estrictas.
- Integracion de preview de evidencia antes de enviar W.O. con acciones de reintento y confirmacion.
- Persistencia de check-in por equipo en partido (`checkin_team_a`, `checkin_team_b`).
- Soporte completo de inbox/chat consolidado en un unico componente reutilizable.
- Navegacion desde rival aceptado hacia partido activo ("Ver Partido").
- Estadisticas reales de equipo rival en modal de detalle (partidos, victorias, derrotas).

### Mejoras de UI/UX

- Refactor del inbox para arquitectura DRY: pantalla wrapper + componente central.
- Indicadores visuales de mensajes no leidos en inbox (badge con contador y preview destacado).
- Marcado automatico de mensajes como leidos al abrir conversacion.
- Marcado de mensajes entrantes como leidos cuando el chat esta abierto.
- Mejora UX del owner en Mercado:
  - Confirmacion nativa antes de eliminar publicacion.
  - Accion visible de "Eliminar publicacion" para evitar callejon sin salida.
- Flujo de W.O. mejorado para evitar envios accidentales de evidencia.

### Seguridad y Performance

- Configuracion de bucket de Storage para evidencia de W.O. con politicas RLS.
- Reforzado de reglas de negocio para W.O.: solo reclama quien hizo check-in y si rival no hizo check-in.
- Eliminacion de drift de `conversations` entre esquema, tipos y politicas JSON.
- Paginacion real en Mercado con `range(from, to)` en consultas Supabase.
- Infinite scrolling en Mercado con carga incremental de paginas.
- Pull-to-refresh en Mercado con reseteo de pagina para recarga consistente.
- Consolidacion de estados de carga para mejorar respuesta percibida en listas y modales.

### Correccion de Errores (Bugfixes)

- Corregido bug critico de W.O. que subia evidencia automaticamente sin confirmacion del usuario.
- Corregida duplicidad funcional de inbox en dos implementaciones separadas.
- Corregido boton "Ver Partido" sin accion en modal de rival aceptado.
- Corregido estado de estadisticas hardcodeadas en cero en TeamDetailModal.
- Corregido flujo de no leidos en inbox para reflejar mensajes entrantes reales.
- Corregidas inconsistencias de navegacion y cierre de modales en acciones de partido.

### Notas de Version

- Esta release marca el estado Feature-Complete del MVP para el Core Loop principal.
- Se recomienda ejecutar una pasada final de QA manual en dispositivos fisicos antes de distribucion.
