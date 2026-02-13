# ========================================
# MATCHFINDER - RLS Policies Verification Script
# Date: 2026-02-13
# Description: Script para verificar que las políticas RLS están correctamente aplicadas
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MATCHFINDER - RLS Policies Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existen los archivos de migración
$migrationFile = "supabase\migrations\20260213_critical_rls_policies.sql"
$testFile = "supabase\migrations\20260213_test_rls_policies.sql"
$docsFile = "supabase\APLICAR_RLS_POLICIES.md"

$allFilesExist = $true

Write-Host "Verificando archivos de migración..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $migrationFile) {
    Write-Host "[✓] Migración principal encontrada" -ForegroundColor Green
    Write-Host "    Ubicación: $migrationFile" -ForegroundColor Gray
} else {
    Write-Host "[✗] ERROR: Archivo de migración no encontrado" -ForegroundColor Red
    Write-Host "    Esperado en: $migrationFile" -ForegroundColor Gray
    $allFilesExist = $false
}

if (Test-Path $testFile) {
    Write-Host "[✓] Suite de tests encontrada" -ForegroundColor Green
    Write-Host "    Ubicación: $testFile" -ForegroundColor Gray
} else {
    Write-Host "[✗] ERROR: Archivo de tests no encontrado" -ForegroundColor Red
    Write-Host "    Esperado en: $testFile" -ForegroundColor Gray
    $allFilesExist = $false
}

if (Test-Path $docsFile) {
    Write-Host "[✓] Documentación encontrada" -ForegroundColor Green
    Write-Host "    Ubicación: $docsFile" -ForegroundColor Gray
} else {
    Write-Host "[✗] ERROR: Documentación no encontrada" -ForegroundColor Red
    Write-Host "    Esperado en: $docsFile" -ForegroundColor Gray
    $allFilesExist = $false
}

Write-Host ""

if (-not $allFilesExist) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ ERROR: Faltan archivos requeridos" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, ejecuta primero la generación de migraciones." -ForegroundColor Yellow
    exit 1
}

# Verificar contenido de la migración
Write-Host "Verificando contenido de la migración..." -ForegroundColor Yellow
Write-Host ""

$migrationContent = Get-Content $migrationFile -Raw

$requiredPolicies = @(
    "Captains can insert match results",
    "Captains can update match results",
    "Captains can update match details",
    "valid_goals_a_range",
    "valid_goals_b_range",
    "valid_player_goals"
)

$policiesFound = 0
foreach ($policy in $requiredPolicies) {
    if ($migrationContent -match [regex]::Escape($policy)) {
        Write-Host "[✓] Política encontrada: $policy" -ForegroundColor Green
        $policiesFound++
    } else {
        Write-Host "[✗] Política FALTANTE: $policy" -ForegroundColor Red
    }
}

Write-Host ""

if ($policiesFound -eq $requiredPolicies.Count) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ Todas las políticas están presentes" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ Faltan políticas en la migración" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Encontradas: $policiesFound / $($requiredPolicies.Count)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abre Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ve a SQL Editor y ejecuta:" -ForegroundColor White
Write-Host "   $migrationFile" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Ejecuta los tests:" -ForegroundColor White
Write-Host "   $testFile" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Lee la documentación completa:" -ForegroundColor White
Write-Host "   $docsFile" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si desea abrir los archivos
Write-Host "¿Deseas abrir la documentación ahora? (S/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host ""
    Write-Host "Abriendo documentación..." -ForegroundColor Green
    Start-Process $docsFile
    Start-Sleep -Seconds 1
    
    Write-Host ""
    Write-Host "¿Deseas abrir el archivo SQL de migración? (S/N): " -NoNewline -ForegroundColor Yellow
    $responseSql = Read-Host
    
    if ($responseSql -eq "S" -or $responseSql -eq "s") {
        Write-Host "Abriendo archivo SQL..." -ForegroundColor Green
        Start-Process $migrationFile
    }
}

Write-Host ""
Write-Host "Script completado exitosamente. ✓" -ForegroundColor Green
Write-Host ""
