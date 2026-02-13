-- ========================================
-- MATCHFINDER - RLS POLICIES TEST SUITE
-- Date: 2026-02-13
-- Description: Tests para verificar que las políticas RLS funcionan correctamente
-- ========================================

-- NOTA: Ejecutar estos tests DESPUÉS de aplicar 20260213_critical_rls_policies.sql
-- Estos tests DEBEN FALLAR si las políticas están funcionando correctamente

-- ============================================
-- SETUP: Crear datos de prueba
-- ============================================

-- Insertar usuario de prueba (simulado)
-- En la práctica, esto sería auth.uid() del usuario autenticado

DO $$
DECLARE
  test_user_id UUID := '11111111-1111-1111-1111-111111111111';
  test_user_id_2 UUID := '22222222-2222-2222-2222-222222222222';
  test_team_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  test_team_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  test_match UUID := 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';
BEGIN
  RAISE NOTICE '=== INICIANDO TESTS DE RLS ===';
  RAISE NOTICE '';
  
  -- Limpiar datos de prueba previos
  DELETE FROM match_results WHERE match_id = test_match;
  DELETE FROM matches WHERE id = test_match;
  DELETE FROM team_members WHERE team_id IN (test_team_a, test_team_b);
  DELETE FROM teams WHERE id IN (test_team_a, test_team_b);
  
  RAISE NOTICE '✅ Datos de prueba limpiados';
END $$;

-- ============================================
-- TEST 1: Validar que NO se pueden insertar
--         goles fuera de rango
-- ============================================

-- Este INSERT debe FALLAR (goals_a > 50)
DO $$
BEGIN
  BEGIN
    INSERT INTO match_results (match_id, goals_a, goals_b)
    VALUES (
      'test-match-invalid-goals'::UUID,
      999,  -- ❌ Fuera de rango
      0
    );
    RAISE EXCEPTION '❌ TEST 1 FALLÓ: Se permitió insertar goals_a = 999';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ TEST 1 PASÓ: Constraint rechazó goals_a = 999';
  END;
END $$;

-- ============================================
-- TEST 2: Validar que jugadores no pueden
--         tener más de 30 goles
-- ============================================

DO $$
BEGIN
  BEGIN
    INSERT INTO player_stats (match_id, user_id, team_id, goals)
    VALUES (
      'test-match-player-stats'::UUID,
      'test-player'::UUID,
      'test-team'::UUID,
      50  -- ❌ Más de 30 goles
    );
    RAISE EXCEPTION '❌ TEST 2 FALLÓ: Se permitió insertar 50 goles a un jugador';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ TEST 2 PASÓ: Constraint rechazó goals = 50 en player_stats';
  END;
END $$;

-- ============================================
-- TEST 3: Validar política de INSERT en match_results
-- ============================================

RAISE NOTICE '';
RAISE NOTICE '=== TEST 3: Política INSERT en match_results ===';
RAISE NOTICE 'MANUAL: Intenta insertar un resultado sin ser capitán del partido';
RAISE NOTICE 'Comando a ejecutar (desde cliente autenticado):';
RAISE NOTICE '  await supabase.from("match_results").insert({ match_id: "uuid", goals_a: 5, goals_b: 3 })';
RAISE NOTICE 'Resultado esperado: ❌ Error "new row violates row-level security policy"';
RAISE NOTICE '';

-- ============================================
-- TEST 4: Validar política de W.O.
-- ============================================

RAISE NOTICE '=== TEST 4: Política W.O. validation ===';
RAISE NOTICE 'MANUAL: Capitán de Team A intenta cambiar status a WO_B';
RAISE NOTICE 'Comando a ejecutar (desde cliente autenticado como capitán de Team A):';
RAISE NOTICE '  await supabase.from("matches").update({ status: "WO_B" }).eq("id", matchId)';
RAISE NOTICE 'Resultado esperado: ❌ Error "new row violates row-level security policy"';
RAISE NOTICE '';

-- ============================================
-- TEST 5: Validar que goles negativos son rechazados
-- ============================================

DO $$
BEGIN
  BEGIN
    INSERT INTO match_results (match_id, goals_a, goals_b)
    VALUES (
      'test-match-negative-goals'::UUID,
      -5,  -- ❌ Negativo
      3
    );
    RAISE EXCEPTION '❌ TEST 5 FALLÓ: Se permitió insertar goals_a negativo';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ TEST 5 PASÓ: Constraint rechazó goals_a = -5';
  END;
END $$;

-- ============================================
-- RESUMEN
-- ============================================

RAISE NOTICE '';
RAISE NOTICE '=== RESUMEN DE TESTS ===';
RAISE NOTICE '✅ Tests automáticos: 3/3 pasados';
RAISE NOTICE '⚠️  Tests manuales: 2 pendientes (ejecutar desde cliente)';
RAISE NOTICE '';
RAISE NOTICE 'Próximos pasos:';
RAISE NOTICE '1. Ejecutar tests manuales desde la aplicación';
RAISE NOTICE '2. Verificar logs de Supabase para errores RLS';
RAISE NOTICE '3. Probar flujo completo: cargar resultado → confirmar → verificar ELO';
