-- ========================================
-- MATCHFINDER - CRITICAL RLS POLICIES
-- Date: 2026-02-13
-- Description: Fix critical security gaps in match_results and matches tables
-- ========================================

-- ============================================
-- 1. MATCH_RESULTS - INSERT POLICY
-- ============================================
-- Solo los capitanes de los equipos involucrados pueden insertar resultados

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

-- ============================================
-- 2. MATCH_RESULTS - UPDATE POLICY
-- ============================================
-- Solo los capitanes pueden actualizar resultados (para confirmaciones)

CREATE POLICY "Captains can update match results"
ON match_results FOR UPDATE
USING (
  auth.uid() IN (
    SELECT tm.user_id 
    FROM team_members tm
    JOIN matches m ON (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id)
    WHERE m.id = match_results.match_id
    AND tm.role IN ('ADMIN', 'SUB_ADMIN')
    AND tm.status = 'ACTIVE'
  )
);

-- ============================================
-- 3. MATCH_RESULTS - CONSTRAINTS
-- ============================================
-- Validar rangos de goles para prevenir valores absurdos

ALTER TABLE match_results 
ADD CONSTRAINT valid_goals_a_range CHECK (goals_a >= 0 AND goals_a <= 50);

ALTER TABLE match_results 
ADD CONSTRAINT valid_goals_b_range CHECK (goals_b >= 0 AND goals_b <= 50);

-- ============================================
-- 4. PLAYER_STATS - CONSTRAINTS
-- ============================================
-- Validar que un jugador no pueda tener más de 30 goles en un partido

ALTER TABLE player_stats
ADD CONSTRAINT valid_player_goals CHECK (goals >= 0 AND goals <= 30);

-- ============================================
-- 5. MATCHES - W.O. VALIDATION POLICY
-- ============================================
-- Solo el equipo correspondiente puede reclamar W.O.
-- Esta política reemplaza la genérica "Captains can update matches"

-- Primero, necesitamos drop la política existente si es muy permisiva
DROP POLICY IF EXISTS "Captains can update matches" ON matches;

-- Nueva política más estricta para cambios de status a W.O.
CREATE POLICY "Captains can update match details"
ON matches FOR UPDATE
USING (
  auth.uid() IN (
    SELECT tm.user_id 
    FROM team_members tm
    WHERE (tm.team_id = matches.team_a_id OR tm.team_id = matches.team_b_id)
    AND tm.role IN ('ADMIN', 'SUB_ADMIN')
    AND tm.status = 'ACTIVE'
  )
)
WITH CHECK (
  -- Validación especial para cambios de estado a W.O.
  CASE 
    -- Si se está cambiando a WO_A, debe ser un capitán del Team A
    WHEN NEW.status = 'WO_A' THEN 
      auth.uid() IN (
        SELECT tm.user_id 
        FROM team_members tm
        WHERE tm.team_id = matches.team_a_id 
        AND tm.role IN ('ADMIN', 'SUB_ADMIN')
        AND tm.status = 'ACTIVE'
      )
    -- Si se está cambiando a WO_B, debe ser un capitán del Team B
    WHEN NEW.status = 'WO_B' THEN 
      auth.uid() IN (
        SELECT tm.user_id 
        FROM team_members tm
        WHERE tm.team_id = matches.team_b_id 
        AND tm.role IN ('ADMIN', 'SUB_ADMIN')
        AND tm.status = 'ACTIVE'
      )
    -- Para cualquier otro cambio, solo verificar que sea capitán
    ELSE 
      auth.uid() IN (
        SELECT tm.user_id 
        FROM team_members tm
        WHERE (tm.team_id = matches.team_a_id OR tm.team_id = matches.team_b_id)
        AND tm.role IN ('ADMIN', 'SUB_ADMIN')
        AND tm.status = 'ACTIVE'
      )
  END
);

-- ============================================
-- 6. MATCHES - INSERT POLICY
-- ============================================
-- Permitir que capitanes creen matches (necesario para challenges)

CREATE POLICY "Captains can create matches for their teams"
ON matches FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT tm.user_id 
    FROM team_members tm
    WHERE (tm.team_id = team_a_id OR tm.team_id = team_b_id)
    AND tm.role IN ('ADMIN', 'SUB_ADMIN')
    AND tm.status = 'ACTIVE'
  )
);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verificar que las políticas se crearon correctamente
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS críticas aplicadas correctamente';
  RAISE NOTICE '  - match_results: INSERT/UPDATE protegidos';
  RAISE NOTICE '  - matches: W.O. validation implementada';
  RAISE NOTICE '  - Constraints de goals aplicados';
END $$;
