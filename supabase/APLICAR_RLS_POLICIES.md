# 🔒 APLICACIÓN DE POLÍTICAS RLS CRÍTICAS

**Fecha**: 13 Febrero 2026  
**Fase**: 0 - Hotfix Crítico  
**Task**: 0.1 - Políticas RLS Faltantes

---

## 🎯 Objetivo

Cerrar brechas de seguridad críticas en las tablas `match_results` y `matches` mediante políticas Row Level Security (RLS) y constraints de validación.

---

## 🚨 Problemas Identificados

### 1. `match_results` - Sin Protección
- ❌ **Situación actual**: Solo tiene política SELECT (lectura pública)
- ❌ **Vulnerabilidad**: Cualquier usuario autenticado puede insertar/actualizar resultados con valores arbitrarios
- ❌ **Exploit posible**: 
  ```typescript
  await supabase.from('match_results').insert({
    match_id: 'uuid',
    goals_a: 999,
    goals_b: 0
  })
  // ✅ ACEPTA sin validación
  ```

### 2. `matches` - W.O. Sin Validación de Equipo
- ❌ **Situación actual**: Política genérica permite UPDATE a cualquier capitán
- ❌ **Vulnerabilidad**: Capitán de Team A puede cambiar status a `WO_B` (victoria para A)
- ❌ **Exploit posible**:
  ```typescript
  // Capitán de Team A ejecuta:
  await supabase.from('matches').update({ 
    status: 'WO_B'  // ❌ Reclamando W.O. para el equipo contrario
  }).eq('id', matchId)
  // ✅ ACEPTA sin validar qué equipo reclama
  ```

### 3. Sin Validación de Rangos
- ❌ No hay límites para `goals_a`, `goals_b`, `player_stats.goals`
- ❌ Cliente puede enviar valores negativos o absurdos (999 goles)

---

## ✅ Soluciones Implementadas

### Migración: `20260213_critical_rls_policies.sql`

#### 1. **Política INSERT en `match_results`**
```sql
CREATE POLICY "Captains can insert match results"
ON match_results FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT tm.user_id 
    FROM team_members tm
    JOIN matches m ON (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id)
    WHERE m.id = match_results.match_id
    AND tm.role IN ('ADMIN', 'SUB_ADMIN')
    AND tm.status = 'ACTIVE'
  )
);
```
**Efecto**: Solo capitanes de los equipos involucrados pueden insertar resultados.

---

#### 2. **Política UPDATE en `match_results`**
```sql
CREATE POLICY "Captains can update match results"
ON match_results FOR UPDATE
USING (...);
```
**Efecto**: Solo capitanes pueden actualizar para confirmaciones (`confirmed_by_a/b`).

---

#### 3. **Constraints de Validación de Goles**
```sql
ALTER TABLE match_results 
ADD CONSTRAINT valid_goals_a_range CHECK (goals_a >= 0 AND goals_a <= 50);

ALTER TABLE match_results 
ADD CONSTRAINT valid_goals_b_range CHECK (goals_b >= 0 AND goals_b <= 50);

ALTER TABLE player_stats
ADD CONSTRAINT valid_player_goals CHECK (goals >= 0 AND goals <= 30);
```
**Efecto**: Rechaza valores fuera de rango (negativos o >50 goles).

---

#### 4. **Política W.O. con Validación de Equipo**
```sql
CREATE POLICY "Captains can update match details"
ON matches FOR UPDATE
WITH CHECK (
  CASE 
    WHEN NEW.status = 'WO_A' THEN 
      auth.uid() IN (SELECT ... FROM team_members WHERE team_id = matches.team_a_id ...)
    WHEN NEW.status = 'WO_B' THEN 
      auth.uid() IN (SELECT ... FROM team_members WHERE team_id = matches.team_b_id ...)
    ELSE ...
  END
);
```
**Efecto**: Solo el equipo correspondiente puede reclamar su W.O.

---

## 📋 Instrucciones de Aplicación

### Paso 1: Verificar Acceso a Supabase Dashboard

1. Abre [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **MatchFinder**
3. Ve a **SQL Editor** (panel izquierdo)

---

### Paso 2: Aplicar Migración Principal

1. Abre el archivo `supabase/migrations/20260213_critical_rls_policies.sql`
2. Copia **TODO** el contenido (144 líneas)
3. Pega en el SQL Editor de Supabase
4. Click en **Run** (▶️)

**Resultado esperado**:
```
✅ Success. Rows: 0
✅ Políticas RLS críticas aplicadas correctamente
  - match_results: INSERT/UPDATE protegidos
  - matches: W.O. validation implementada
  - Constraints de goals aplicados
```

---

### Paso 3: Verificar Políticas Creadas

Ejecuta este query en SQL Editor:
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('match_results', 'matches')
ORDER BY tablename, cmd;
```

**Resultado esperado**:
```
| tablename      | policyname                           | cmd    |
|----------------|--------------------------------------|--------|
| match_results  | Public read access                   | SELECT |
| match_results  | Captains can insert match results    | INSERT |
| match_results  | Captains can update match results    | UPDATE |
| matches        | Public read access                   | SELECT |
| matches        | Captains can update match details    | UPDATE |
| matches        | Captains can create matches...       | INSERT |
```

---

### Paso 4: Ejecutar Suite de Tests

1. Abre `supabase/migrations/20260213_test_rls_policies.sql`
2. Copia y pega en SQL Editor
3. Click en **Run**

**Resultado esperado**:
```
✅ TEST 1 PASÓ: Constraint rechazó goals_a = 999
✅ TEST 2 PASÓ: Constraint rechazó goals = 50 en player_stats
✅ TEST 5 PASÓ: Constraint rechazó goals_a = -5

=== RESUMEN DE TESTS ===
✅ Tests automáticos: 3/3 pasados
⚠️  Tests manuales: 2 pendientes (ejecutar desde cliente)
```

---

### Paso 5: Tests Manuales desde la App

#### Test Manual 1: Intentar insertar resultado sin permiso

1. Abre la app en dispositivo/emulador
2. Inicia sesión con un usuario que **NO sea capitán** de ningún equipo
3. Abre la consola del navegador (Chrome DevTools)
4. Ejecuta:
   ```typescript
   const { data, error } = await supabase
     .from('match_results')
     .insert({
       match_id: 'uuid-de-cualquier-partido',
       goals_a: 5,
       goals_b: 3
     })
   
   console.log('Error esperado:', error)
   // ✅ DEBE mostrar: "new row violates row-level security policy"
   ```

#### Test Manual 2: Intentar reclamar W.O. del equipo contrario

1. Inicia sesión como **capitán de Team A** en un partido
2. Ve a la pantalla del partido
3. Intenta cambiar status a `WO_B` (victoria para el contrario):
   ```typescript
   const { data, error } = await supabase
     .from('matches')
     .update({ status: 'WO_B' })
     .eq('id', matchId)
   
   console.log('Error esperado:', error)
   // ✅ DEBE mostrar: "new row violates row-level security policy"
   ```

---

## 🔍 Verificación de Seguridad

### Checklist de Validación

- [ ] **Política INSERT match_results**: Usuario no-capitán rechazado
- [ ] **Política UPDATE match_results**: Solo capitanes pueden confirmar
- [ ] **Constraint goals_a**: Valores >50 rechazados
- [ ] **Constraint goals_b**: Valores <0 rechazados
- [ ] **Constraint player_stats**: Goles >30 rechazados
- [ ] **Política W.O.**: Capitán de Team A NO puede reclamar WO_B
- [ ] **Política W.O.**: Capitán de Team B NO puede reclamar WO_A

---

## 📊 Impacto Esperado

### Antes de la Migración
```typescript
// ❌ CUALQUIER usuario podía hacer esto:
await supabase.from('match_results').insert({
  match_id: 'uuid',
  goals_a: 999,
  goals_b: -10
})
// ✅ ACEPTA sin validación
```

### Después de la Migración
```typescript
// ❌ RECHAZADO por RLS policy
await supabase.from('match_results').insert({
  match_id: 'uuid',
  goals_a: 5,
  goals_b: 3
})
// Error: "new row violates row-level security policy"

// ❌ RECHAZADO por constraint
await supabase.from('match_results').insert({
  match_id: 'uuid',
  goals_a: 999,
  goals_b: 0
})
// Error: "new row violates check constraint valid_goals_a_range"

// ✅ ACEPTADO solo si eres capitán del partido
await supabase.from('match_results').insert({
  match_id: 'match-donde-soy-capitan',
  goals_a: 5,
  goals_b: 3
})
// Success: data = [{ match_id: ..., goals_a: 5, goals_b: 3 }]
```

---

## 🚨 Rollback (En caso de error)

Si algo sale mal, ejecuta este script para revertir:

```sql
-- Eliminar políticas nuevas
DROP POLICY IF EXISTS "Captains can insert match results" ON match_results;
DROP POLICY IF EXISTS "Captains can update match results" ON match_results;
DROP POLICY IF EXISTS "Captains can update match details" ON matches;
DROP POLICY IF EXISTS "Captains can create matches for their teams" ON matches;

-- Eliminar constraints
ALTER TABLE match_results DROP CONSTRAINT IF EXISTS valid_goals_a_range;
ALTER TABLE match_results DROP CONSTRAINT IF EXISTS valid_goals_b_range;
ALTER TABLE player_stats DROP CONSTRAINT IF EXISTS valid_player_goals;

-- Restaurar política original de matches (si existía)
CREATE POLICY "Captains can update matches"
ON matches FOR UPDATE
USING (
  auth.uid() IN (
    SELECT tm.user_id FROM team_members tm
    WHERE (tm.team_id = matches.team_a_id OR tm.team_id = matches.team_b_id)
    AND tm.role IN ('ADMIN', 'SUB_ADMIN')
    AND tm.status = 'ACTIVE'
  )
);
```

---

## 📈 Métricas de Éxito

- ✅ **0 intentos exitosos** de insertar resultados sin ser capitán
- ✅ **0 intentos exitosos** de insertar goles >50 o <0
- ✅ **0 intentos exitosos** de reclamar W.O. del equipo contrario
- ✅ **100% de las operaciones legítimas** siguen funcionando

---

## 🎯 Próximos Pasos

Una vez completada esta tarea:

1. ✅ Marcar como completada: **Task 0.1 - Políticas RLS Faltantes**
2. ➡️ Continuar con: **Task 0.2 - Proteger Campos Sensibles en Services**
3. 📝 Actualizar `MASTER_ROADMAP.md` con progreso

---

## 📞 Soporte

Si encuentras errores durante la aplicación:

1. **Captura el error completo** del SQL Editor
2. **Verifica** que no haya políticas duplicadas:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'match_results';
   ```
3. **Consulta** el log de Supabase: Dashboard > Logs > Postgres Logs

---

**Tiempo estimado**: 4 horas  
**Estado**: ✅ Migración creada, pendiente aplicación  
**Bloqueante**: SÍ - Crítico para producción
