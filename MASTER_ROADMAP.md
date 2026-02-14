# 🗺️ MATCHFINDER - MASTER ROADMAP (MUST-DO HASTA LANZAMIENTO)

**Fecha de inicio**: 13 Febrero 2026  
**Objetivo**: App lista para lanzamiento público en tiendas  
**Estado actual**: MVP funcional con gaps críticos de seguridad y funcionalidades core faltantes

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual del Proyecto
- ✅ **Completado (60%)**: Auth, Teams, Market, Chat básico, UI/UX
- ⚠️ **Parcial (25%)**: Notificaciones, W.O., Check-in (mock), Match results
- ❌ **Faltante (15%)**: GPS real, Sistema ELO, Anti-farming, Validación W.O., Push notifications

### Prioridades Críticas
1. 🔴 **SEGURIDAD** - Políticas RLS faltantes, validaciones server-side
2. 🟠 **FUNCIONALIDAD CORE** - GPS real, ELO, Anti-farming (bloqueantes para producción)
3. 🟡 **BUGS CRÍTICOS** - Memory leaks, race conditions
4. 🟢 **MEJORAS UX** - TanStack Query, Refactoring, Push notifications

---

## 🚨 FASE 0: HOTFIX CRÍTICO (Semana 1) - **DEBE HACERSE YA**

> **Objetivo**: Estabilizar la app actual y cerrar brechas de seguridad antes de continuar desarrollo

### 🔴 P0 - Seguridad (3 días)

#### Task 0.1: Políticas RLS Faltantes
**Archivos**: `supabase/policies.json` → Aplicar en Supabase Dashboard  
**Tiempo estimado**: 4 horas

**Tareas**:
- [ ] Crear política `match_results_insert_policy`
  ```sql
  -- Solo capitanes pueden insertar resultados de SUS partidos
  CREATE POLICY "Captains can insert match results"
  ON match_results FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT tm.user_id FROM team_members tm
      JOIN matches m ON (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id)
      WHERE m.id = match_results.match_id
      AND tm.role IN ('ADMIN', 'SUB_ADMIN')
      AND tm.status = 'ACTIVE'
    )
  );
  ```

- [ ] Crear política `wo_claim_validation_policy`
  ```sql
  -- Solo el equipo correspondiente puede reclamar W.O.
  CREATE POLICY "WO claims must match team"
  ON matches FOR UPDATE
  USING (
    CASE 
      WHEN status = 'WO_A' THEN auth.uid() IN (
        SELECT user_id FROM team_members 
        WHERE team_id = matches.team_a_id 
        AND role IN ('ADMIN', 'SUB_ADMIN')
        AND status = 'ACTIVE'
      )
      WHEN status = 'WO_B' THEN auth.uid() IN (
        SELECT user_id FROM team_members 
        WHERE team_id = matches.team_b_id 
        AND role IN ('ADMIN', 'SUB_ADMIN')
        AND status = 'ACTIVE'
      )
      ELSE true
    END
  );
  ```

- [ ] Agregar CHECK constraints en `match_results`
  ```sql
  ALTER TABLE match_results 
  ADD CONSTRAINT valid_goals_range CHECK (goals_a >= 0 AND goals_a <= 50),
  ADD CONSTRAINT valid_goals_b_range CHECK (goals_b >= 0 AND goals_b <= 50);
  ```

- [ ] Agregar CHECK constraints en `player_stats`
  ```sql
  ALTER TABLE player_stats
  ADD CONSTRAINT valid_player_goals CHECK (goals >= 0 AND goals <= 30);
  ```

**Verificación**:
```typescript
// Test: Intento de insertar resultado con 999 goles debe fallar
await supabase.from('match_results').insert({
  match_id: testMatchId,
  goals_a: 999,
  goals_b: 0
}) // ❌ Debe rechazar
```

---

#### Task 0.2: Proteger Campos Sensibles en Services
**Archivos**: `services/teams.service.ts`, `services/matches.service.ts`  
**Tiempo estimado**: 2 horas

**Cambios**:

**`services/teams.service.ts`** línea 108-118:
```typescript
// ANTES
async updateTeam(teamId: string, updates: Partial<Team>): Promise<ServiceResponse> {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)  // ❌ Permite editar elo_rating
    .eq('id', teamId)
}

// DESPUÉS
async updateTeam(
  teamId: string, 
  updates: Omit<Partial<Team>, 'elo_rating' | 'id' | 'captain_id' | 'created_at'>
): Promise<ServiceResponse> {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)  // ✅ Solo campos seguros
    .eq('id', teamId)
}
```

**`services/stats.service.ts`** línea 20-26:
```typescript
// DESPUÉS
const payload = stats.map(s => ({
  match_id: matchId,
  user_id: s.userId,
  team_id: s.teamId,
  goals: Math.max(0, Math.min(s.goals, 30)),  // ✅ Clamp 0-30
  is_mvp: s.isMvp
}))
```

**Verificación**:
```typescript
// Test: Intento de editar ELO debe ser ignorado
await teamsService.updateTeam(teamId, { 
  name: 'New Name', 
  elo_rating: 9999  // ❌ TypeScript error
})
```

---

### 🔴 P0 - Memory Leaks (2 días)

#### Task 0.3: Fix Realtime Cleanup en ChatInbox
**Archivo**: `components/chat/ChatInbox.tsx` líneas 30-66  
**Tiempo estimado**: 1 hora

**ANTES**:
```typescript
// líneas 38-66
async function setupRealtime() {
  const channel = supabase
    .channel('public:direct_messages')
    .on(...)
    .subscribe()
  return channel  // ❌ Retorna Promise<Channel>
}

useFocusEffect(
  useCallback(() => {
    loadConversations()
    const subscription = setupRealtime()
    return () => {
      subscription.then((sub) => sub?.unsubscribe())  // ⚠️ Async cleanup
    }
  }, [])
)
```

**DESPUÉS**:
```typescript
import { useRef } from 'react'

export function ChatInbox() {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useFocusEffect(
    useCallback(() => {
      loadConversations()
      
      // Crear y guardar referencia síncrona
      channelRef.current = supabase
        .channel(`inbox-${user.id}`)  // ✅ Incluir user_id
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        }, (payload) => {
          loadConversations()  // Re-fetch inbox
        })
        .subscribe()

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)  // ✅ Limpieza correcta
          channelRef.current = null
        }
      }
    }, [user.id])
  )
}
```

**Verificación**:
1. Abrir pantalla Chat Inbox
2. Navegar a otra pantalla
3. Verificar en Supabase Dashboard > Realtime que el canal se desconecta
4. Repetir 10 veces → No debe haber acumulación de canales

---

#### Task 0.4: Fix Realtime Cleanup en DM Chat
**Archivo**: `app/chat/[id].tsx` líneas 38-44  
**Tiempo estimado**: 30 minutos

**ANTES**:
```typescript
// línea 38-44
useEffect(() => {
  loadChat()
  setupRealtime()  // ❌ No guarda referencia
  return () => {
    supabase.removeChannel(supabase.channel(`dm-${conversationId}`))
    // ❌ Crea NUEVO channel para eliminarlo
  }
}, [conversationId])
```

**DESPUÉS**:
```typescript
import { useRef } from 'react'

export default function ChatDetailScreen() {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    loadChat()
    
    channelRef.current = supabase
      .channel(`dm-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as DirectMessage])
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)  // ✅ Referencia correcta
        channelRef.current = null
      }
    }
  }, [conversationId])
}
```

---

#### Task 0.5: Agregar Filtro en Suscripción de ChatInbox
**Archivo**: `components/chat/ChatInbox.tsx` línea 47-64  
**Tiempo estimado**: 1 hora

**Problema**: Escucha TODOS los mensajes de la app, no solo los del usuario

**DESPUÉS**:
```typescript
useFocusEffect(
  useCallback(() => {
    async function setupFilteredRealtime() {
      // Obtener IDs de conversaciones del usuario
      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      
      const conversationIds = convos?.map(c => c.id) || []
      
      if (conversationIds.length === 0) return null

      // Suscribirse solo a mensajes de esas conversaciones
      const channel = supabase
        .channel(`inbox-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=in.(${conversationIds.join(',')})`,  // ✅ Filtro
        }, (payload) => {
          loadConversations()
        })
        .subscribe()
      
      return channel
    }

    loadConversations()
    let channel: RealtimeChannel | null = null
    
    setupFilteredRealtime().then((ch) => { 
      channelRef.current = ch 
    })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user.id])
)
```

---

### 🟠 P1 - Bugs de Funcionalidad (2 días)

#### Task 0.6: Prevenir Race Condition en Accept Proposal
**Archivo**: `hooks/useMatchDetails.ts` líneas 184-214  
**Tiempo estimado**: 2 horas

**ANTES**:
```typescript
async function acceptProposal(msg: ChatMessage) {
  const result = await chatService.respondProposal(msg.id, 'ACCEPTED')
  // ❌ Dos capitanes pueden aceptar simultáneamente
  if (result.success) {
    await matchesService.updateMatch(match.id, { status: 'CONFIRMED' })
  }
}
```

**DESPUÉS** - Opción 1: Optimistic Locking con versión
```typescript
// Agregar columna `version` a tabla `matches`
// ALTER TABLE matches ADD COLUMN version INTEGER DEFAULT 1;

async function acceptProposal(msg: ChatMessage) {
  const currentVersion = match!.version || 1
  
  const result = await chatService.respondProposal(msg.id, 'ACCEPTED')
  if (!result.success) return
  
  const { data, error } = await supabase
    .from('matches')
    .update({ 
      status: 'CONFIRMED',
      version: currentVersion + 1 
    })
    .eq('id', match.id)
    .eq('version', currentVersion)  // ✅ Solo actualiza si version no cambió
  
  if (error || !data || data.length === 0) {
    showToast('Otro capitán ya confirmó esta propuesta', 'error')
    await initializeMatch()  // Re-fetch datos actualizados
    return
  }
  
  showToast('Partido confirmado', 'success')
}
```

**DESPUÉS** - Opción 2: Database Function (más robusto)
```sql
-- Supabase Edge Function: accept_proposal_atomic
CREATE OR REPLACE FUNCTION accept_proposal_atomic(
  p_message_id UUID,
  p_match_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_venue_id UUID
) RETURNS JSON AS $$
DECLARE
  current_status TEXT;
  result JSON;
BEGIN
  -- Lock row para evitar concurrencia
  SELECT status INTO current_status 
  FROM matches 
  WHERE id = p_match_id 
  FOR UPDATE;
  
  -- Verificar que aún está en PENDING
  IF current_status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'error', 'Match already confirmed');
  END IF;
  
  -- Actualizar mensaje
  UPDATE match_messages 
  SET status = 'ACCEPTED' 
  WHERE id = p_message_id;
  
  -- Actualizar match
  UPDATE matches 
  SET 
    status = 'CONFIRMED',
    scheduled_at = p_scheduled_at,
    venue_id = p_venue_id
  WHERE id = p_match_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

**TypeScript**:
```typescript
async function acceptProposal(msg: ChatMessage) {
  const { data, error } = await supabase.rpc('accept_proposal_atomic', {
    p_message_id: msg.id,
    p_match_id: match.id,
    p_scheduled_at: isoString,
    p_venue_id: venueId
  })
  
  if (error || !data.success) {
    showToast(data?.error || 'Error al confirmar', 'error')
    return
  }
  
  showToast('Partido confirmado', 'success')
  await initializeMatch()
}
```

**Elegir**: Opción 2 (Database Function) es más robusto para producción.

---

#### Task 0.7: Validación de Fecha en Propuestas
**Archivo**: `hooks/useMatchDetails.ts` líneas 141-182  
**Tiempo estimado**: 1 hora

**DESPUÉS**:
```typescript
async function sendProposal(propDate: Date, propTime: Date, ...) {
  // ✅ Validaciones
  const now = new Date()
  const proposedDateTime = new Date(propDate)
  proposedDateTime.setHours(propTime.getHours(), propTime.getMinutes(), 0, 0)
  
  // 1. No permitir fechas en el pasado
  if (proposedDateTime <= now) {
    showToast('La fecha debe ser futura', 'error')
    return
  }
  
  // 2. No permitir fechas con más de 3 meses adelante
  const threeMonthsLater = new Date(now)
  threeMonthsLater.setMonth(now.getMonth() + 3)
  if (proposedDateTime > threeMonthsLater) {
    showToast('La fecha no puede ser mayor a 3 meses', 'error')
    return
  }
  
  // 3. Validar horario razonable (8:00 - 23:00)
  const hour = propTime.getHours()
  if (hour < 8 || hour > 23) {
    showToast('El horario debe estar entre 8:00 y 23:00', 'error')
    return
  }
  
  // ... resto del código
}
```

---

#### Task 0.8: Validación de Loading State en Chat
**Archivo**: `app/chat/[id].tsx` líneas 47-52  
**Tiempo estimado**: 30 minutos

**ANTES**:
```typescript
async function loadChat() {
  const uid = user?.id
  if (!uid) return  // ❌ Deja loading=true para siempre
  // ...
}
```

**DESPUÉS**:
```typescript
async function loadChat() {
  const uid = user?.id
  if (!uid) {
    showToast('Sesión expirada', 'error')
    setLoading(false)  // ✅ Liberar loading
    router.replace('/login')
    return
  }
  // ...
}
```

---

### 📊 Métricas de Éxito - Fase 0

**Seguridad**:
- [ ] Todas las tablas tienen políticas RLS para INSERT/UPDATE/DELETE
- [ ] Test suite de seguridad pasa (intentar exploits fallidos)
- [ ] No hay campos sensibles editables desde services

**Estabilidad**:
- [ ] Navegar 20 veces entre chats → Canales Realtime = 1 (no leak)
- [ ] Dos usuarios aceptan propuesta simultánea → Solo uno gana
- [ ] Fechas pasadas rechazadas en propuestas

**Tiempo total Fase 0**: 5 días hábiles

---

## 🏗️ FASE 1: FUNCIONALIDADES CORE (Semanas 2-3)

> **Objetivo**: Implementar las 3 funcionalidades críticas para producción

### 🟠 Prioridad 1: GPS Check-in Real (5 días)

#### Task 1.1: Setup de Geolocalización
**Archivos nuevos**: `hooks/useLocation.ts`, `lib/geoUtils.ts`  
**Tiempo estimado**: 3 horas

**Instalación**:
```bash
npx expo install expo-location
```

**`hooks/useLocation.ts`**:
```typescript
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')

  useEffect(() => {
    (async () => {
      // Solicitar permisos
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Permisos de ubicación denegados')
        setPermissionStatus('denied')
        return
      }
      setPermissionStatus('granted')

      // Obtener ubicación actual
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        })
        setLocation(currentLocation)
      } catch (err) {
        setError('Error al obtener ubicación')
      }
    })()
  }, [])

  return { location, error, permissionStatus }
}
```

**`lib/geoUtils.ts`**:
```typescript
import * as Location from 'expo-location'

/**
 * Calcula distancia en metros entre dos coordenadas usando Haversine
 */
export function calculateDistance(
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
): number {
  const R = 6371e3 // Radio de la Tierra en metros
  const φ1 = (coords1.latitude * Math.PI) / 180
  const φ2 = (coords2.latitude * Math.PI) / 180
  const Δφ = ((coords2.latitude - coords1.latitude) * Math.PI) / 180
  const Δλ = ((coords2.longitude - coords1.longitude) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c) // Retorna metros
}

/**
 * Valida si el usuario está dentro del rango permitido
 */
export function isWithinRange(
  userCoords: { latitude: number; longitude: number },
  venueCoords: { latitude: number; longitude: number },
  maxDistanceMeters: number = 100
): boolean {
  const distance = calculateDistance(userCoords, venueCoords)
  return distance <= maxDistanceMeters
}
```

---

#### Task 1.2: Refactor CheckinSection con GPS Real
**Archivo**: `components/match/CheckinSection.tsx` (reescribir completo)  
**Tiempo estimado**: 4 horas

**DESPUÉS**:
```typescript
import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import * as Location from 'expo-location'
import { MapPin, CheckCircle, AlertCircle } from 'lucide-react-native'
import { calculateDistance, isWithinRange } from '@/lib/geoUtils'

interface CheckinSectionProps {
  venueLocation: { latitude: number; longitude: number; name: string }
  onCheckinSuccess: () => void
  checkedIn: boolean
  disabled?: boolean
}

export function CheckinSection({ 
  venueLocation, 
  onCheckinSuccess, 
  checkedIn,
  disabled = false 
}: CheckinSectionProps) {
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  async function checkLocation() {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Verificar permisos
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setPermissionDenied(true)
        setError('Debes habilitar permisos de ubicación para hacer check-in')
        setLoading(false)
        return
      }

      // 2. Obtener ubicación actual con alta precisión
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      // 3. Calcular distancia
      const distance = calculateDistance(
        {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        venueLocation
      )
      
      setGpsDistance(distance)

      // 4. Validar si está dentro del rango (100 metros)
      if (distance > 100) {
        setError(`Estás a ${distance}m de la cancha. Debes estar a menos de 100m`)
        setLoading(false)
        return
      }

      // 5. Check-in exitoso
      onCheckinSuccess()
      
    } catch (err) {
      setError('Error al obtener tu ubicación. Intenta nuevamente')
      console.error('GPS Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Status visual
  let statusColor = 'text-gray-500'
  let statusText = 'Ubicación no verificada'
  let statusIcon = <MapPin size={20} color="#9CA3AF" />

  if (gpsDistance !== null) {
    if (gpsDistance <= 100) {
      statusColor = 'text-green-600'
      statusText = `Estás en la cancha (${gpsDistance}m)`
      statusIcon = <CheckCircle size={20} color="#10B981" />
    } else {
      statusColor = 'text-orange-600'
      statusText = `Lejos de la cancha (${gpsDistance}m)`
      statusIcon = <AlertCircle size={20} color="#F59E0B" />
    }
  }

  if (checkedIn) {
    statusColor = 'text-green-600'
    statusText = '✓ Check-in confirmado'
    statusIcon = <CheckCircle size={20} color="#10B981" />
  }

  return (
    <View className="bg-white rounded-xl p-5 mb-4 border border-gray-200">
      <View className="flex-row items-center gap-2 mb-3">
        <MapPin size={24} color="#6B7280" />
        <Text className="text-lg font-semibold text-gray-800">
          Check-in en {venueLocation.name}
        </Text>
      </View>

      {/* Status actual */}
      <View className="flex-row items-center gap-2 mb-4">
        {statusIcon}
        <Text className={`${statusColor} font-medium`}>{statusText}</Text>
      </View>

      {/* Error message */}
      {error && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <Text className="text-red-600 text-sm">{error}</Text>
          {permissionDenied && (
            <TouchableOpacity 
              onPress={() => Location.openSettings()}
              className="mt-2"
            >
              <Text className="text-red-600 font-semibold text-sm underline">
                Abrir Configuración
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Botón de Check-in */}
      <TouchableOpacity
        onPress={checkLocation}
        disabled={loading || checkedIn || disabled}
        className={`py-3 px-4 rounded-lg flex-row items-center justify-center gap-2 ${
          checkedIn 
            ? 'bg-green-100' 
            : disabled
            ? 'bg-gray-100'
            : 'bg-blue-600'
        }`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            {checkedIn ? (
              <CheckCircle size={20} color="#10B981" />
            ) : (
              <MapPin size={20} color="white" />
            )}
            <Text className={`font-semibold ${
              checkedIn ? 'text-green-700' : 'text-white'
            }`}>
              {loading 
                ? 'Verificando ubicación...' 
                : checkedIn 
                ? 'Check-in realizado' 
                : 'Hacer Check-in'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info */}
      <Text className="text-xs text-gray-500 text-center mt-3">
        Debes estar a menos de 100 metros de la cancha para confirmar tu asistencia
      </Text>
    </View>
  )
}
```

---

#### Task 1.3: Integrar CheckinSection en MatchScreen
**Archivo**: `app/match/[id].tsx` líneas 200-250 (aprox)  
**Tiempo estimado**: 2 horas

**ANTES** (líneas 89-97):
```typescript
const [gpsDistance, setGpsDistance] = useState(150)  // ❌ Hardcoded
const [checkedIn, setCheckedIn] = useState(false)
```

**DESPUÉS**:
```typescript
// Remover estados mock
// const [gpsDistance, setGpsDistance] = useState(150)  ❌ ELIMINAR
const [checkedIn, setCheckedIn] = useState(false)

// Obtener coordenadas de la venue del match
const venueLocation = {
  latitude: match?.venue?.latitude || 0,
  longitude: match?.venue?.longitude || 0,
  name: match?.venue?.name || 'Cancha'
}

// Handler de check-in exitoso
async function handleCheckinSuccess() {
  setCheckedIn(true)
  showToast('Check-in exitoso', 'success')
  
  // Actualizar estado en backend (opcional: guardar timestamp)
  // await matchesService.recordCheckin(matchId, user.id)
}
```

**En el render** (línea ~280):
```typescript
{phase === 'checkin' && (
  <CheckinSection
    venueLocation={venueLocation}
    onCheckinSuccess={handleCheckinSuccess}
    checkedIn={checkedIn}
    disabled={false}
  />
)}
```

---

#### Task 1.4: Agregar Columna `checked_in_users` (Opcional pero Recomendado)
**Archivo**: Nueva migración SQL en Supabase  
**Tiempo estimado**: 1 hora

**Migración**:
```sql
-- Tabla para registrar check-ins
CREATE TABLE IF NOT EXISTS match_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  gps_latitude DOUBLE PRECISION NOT NULL,
  gps_longitude DOUBLE PRECISION NOT NULL,
  distance_meters INTEGER NOT NULL,
  UNIQUE(match_id, user_id)
);

-- Índices
CREATE INDEX idx_match_checkins_match ON match_checkins(match_id);
CREATE INDEX idx_match_checkins_user ON match_checkins(user_id);

-- RLS
ALTER TABLE match_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkins for their matches"
ON match_checkins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches m
    JOIN team_members tm ON (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id)
    WHERE m.id = match_checkins.match_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own checkin"
ON match_checkins FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Servicio `services/matches.service.ts`**:
```typescript
async recordCheckin(
  matchId: string,
  userId: string,
  teamId: string,
  gpsCoords: { latitude: number; longitude: number },
  distance: number
): Promise<ServiceResponse> {
  const { error } = await supabase
    .from('match_checkins')
    .insert({
      match_id: matchId,
      user_id: userId,
      team_id: teamId,
      gps_latitude: gpsCoords.latitude,
      gps_longitude: gpsCoords.longitude,
      distance_meters: distance,
    })

  if (error) {
    return { success: false, message: 'Error al registrar check-in' }
  }

  return { success: true, message: 'Check-in registrado' }
}
```

---

#### Task 1.5: Testing de GPS Check-in
**Tiempo estimado**: 2 horas

**Casos de prueba**:
1. **Happy path**: Usuario a 50m de cancha → Check-in exitoso
2. **Lejos**: Usuario a 200m → Rechazado con mensaje
3. **Sin permisos**: Usuario niega GPS → Botón de "Abrir Configuración"
4. **GPS desactivado**: Detectar y mostrar mensaje
5. **Modo Avión**: Timeout y error graceful

**Herramientas**:
- Expo Go: Simular ubicación en Xcode/Android Studio
- Dispositivo físico: Ir realmente a una cancha de prueba

---

### 🟠 Prioridad 2: Sistema ELO (4 días)

#### Task 1.6: Crear Edge Function para Cálculo ELO
**Archivo nuevo**: `supabase/functions/calculate-elo/index.ts`  
**Tiempo estimado**: 4 horas

**Algoritmo ELO Estándar**:
```
Expected_A = 1 / (1 + 10^((Rating_B - Rating_A) / 400))
New_Rating_A = Rating_A + K * (Score_A - Expected_A)

Donde:
- K = 32 (factor de cambio)
- Score_A = 1 (victoria), 0.5 (empate), 0 (derrota)
```

**`supabase/functions/calculate-elo/index.ts`**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const K_FACTOR = 32

interface EloCalculationRequest {
  matchId: string
  teamAId: string
  teamBId: string
  goalsA: number
  goalsB: number
}

serve(async (req) => {
  try {
    const { matchId, teamAId, teamBId, goalsA, goalsB }: EloCalculationRequest = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Obtener ratings actuales
    const { data: teams, error: fetchError } = await supabase
      .from('teams')
      .select('id, elo_rating')
      .in('id', [teamAId, teamBId])

    if (fetchError || !teams || teams.length !== 2) {
      return new Response(JSON.stringify({ error: 'Teams not found' }), { status: 404 })
    }

    const teamA = teams.find(t => t.id === teamAId)!
    const teamB = teams.find(t => t.id === teamBId)!

    const ratingA = teamA.elo_rating || 1200
    const ratingB = teamB.elo_rating || 1200

    // 2. Calcular resultado (1 = victoria, 0.5 = empate, 0 = derrota)
    let scoreA: number, scoreB: number
    if (goalsA > goalsB) {
      scoreA = 1
      scoreB = 0
    } else if (goalsA < goalsB) {
      scoreA = 0
      scoreB = 1
    } else {
      scoreA = 0.5
      scoreB = 0.5
    }

    // 3. Calcular Expected Score (probabilidad de victoria)
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400))

    // 4. Calcular nuevos ratings
    const newRatingA = Math.round(ratingA + K_FACTOR * (scoreA - expectedA))
    const newRatingB = Math.round(ratingB + K_FACTOR * (scoreB - expectedB))

    // 5. Actualizar en base de datos
    const { error: updateError } = await supabase
      .from('teams')
      .upsert([
        { id: teamAId, elo_rating: newRatingA },
        { id: teamBId, elo_rating: newRatingB }
      ])

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update ratings' }), { status: 500 })
    }

    // 6. Registrar histórico (opcional)
    await supabase.from('elo_history').insert({
      match_id: matchId,
      team_a_id: teamAId,
      team_b_id: teamBId,
      team_a_old_rating: ratingA,
      team_b_old_rating: ratingB,
      team_a_new_rating: newRatingA,
      team_b_new_rating: newRatingB,
      goals_a: goalsA,
      goals_b: goalsB
    })

    return new Response(
      JSON.stringify({
        success: true,
        teamA: { oldRating: ratingA, newRating: newRatingA, change: newRatingA - ratingA },
        teamB: { oldRating: ratingB, newRating: newRatingB, change: newRatingB - ratingB }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

---

#### Task 1.7: Crear Tabla de Histórico ELO (Opcional pero Recomendado)
**Archivo**: Nueva migración SQL  
**Tiempo estimado**: 30 minutos

```sql
CREATE TABLE IF NOT EXISTS elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_a_id UUID NOT NULL REFERENCES teams(id),
  team_b_id UUID NOT NULL REFERENCES teams(id),
  team_a_old_rating INTEGER NOT NULL,
  team_b_old_rating INTEGER NOT NULL,
  team_a_new_rating INTEGER NOT NULL,
  team_b_new_rating INTEGER NOT NULL,
  goals_a INTEGER NOT NULL,
  goals_b INTEGER NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elo_history_match ON elo_history(match_id);
CREATE INDEX idx_elo_history_teams ON elo_history(team_a_id, team_b_id);

-- RLS: Solo lectura pública
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON elo_history FOR SELECT USING (true);
```

---

#### Task 1.8: Trigger Automático al Confirmar Resultado
**Archivo**: Migración SQL  
**Tiempo estimado**: 1 hora

**Opción 1: Database Trigger (Automático)**
```sql
CREATE OR REPLACE FUNCTION trigger_elo_calculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo calcular si ambos equipos confirmaron el resultado
  IF NEW.confirmed_by_a = true AND NEW.confirmed_by_b = true THEN
    -- Llamar Edge Function vía pg_net extension
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/calculate-elo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'matchId', (SELECT id FROM matches WHERE id = NEW.match_id),
        'teamAId', (SELECT team_a_id FROM matches WHERE id = NEW.match_id),
        'teamBId', (SELECT team_b_id FROM matches WHERE id = NEW.match_id),
        'goalsA', NEW.goals_a,
        'goalsB', NEW.goals_b
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_match_result_confirmed
AFTER INSERT OR UPDATE ON match_results
FOR EACH ROW
EXECUTE FUNCTION trigger_elo_calculation();
```

**Nota**: Requiere habilitar `pg_net` extension en Supabase.

**Opción 2: Llamada desde Client (Más simple)**
```typescript
// hooks/useMatchDetails.ts - dentro de submitResult()

async function submitResult() {
  // ... código existente de guardar resultado ...
  
  if (resultPayload.confirmed_by_a && resultPayload.confirmed_by_b) {
    // Ambos equipos confirmaron → Calcular ELO
    const { data, error } = await supabase.functions.invoke('calculate-elo', {
      body: {
        matchId: match.id,
        teamAId: match.team_a.id,
        teamBId: match.team_b.id,
        goalsA: homeScore,
        goalsB: awayScore
      }
    })

    if (error) {
      console.error('Error calculando ELO:', error)
      showToast('Resultado guardado, pero ELO no se actualizó', 'warning')
    } else {
      showToast(
        `Resultado confirmado. ${data.teamA.change > 0 ? '+' : ''}${data.teamA.change} ELO`, 
        'success'
      )
    }
  }
}
```

**Elegir**: Opción 2 (Client-side) es más simple y fácil de debuggear para MVP.

---

#### Task 1.9: Mostrar Cambio de ELO en UI
**Archivo**: `app/match/[id].tsx` (PostmatchSection)  
**Tiempo estimado**: 2 horas

**Componente nuevo**: `components/match/EloChangeDisplay.tsx`
```typescript
import React from 'react'
import { View, Text } from 'react-native'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native'

interface EloChangeDisplayProps {
  oldRating: number
  newRating: number
  teamName: string
}

export function EloChangeDisplay({ oldRating, newRating, teamName }: EloChangeDisplayProps) {
  const change = newRating - oldRating
  const isPositive = change > 0
  const isNeutral = change === 0

  let icon, colorClass, sign
  if (isPositive) {
    icon = <TrendingUp size={20} color="#10B981" />
    colorClass = 'text-green-600'
    sign = '+'
  } else if (isNeutral) {
    icon = <Minus size={20} color="#6B7280" />
    colorClass = 'text-gray-600'
    sign = ''
  } else {
    icon = <TrendingDown size={20} color="#EF4444" />
    colorClass = 'text-red-600'
    sign = ''
  }

  return (
    <View className="bg-gray-50 rounded-lg p-3 flex-row items-center justify-between">
      <View>
        <Text className="text-sm text-gray-600">{teamName}</Text>
        <Text className="text-xs text-gray-500">
          {oldRating} → {newRating}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        {icon}
        <Text className={`font-bold text-lg ${colorClass}`}>
          {sign}{change}
        </Text>
      </View>
    </View>
  )
}
```

**En `app/match/[id].tsx`** después de confirmar resultado:
```typescript
{match.status === 'FINISHED' && eloChanges && (
  <View className="bg-white rounded-xl p-4 mb-4">
    <Text className="font-semibold text-lg mb-3">Cambio de Rating ELO</Text>
    <EloChangeDisplay
      teamName={match.team_a.name}
      oldRating={eloChanges.teamA.oldRating}
      newRating={eloChanges.teamA.newRating}
    />
    <View className="h-2" />
    <EloChangeDisplay
      teamName={match.team_b.name}
      oldRating={eloChanges.teamB.oldRating}
      newRating={eloChanges.teamB.newRating}
    />
  </View>
)}
```

---

#### Task 1.10: Testing del Sistema ELO
**Tiempo estimado**: 2 horas

**Casos de prueba**:
1. Equipo con 1200 ELO vence a otro con 1200 → Ambos cambian ~16 puntos
2. Equipo con 1400 ELO vence a uno con 1200 → Cambio pequeño (~8 pts)
3. Equipo con 1200 ELO vence a uno con 1400 → Cambio grande (~24 pts)
4. Empate → Cambio simétrico según diferencia de ratings
5. Validar que `elo_history` registra cambios correctamente

---

### 🟠 Prioridad 3: Anti-Farming (2 días)

#### Task 1.11: Crear Función de Validación Anti-Farming
**Archivo**: Migración SQL  
**Tiempo estimado**: 2 horas

```sql
CREATE OR REPLACE FUNCTION check_anti_farming(
  p_team_a_id UUID,
  p_team_b_id UUID,
  p_is_friendly BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  match_count INTEGER;
  current_semester_start DATE;
  current_semester_end DATE;
BEGIN
  -- Solo aplicar a partidos ranked (no friendly)
  IF p_is_friendly = true THEN
    RETURN true;
  END IF;

  -- Calcular inicio y fin del semestre actual
  -- Semestres: Ene-Jun, Jul-Dic
  IF EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN
    current_semester_start := DATE_TRUNC('year', CURRENT_DATE);
    current_semester_end := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months' - INTERVAL '1 day';
  ELSE
    current_semester_start := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months';
    current_semester_end := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day';
  END IF;

  -- Contar partidos ranked entre estos dos equipos en el semestre
  SELECT COUNT(*) INTO match_count
  FROM matches
  WHERE is_friendly = false
  AND status IN ('FINISHED', 'WO_A', 'WO_B')  -- Solo partidos completados
  AND (
    (team_a_id = p_team_a_id AND team_b_id = p_team_b_id) OR
    (team_a_id = p_team_b_id AND team_b_id = p_team_a_id)
  )
  AND created_at >= current_semester_start
  AND created_at <= current_semester_end;

  -- Máximo 2 partidos ranked por semestre
  RETURN match_count < 2;
END;
$$ LANGUAGE plpgsql;
```

---

#### Task 1.12: Trigger para Prevenir Creación de Matches
**Archivo**: Migración SQL  
**Tiempo estimado**: 1 hora

```sql
CREATE OR REPLACE FUNCTION prevent_farming_on_match_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_anti_farming(NEW.team_a_id, NEW.team_b_id, NEW.is_friendly) THEN
    RAISE EXCEPTION 'Anti-farming: Ya jugaron 2 partidos ranked contra este rival este semestre';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_anti_farming
BEFORE INSERT ON matches
FOR EACH ROW
EXECUTE FUNCTION prevent_farming_on_match_insert();
```

---

#### Task 1.13: Validación Client-Side Previa
**Archivo**: `services/matches.service.ts`  
**Tiempo estimado**: 1 hora

```typescript
// Nuevo método en matchesService
async checkAntiFarming(
  teamAId: string, 
  teamBId: string, 
  isFriendly: boolean
): Promise<ServiceResponse<{ allowed: boolean; matchCount: number }>> {
  
  // Si es amistoso, siempre permitir
  if (isFriendly) {
    return { success: true, data: { allowed: true, matchCount: 0 } }
  }

  // Llamar función de PostgreSQL
  const { data, error } = await supabase.rpc('check_anti_farming', {
    p_team_a_id: teamAId,
    p_team_b_id: teamBId,
    p_is_friendly: isFriendly
  })

  if (error) {
    return { success: false, message: 'Error al verificar anti-farming' }
  }

  return { 
    success: true, 
    data: { allowed: data, matchCount: data ? 0 : 2 }  // Si no permitido, ya tienen 2
  }
}
```

---

#### Task 1.14: UI para Mostrar Límite
**Archivo**: `app/(tabs)/rivals.tsx` (al enviar challenge)  
**Tiempo estimado**: 1 hora

```typescript
async function sendChallenge(rivalTeamId: string) {
  setLoading(true)

  // Verificar anti-farming ANTES de crear match
  const farmingCheck = await matchesService.checkAntiFarming(
    myTeam.id,
    rivalTeamId,
    false  // Ranked match
  )

  if (!farmingCheck.success || !farmingCheck.data?.allowed) {
    showToast(
      'Ya jugaste 2 partidos ranked contra este equipo este semestre. Prueba un partido amistoso.',
      'error'
    )
    setLoading(false)
    return
  }

  // ... resto del código de enviar challenge
}
```

**Badge informativo en RivalCard**:
```typescript
// components/rivals/RivalCard.tsx
{matchesThisSemester === 2 && (
  <View className="bg-yellow-100 rounded-full px-2 py-1 ml-2">
    <Text className="text-xs text-yellow-800 font-semibold">
      Límite Ranked
    </Text>
  </View>
)}
```

---

#### Task 1.15: Testing Anti-Farming
**Tiempo estimado**: 1 hora

**Casos de prueba**:
1. Crear 2 partidos ranked entre Team A y Team B en el semestre → Aceptado
2. Intentar crear 3er partido ranked → Rechazado con mensaje
3. Crear 3er partido pero friendly → Aceptado
4. Nuevo semestre → Contador resetea a 0

---

### 📊 Métricas de Éxito - Fase 1

**GPS Check-in**:
- [ ] Usuario a <100m de cancha → Check-in exitoso
- [ ] Usuario a >100m → Rechazado con distancia exacta
- [ ] Sin permisos GPS → Mensaje claro + botón de configuración

**Sistema ELO**:
- [ ] Ambos equipos confirman resultado → ELO se actualiza
- [ ] Cambio de ELO visible en UI del match
- [ ] `elo_history` registra todos los cambios
- [ ] Ranking en dashboard refleja nuevos ratings

**Anti-Farming**:
- [ ] Tercer partido ranked vs mismo rival → Rechazado
- [ ] Partidos friendly ilimitados → Permitido
- [ ] Nuevo semestre → Límite resetea

**Tiempo total Fase 1**: 11 días hábiles (2.2 semanas)

---

## 🔄 FASE 2: REFACTORING & PERFORMANCE (Semana 4)

> **Objetivo**: Mejorar arquitectura y experiencia de usuario

### 🟡 Arquitectura

#### Task 2.1: Implementar TanStack Query
**Tiempo estimado**: 8 horas

**Instalación**:
```bash
npm install @tanstack/react-query
```

**Setup**: `app/_layout.tsx`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutos
      cacheTime: 1000 * 60 * 30,  // 30 minutos
      retry: 1,
    },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... resto del layout */}
    </QueryClientProvider>
  )
}
```

**Migrar `useMatchDetails` a React Query**:
```typescript
// hooks/useMatchDetails.ts - DESPUÉS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useMatchDetails(matchId: string) {
  const queryClient = useQueryClient()

  // Fetch match data con cache
  const { data: match, isLoading, error } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const res = await matchesService.getMatchById(matchId)
      if (!res.success || !res.data) throw new Error('Match not found')
      return res.data
    },
    staleTime: 1000 * 60 * 5,  // No re-fetch por 5 minutos
  })

  // Mutation para enviar propuesta
  const sendProposalMutation = useMutation({
    mutationFn: async (proposalData: ProposalData) => {
      return await chatService.sendProposal(matchId, proposalData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      showToast('Propuesta enviada', 'success')
    },
  })

  return {
    match,
    isLoading,
    error,
    sendProposal: sendProposalMutation.mutate,
    // ... otros métodos
  }
}
```

**Beneficios**:
- ✅ No más loading spinners en cada navegación
- ✅ Cache inteligente de matches
- ✅ Invalidación automática tras mutaciones

---

#### Task 2.2: Descomponer `app/match/[id].tsx`
**Tiempo estimado**: 6 horas

**Estructura objetivo**:
```
app/match/[id].tsx (150 líneas) → Orquestador
├── components/match/PreMatchView.tsx (100 líneas)
│   ├── ChatSection
│   ├── ProposalModal
│   └── TeamLineups
├── components/match/CheckInView.tsx (80 líneas)
│   ├── CheckinSection
│   └── OpponentCheckinStatus
└── components/match/PostMatchView.tsx (120 líneas)
    ├── ScoreEditor
    ├── PlayerStatsForm
    └── EloChangeDisplay
```

**`components/match/PreMatchView.tsx`**:
```typescript
interface PreMatchViewProps {
  match: Match
  onProposalSent: () => void
}

export function PreMatchView({ match, onProposalSent }: PreMatchViewProps) {
  const [showProposalModal, setShowProposalModal] = useState(false)

  return (
    <ScrollView>
      <ChatSection matchId={match.id} />
      <TeamLineups teamA={match.team_a} teamB={match.team_b} />
      
      <TouchableOpacity onPress={() => setShowProposalModal(true)}>
        <Text>Proponer Fecha</Text>
      </TouchableOpacity>

      <ProposalModal
        visible={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        onSubmit={(data) => {
          onProposalSent()
          setShowProposalModal(false)
        }}
      />
    </ScrollView>
  )
}
```

**`app/match/[id].tsx` - DESPUÉS**:
```typescript
export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams()
  const { match, isLoading } = useMatchDetails(id as string)

  if (isLoading) return <LoadingSpinner />
  if (!match) return <ErrorView message="Partido no encontrado" />

  const phase = getMatchPhase(match)

  return (
    <View className="flex-1">
      {phase === 'previa' && <PreMatchView match={match} />}
      {phase === 'checkin' && <CheckInView match={match} />}
      {phase === 'postmatch' && <PostMatchView match={match} />}
    </View>
  )
}
```

---

#### Task 2.3: Centralizar Constantes
**Archivo nuevo**: `lib/constants.ts`  
**Tiempo estimado**: 1 hora

```typescript
export const GAME_MODALITIES = [
  { value: 'FUTBOL_5', label: 'Fútbol 5' },
  { value: 'FUTBOL_7', label: 'Fútbol 7' },
  { value: 'FUTBOL_11', label: 'Fútbol 11' },
] as const

export const GAME_DURATIONS = [
  { value: 40, label: '40 minutos' },
  { value: 60, label: '60 minutos' },
  { value: 90, label: '90 minutos' },
] as const

export const PLAYER_POSITIONS = [
  { value: 'GOALKEEPER', label: 'Arquero', icon: '🧤' },
  { value: 'DEFENDER', label: 'Defensor', icon: '🛡️' },
  { value: 'MIDFIELDER', label: 'Mediocampista', icon: '⚽' },
  { value: 'FORWARD', label: 'Delantero', icon: '🎯' },
  { value: 'ANY', label: 'Cualquiera', icon: '🔄' },
] as const

export const ZONES_ARGENTINA = [
  'Capital Federal',
  'Zona Norte',
  'Zona Oeste',
  'Zona Sur',
  // ... más zonas
] as const

export const GPS_CHECKIN_RADIUS_METERS = 100
export const MAX_GOALS_PER_PLAYER = 30
export const MAX_GOALS_PER_TEAM = 50
export const ANTI_FARMING_LIMIT = 2
export const DEFAULT_ELO_RATING = 1200
export const ELO_K_FACTOR = 32
```

**Uso**:
```typescript
// components/match/ProposalModal.tsx
import { GAME_MODALITIES, GAME_DURATIONS } from '@/lib/constants'

<Picker>
  {GAME_MODALITIES.map(mod => (
    <Picker.Item key={mod.value} label={mod.label} value={mod.value} />
  ))}
</Picker>
```

---

### 🟡 Performance

#### Task 2.4: Reemplazar FlatList con FlashList
**Archivos**: `app/(tabs)/match.tsx`, `app/(tabs)/rivals.tsx`  
**Tiempo estimado**: 2 horas

**Instalación**:
```bash
npm install @shopify/flash-list
```

**ANTES** (`app/(tabs)/match.tsx`):
```typescript
<FlatList
  data={matches}
  renderItem={({ item }) => <MatchCard match={item} />}
  keyExtractor={(item) => item.id}
/>
```

**DESPUÉS**:
```typescript
import { FlashList } from '@shopify/flash-list'

<FlashList
  data={matches}
  renderItem={({ item }) => <MatchCard match={item} />}
  estimatedItemSize={120}  // ✅ Mejora performance
/>
```

**Beneficios**: 5-10x mejor rendimiento en listas largas (>50 items)

---

#### Task 2.5: Optimistic Updates en Chat
**Archivo**: `hooks/useMatchDetails.ts`  
**Tiempo estimado**: 2 horas

**DESPUÉS**:
```typescript
const sendMessageMutation = useMutation({
  mutationFn: async (content: string) => {
    return await chatService.sendText(matchId, myTeamId, user.id, content)
  },
  onMutate: async (content) => {
    // Cancelar queries en progreso
    await queryClient.cancelQueries({ queryKey: ['match', matchId, 'messages'] })

    // Guardar estado previo
    const previousMessages = queryClient.getQueryData(['match', matchId, 'messages'])

    // Optimistic update
    queryClient.setQueryData(['match', matchId, 'messages'], (old: ChatMessage[]) => [
      ...old,
      {
        id: 'temp-' + Date.now(),  // ID temporal
        content,
        sender_team_id: myTeamId,
        created_at: new Date().toISOString(),
        profile: { full_name: user.full_name },
      },
    ])

    return { previousMessages }
  },
  onError: (err, content, context) => {
    // Rollback en caso de error
    queryClient.setQueryData(['match', matchId, 'messages'], context?.previousMessages)
    showToast('Error al enviar mensaje', 'error')
  },
})
```

---

### 📊 Métricas de Éxito - Fase 2

**Performance**:
- [ ] Navegación Dashboard → Match Detail → Back → 0 loading spinners
- [ ] Lista de 100 rivales scrollea a 60 FPS
- [ ] Enviar mensaje en chat → Aparece instantáneamente

**Arquitectura**:
- [ ] `app/match/[id].tsx` <200 líneas
- [ ] Constantes centralizadas usadas en 5+ componentes
- [ ] Cobertura de tests unitarios >60%

**Tiempo total Fase 2**: 5 días hábiles (1 semana)

---

## 🚀 FASE 3: LANZAMIENTO (Semanas 5-6)

> **Objetivo**: App lista para usuarios finales

### 🟢 Features Finales

#### Task 3.1: Push Notifications
**Tiempo estimado**: 8 horas

**Instalación**:
```bash
npx expo install expo-notifications expo-device
```

**Setup**: `lib/notifications.ts`
```typescript
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  
  if (finalStatus !== 'granted') {
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  return token
}
```

**Guardar token en perfil**:
```typescript
// app/_layout.tsx - useEffect on mount
useEffect(() => {
  if (user) {
    registerForPushNotifications().then(async (token) => {
      if (token) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', user.id)
      }
    })
  }
}, [user])
```

**Migración SQL**:
```sql
ALTER TABLE profiles ADD COLUMN expo_push_token TEXT;
```

---

#### Task 3.2: Edge Function para Enviar Notificaciones
**Archivo**: `supabase/functions/send-notification/index.ts`  
**Tiempo estimado**: 3 horas

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { userId, title, body, data } = await req.json()

  // 1. Obtener push token del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single()

  if (!profile?.expo_push_token) {
    return new Response(JSON.stringify({ error: 'No push token' }), { status: 404 })
  }

  // 2. Enviar notificación a Expo
  const message = {
    to: profile.expo_push_token,
    sound: 'default',
    title,
    body,
    data,
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  const result = await response.json()
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
})
```

---

#### Task 3.3: Triggers para Notificaciones Automáticas
**Tiempo estimado**: 4 horas

**Casos de uso**:
1. Challenge recibido → Notificar capitanes del equipo target
2. Propuesta aceptada → Notificar ambos equipos
3. Partido confirmado → Notificar 1 hora antes
4. Resultado cargado → Notificar equipo contrario

**Ejemplo: Notificar al recibir challenge**
```sql
CREATE OR REPLACE FUNCTION notify_challenge_received()
RETURNS TRIGGER AS $$
DECLARE
  captain_id UUID;
  captain_token TEXT;
BEGIN
  IF NEW.status = 'PENDING' AND OLD.status IS NULL THEN
    -- Obtener capitán del equipo target
    SELECT t.captain_id INTO captain_id
    FROM teams t
    WHERE t.id = NEW.target_team_id;

    -- Llamar Edge Function
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'userId', captain_id,
        'title', '⚽ Nuevo Desafío',
        'body', 'Tu equipo recibió un desafío',
        'data', jsonb_build_object('challengeId', NEW.id)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_challenge_created
AFTER INSERT OR UPDATE ON challenges
FOR EACH ROW
EXECUTE FUNCTION notify_challenge_received();
```

---

#### Task 3.4: Notificaciones Programadas (1 hora antes del partido)
**Tiempo estimado**: 3 horas

**Supabase Cron Job** (requiere plan Pro):
```sql
-- Función que envía recordatorios
CREATE OR REPLACE FUNCTION send_match_reminders()
RETURNS void AS $$
DECLARE
  upcoming_match RECORD;
BEGIN
  -- Buscar partidos que empiecen en 1 hora
  FOR upcoming_match IN
    SELECT m.id, m.team_a_id, m.team_b_id, m.scheduled_at
    FROM matches m
    WHERE m.status = 'CONFIRMED'
    AND m.scheduled_at BETWEEN NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'
  LOOP
    -- Notificar a miembros del Team A
    -- Notificar a miembros del Team B
    -- (llamar Edge Function para cada miembro)
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar cada 10 minutos
SELECT cron.schedule(
  'match-reminders',
  '*/10 * * * *',  -- Cada 10 minutos
  'SELECT send_match_reminders()'
);
```

**Alternativa sin Cron** (client-side):
- Usar `expo-task-manager` con background fetch
- Ejecutar cada 30 minutos en background

---

#### Task 3.5: Validación Avanzada de W.O.
**Tiempo estimado**: 6 horas (Opcional - Nice to have)

**Validaciones automáticas**:
1. Verificar que la foto tiene metadatos GPS
2. Validar que GPS de foto coincide con ubicación de cancha
3. OCR para detectar texto (ej: "No Show")

**Edge Function**: `validate-wo-evidence`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { imageUrl, venueCoords } = await req.json()

  // 1. Descargar imagen de Storage
  const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer())

  // 2. Extraer metadatos EXIF (GPS)
  // Usar librería como https://www.npmjs.com/package/exif-js
  const exifData = extractEXIF(imageBuffer)
  
  if (!exifData.GPSLatitude) {
    return { valid: false, reason: 'Foto sin datos GPS' }
  }

  // 3. Validar que está cerca de la cancha
  const photoCoords = {
    latitude: exifData.GPSLatitude,
    longitude: exifData.GPSLongitude,
  }
  const distance = calculateDistance(photoCoords, venueCoords)

  if (distance > 200) {
    return { valid: false, reason: 'Foto tomada lejos de la cancha' }
  }

  // 4. OCR opcional (Google Vision API)
  // Detectar texto en la foto para validar contenido

  return { valid: true, distance }
})
```

**Nota**: Esta funcionalidad es compleja y opcional para MVP. Considerar para versión 2.0.

---

### 🟢 Testing & QA

#### Task 3.6: Suite de Tests Básica
**Tiempo estimado**: 8 horas

**Instalación**:
```bash
npm install --save-dev jest @testing-library/react-native
```

**Ejemplos de tests críticos**:

**`lib/geoUtils.test.ts`**:
```typescript
import { calculateDistance, isWithinRange } from './geoUtils'

describe('geoUtils', () => {
  test('calculateDistance retorna 0 para mismas coordenadas', () => {
    const coords = { latitude: -34.603722, longitude: -58.381592 }  // Buenos Aires
    expect(calculateDistance(coords, coords)).toBe(0)
  })

  test('isWithinRange retorna true si está a <100m', () => {
    const venue = { latitude: -34.603722, longitude: -58.381592 }
    const user = { latitude: -34.604000, longitude: -58.381592 }  // ~30m al norte
    expect(isWithinRange(user, venue, 100)).toBe(true)
  })
})
```

**`services/matches.service.test.ts`**:
```typescript
import { matchesService } from './matches.service'

describe('matchesService', () => {
  test('checkAntiFarming rechaza 3er partido ranked', async () => {
    const result = await matchesService.checkAntiFarming(
      'team-a-id',
      'team-b-id',
      false  // Ranked
    )
    expect(result.success).toBe(true)
    expect(result.data?.allowed).toBe(false)
  })
})
```

---

#### Task 3.7: Testing Manual en Dispositivo Real
**Tiempo estimado**: 8 horas

**Checklist**:
- [ ] **Flujo completo**: Registro → Crear equipo → Buscar rival → Enviar challenge → Aceptar → Proponer fecha → Check-in GPS → Cargar resultado → Ver ELO
- [ ] **GPS real**: Ir a cancha física y probar check-in
- [ ] **Notificaciones push**: Recibir challenge en device físico
- [ ] **Chat Realtime**: Dos dispositivos chateando simultáneamente
- [ ] **W.O.**: Subir foto con GPS y verificar carga
- [ ] **Anti-farming**: Crear 3 partidos y validar rechazo

**Casos edge**:
- [ ] Red lenta (3G) → Loading states correctos
- [ ] GPS desactivado → Mensaje de error claro
- [ ] Sin permisos cámara → Solicitar permisos
- [ ] Match eliminado mientras estás viéndolo → Navegación segura

---

### 🟢 Preparación para Tiendas

#### Task 3.8: Assets de Tienda
**Tiempo estimado**: 4 horas

**Google Play Store**:
- [ ] Icono 512x512 PNG (sin transparencia)
- [ ] Feature Graphic 1024x500 (banner)
- [ ] 5 screenshots de pantallas clave:
  1. Dashboard con próximo partido
  2. Buscador de rivales
  3. Chat de partido con propuesta
  4. Check-in GPS en cancha
  5. Ranking con ELOs

**Apple App Store**:
- [ ] Icono 1024x1024 PNG
- [ ] Screenshots 6.5" (iPhone 14 Pro Max)
- [ ] Privacy Policy URL

---

#### Task 3.9: Términos y Condiciones + Privacidad
**Tiempo estimado**: 3 horas

**Archivo**: `legal/terms.md` (subir a tu web o GitHub Pages)

**Puntos clave**:
1. **Descargo de responsabilidad por lesiones físicas**
   - "MatchFinder NO organiza partidos, solo facilita la conexión entre equipos. Los usuarios son responsables de su seguridad"
2. **Uso de GPS y Cámara**
   - "Solicitamos permisos de ubicación para validar check-in y cámara para evidencia de W.O."
3. **Moderación de contenido**
   - "Nos reservamos el derecho de suspender cuentas con comportamiento abusivo"
4. **GDPR Compliance** (si es relevante)

---

#### Task 3.10: Build & Deploy
**Tiempo estimado**: 4 horas

**EAS Build** (recomendado):
```bash
npm install -g eas-cli
eas login
eas build:configure
```

**Build para Android (APK interno)**:
```bash
eas build --platform android --profile preview
```

**Build para stores**:
```bash
eas build --platform android --profile production
eas submit --platform android  # Sube a Google Play
```

---

### 📊 Métricas de Éxito - Fase 3

**Funcionalidad**:
- [ ] Notificaciones push funcionan en device físico
- [ ] GPS check-in validado en cancha real
- [ ] Anti-farming bloquea 3er partido ranked
- [ ] ELO se actualiza tras resultado confirmado

**Calidad**:
- [ ] 0 crashes en pruebas manuales
- [ ] Tiempo de carga inicial <3 segundos
- [ ] Tests unitarios pasan al 100%

**Tiempo total Fase 3**: 10 días hábiles (2 semanas)

---

## 📋 FASE 4: GO-TO-MARKET (Post-Lanzamiento)

> **No requiere desarrollo, pero es crítica para adopción**

### Estrategia "Zona Cero" (Del documento original del proyecto)

#### Task 4.1: Seleccionar Zona Piloto
**Tiempo estimado**: 2 horas

**Criterios**:
- Barrio con 10+ canchas de fútbol
- Densidad poblacional media-alta
- Buenos Aires GBA recomendados: Ramos Mejía, Haedo, San Justo

**Objetivo**: 20 equipos activos en 30 días

---

#### Task 4.2: Guerrilla Marketing
**Tiempo estimado**: 10 horas (distribuidas en 2 semanas)

**Tácticas**:
1. **Field visits** (18:00-21:00):
   - Ir a canchas del barrio piloto
   - Hablar con capitanes que terminan de jugar
   - Pitch: "¿Cansados de jugar vs los mismos? Bajá la app, te consigo rival nuevo gratis"
   
2. **WhatsApp groups**:
   - Unirse a grupos de "Fútbol [Barrio]"
   - Compartir link de descarga + screenshot del ranking

3. **Instagram local**:
   - Crear cuenta @matchfinder_[zona]
   - Postear ranking semanal
   - Stories con "Gol de la semana"

---

#### Task 4.3: Incentivo Viral
**Tiempo estimado**: 1 hora setup

**Premio**: Juego de camisetas ($5000 ARS ≈ $15 USD) para el equipo #1 del mes

**Mecánica**:
- Mostrar banner en Dashboard: "🏆 Lidera el ranking y ganá camisetas"
- Al finalizar el mes, contactar al capitán ganador
- Pedirle foto con las camisetas → Publicar en Instagram

**ROI**: $15 USD puede traer 50+ usuarios por WOM

---

#### Task 4.4: Monitoreo de Métricas
**Herramientas**: Google Analytics + Supabase Dashboard

**KPIs semanales**:
- Registros nuevos
- Equipos creados
- Partidos jugados
- MAU (Usuarios activos mensuales)
- Tasa de retención D1/D7/D30

**Objetivo mínimo para escalar**:
- 50 usuarios activos
- 10 equipos con 2+ partidos jugados
- 1 partido nuevo por día

---

## 📊 CRONOGRAMA COMPLETO

| Fase | Duración | Tareas Principales | Bloqueante para Producción |
|------|----------|-------------------|---------------------------|
| **Fase 0: Hotfix** | 5 días | RLS, Memory leaks, Validaciones | ✅ Crítico |
| **Fase 1: Core Features** | 11 días | GPS, ELO, Anti-farming | ✅ Crítico |
| **Fase 2: Refactoring** | 5 días | TanStack Query, Decomposición | ⚠️ Recomendado |
| **Fase 3: Lanzamiento** | 10 días | Push notifications, Testing, Build | ✅ Crítico |
| **Fase 4: GTM** | Continuo | Marketing, Iteración | No-técnico |

**Tiempo total desarrollo**: 31 días hábiles ≈ **6 semanas**

---

## 🎯 PRIORIZACIÓN FINAL

### Must Have (Bloqueantes)
1. ✅ **Fase 0 completa** (Seguridad + Memory leaks)
2. ✅ **GPS check-in real** (Task 1.1-1.5)
3. ✅ **Sistema ELO funcional** (Task 1.6-1.10)
4. ✅ **Push notifications básicas** (Task 3.1-3.3)
5. ✅ **Testing manual completo** (Task 3.7)

### Should Have (Importante)
6. ⚠️ **Anti-farming** (Task 1.11-1.15)
7. ⚠️ **TanStack Query** (Task 2.1)
8. ⚠️ **Refactoring Match screen** (Task 2.2)
9. ⚠️ **Tests unitarios** (Task 3.6)

### Nice to Have (V2.0)
10. 🟢 **Validación W.O. con GPS de foto** (Task 3.5)
11. 🟢 **FlashList** (Task 2.4)
12. 🟢 **Notificaciones programadas** (Task 3.4)

---

## 📝 NOTAS FINALES

### Riesgos
1. **GPS en iOS**: Requiere configuración específica de Info.plist
2. **Push notifications**: Requiere Apple Developer Account ($99/año)
3. **Supabase Edge Functions**: Pueden tener cold start latency (~2s primera ejecución)

### Decisiones Técnicas Pendientes
- [ ] ¿Usar Expo Go o Development Build? (Recomendado: Dev Build para push)
- [ ] ¿Habilitar pg_net en Supabase para triggers automáticos?
- [ ] ¿Implementar rate limiting en Edge Functions?

### Escalabilidad
- Base de datos actual soporta ~10,000 usuarios sin optimizaciones
- A partir de 50,000 usuarios considerar:
  - Particionamiento de tabla `matches` por fecha
  - CDN para avatares/logos (Cloudflare)
  - Redis cache para rankings

---

## ✅ CHECKLIST PRE-LANZAMIENTO

**Seguridad**:
- [ ] Todas las tablas tienen RLS policies
- [ ] Campos sensibles protegidos (elo_rating, etc)
- [ ] Tokens de Supabase en .env, no en código

**Funcionalidad**:
- [ ] GPS check-in funciona en device real
- [ ] ELO se actualiza tras resultado
- [ ] Anti-farming bloquea 3er partido
- [ ] Push notifications llegan

**UX**:
- [ ] No hay loading infinito en ninguna pantalla
- [ ] Mensajes de error son claros
- [ ] Navegación es intuitiva

**Legal**:
- [ ] Términos y Condiciones publicados
- [ ] Privacy Policy con info de GPS/Cámara
- [ ] Descargo de responsabilidad por lesiones

**Tiendas**:
- [ ] Icono y screenshots listos
- [ ] Descripción en español
- [ ] Build firmado y testeado

---

**Próximos pasos inmediatos**:
1. ⭐ **Comenzar con Task 0.1** (Políticas RLS faltantes)
2. ⭐ **Fix Memory Leaks** (Task 0.3-0.5)
3. ⭐ **GPS Check-in** (Task 1.1-1.5)

🚀 **¡Éxito con el lanzamiento de MatchFinder!**
