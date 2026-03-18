# 00 - Architecture Overview (Estado Real de Código)

## Resumen

MatchFinder es una app mobile/web construida con Expo + React Native + TypeScript estricto, usando Supabase como backend (Auth, PostgREST, Realtime y RPC).

La arquitectura actual sigue una separación clara por capas:

- Capa de rutas/pantallas en `app/` con Expo Router.
- Capa de UI reutilizable en `components/`.
- Capa de lógica de dominio en `services/`.
- Capa de estado transversal en `context/`.
- Capa de tipado de dominio en `types/` (incluye tipado generado de Supabase).

Patrones globales detectados en producción:

- Guard de sesión global en `app/_layout.tsx`.
- Gestión de loading transversal por context (`GlobalLoadingContext`).
- Sistema de notificaciones toast por context (`ToastContext`).
- Cliente Supabase tipado y multi-plataforma (`lib/supabase.ts`).
- Enrutado por archivos con grupos `(tabs)` y rutas dinámicas (`app/match/[id].tsx`, `app/chat/[id].tsx`).

## Flujo de Usuario (UX)

1. La app inicia en `app/_layout.tsx` y espera dos condiciones: sesión de Supabase + fuentes cargadas.
2. Si no hay sesión y la ruta no es de auth (`/login`, `/onboarding`, `/forgot-password`), redirige a login.
3. Si hay sesión, habilita navegación principal con tabs:
   - Inicio
   - Rivales
   - Partidos
   - Mercado
   - Perfil
4. Durante operaciones largas, se muestra loader global (`SoccerLoader`) sin que cada pantalla implemente su propio spinner.
5. Mensajes de éxito/error/info se renderizan como toast global sobre cualquier pantalla.

## Arquitectura Frontend

### 1) Stack tecnológico (confirmado por `package.json`)

- Runtime/UI:
  - `expo` ~54
  - `react` 19.1
  - `react-native` 0.81
  - `expo-router` 6
- Navegación:
  - `expo-router`
  - `@react-navigation/native`
  - `@react-navigation/bottom-tabs`
- Backend SDK:
  - `@supabase/supabase-js` v2
- Estilos:
  - `nativewind`
  - `tailwindcss`
  - `global.css`
- Animaciones/media:
  - `lottie-react-native`
  - `@lottiefiles/dotlottie-react`
  - `expo-image`
- Validación/typed safety:
  - `typescript` strict
  - `zod`
- Utilidades:
  - `date-fns`, `clsx`, `tailwind-merge`

### 2) Enrutamiento y composición global

- `app/_layout.tsx`
  - Inicializa sesión (`supabase.auth.getSession`).
  - Escucha cambios de auth (`onAuthStateChange`).
  - Aplica guard de rutas privadas con `useSegments` + `router.replace('/login')`.
  - Inyecta `ThemeProvider`, `GlobalLoadingProvider`, `ToastProvider`.
  - Define stack base sin header.
- `app/(tabs)/_layout.tsx`
  - Define barra inferior y estética del shell autenticado.
  - Tabs reales: `index`, `rivals`, `match`, `market`, `profile`.

### 3) Estado global transversal

- `context/GlobalLoadingContext.tsx`
  - API: `showLoading`, `hideLoading`, `withGlobalLoading`.
  - Soporta múltiples loaders simultáneos por `key`.
  - Distingue loaders `blocking` y mensajes contextuales.
- `context/ToastContext.tsx`
  - API: `showToast(message, type)`.
  - Tipos: `success`, `error`, `info`.

### 4) Capa de servicios

La lógica de negocio y acceso a Supabase está centralizada por dominio:

- `auth.service.ts`
- `teams.service.ts`
- `challenges.service.ts`
- `matches.service.ts`
- `chat.service.ts`
- `dm.service.ts`
- `team-chat.service.ts`
- `market.service.ts`
- `stats.service.ts`
- `notifications.service.ts`
- `storage.service.ts`

Patrón observado:

- Servicios retornan objetos `ServiceResponse` consistentes.
- Mapeo de filas Supabase (`Tables<'...'>`) a modelos de app.
- Validación de inputs sensibles con Zod (ej. auth/profile/team creation).

### 5) Estructura de carpetas (ingeniería inversa)

- `app/`: rutas/pantallas por feature.
- `components/`: componentes UI y feature components desacoplados.
  - `components/match/*` contiene sub-vistas y modales del flujo de partido.
- `services/`: capa de infraestructura para Supabase.
- `hooks/`: hooks de composición y derivación de estado (especialmente para match flow).
- `context/`: providers globales.
- `lib/`: configuración base (`config.ts`, `supabase.ts`, constantes).
- `types/`: contratos de dominio + tipado de Supabase.
- `supabase/`: snapshot de esquema, políticas y funciones SQL.
- `assets/`: imágenes y animaciones Lottie.

### 6) Tipado y calidad

- `tsconfig.json` con `"strict": true`.
- Alias `@/*` para imports absolutos.
- ESLint de Expo activo (`eslint-config-expo`).
- Formateo vía Prettier.

### 7) Styling y tema

- `tailwind.config.js` define paleta dark deportiva y tokens semánticos (`background`, `card`, `primary`, `border`, etc.).
- `app/_layout.tsx` sobreescribe `DarkTheme` de navegación para evitar flashes de fondo blanco.
- Fuentes cargadas globalmente: Inter 400/500/700.

## Arquitectura Backend (Supabase)

### 1) Inicialización cliente

- `lib/supabase.ts` crea cliente tipado `createClient<Database>(...)`.
- Persistencia de sesión:
  - Native: `AsyncStorage`.
  - Web: storage por defecto del navegador.
- Auto refresh token gestionado por estado de app (`AppState`) en native.

### 2) Contrato tipado DB

- `types/supabase.ts` contiene:
  - `Database` (schemas, tablas, relaciones, enums).
  - Helpers genéricos: `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`.

### 3) Dominio backend cubierto por servicios

- Identidad/perfil: `profiles`, `auth.users`.
- Equipos y membresías: `teams`, `team_members` + RPC `transfer_team_captain`.
- Desafíos/partidos: `challenges`, `matches`, `match_results`, `match_messages`.
- Mercado: `market_posts`.
- Chat: `conversations`, `direct_messages`.
- Notificaciones: `notifications`.
- Estadísticas: `player_stats`.

## Deuda Técnica / Next Steps

1. Resolver drift documental/esquema detectado en chat:
   - `types/supabase.ts` y `database.sql` modelan `conversations` con `chat_type/team_id/player_id`.
   - `supabase/policies.json` incluye políticas que referencian `participant_a/participant_b`.
   - Esto indica políticas desactualizadas o mezcla de snapshots de distintas migraciones.
2. Versionar documentación de arquitectura junto a migraciones para evitar divergencia entre código TS y snapshot SQL.
3. Añadir ADRs breves por módulo crítico (`match`, `chat`, `teams`) para dejar decisiones arquitectónicas explícitas.
4. Incorporar un script de verificación CI que compare columnas reales de Supabase vs `types/supabase.ts` y detecte drift tempranamente.
