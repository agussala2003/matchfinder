import { Button } from '@/components/ui/Button'
import { useGPSCheckin } from '@/hooks/useGPSCheckin'
import { MatchDetail } from '@/services/matches.service'
import { AlertTriangle, Check, Navigation, RotateCw } from 'lucide-react-native'
import React, { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'

interface CheckinSectionProps {
  match: MatchDetail
  isTeamA: boolean
  canManage: boolean
  setMatchState: (state: 'previa' | 'checkin' | 'postmatch') => void
  setShowWOModal: (show: boolean) => void
  submitCheckinFlow: (isTeamA: boolean, onSuccess?: () => void) => Promise<void>
}

export const CheckinSection = ({
  match,
  isTeamA,
  canManage,
  setMatchState,
  setShowWOModal,
  submitCheckinFlow,
}: CheckinSectionProps) => {
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false)

  // Obtener coordenadas del venue
  const venueLat = match.venue?.latitude ?? 0
  const venueLng = match.venue?.longitude ?? 0

  // Usar el hook de GPS
  const { distanceInMeters, hasPermissions, isLoading, isWithinRange, refreshLocation } =
    useGPSCheckin(venueLat, venueLng)

  // Determinar si el equipo ya hizo check-in
  const hasCheckedIn = isTeamA ? match.checkin_team_a : match.checkin_team_b

  // Formatear distancia para mostrar
  const formatDistance = (meters: number | null): string => {
    if (meters === null) return 'N/A'
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(2)}km`
  }

  const handleCheckin = async () => {
    setIsSubmittingCheckin(true)
    try {
      await submitCheckinFlow(isTeamA)
    } catch (error) {
      console.error('Error al hacer check-in:', error)
    } finally {
      setIsSubmittingCheckin(false)
    }
  }

  const canCheckin =
    !hasCheckedIn && isWithinRange && !isLoading && !isSubmittingCheckin && hasPermissions

  // Lógica de elegibilidad para W.O.
  const rivalCheckedIn = isTeamA ? match.checkin_team_b : match.checkin_team_a
  const canClaimWalkover = hasCheckedIn && !rivalCheckedIn
  const woBlockReason = !hasCheckedIn
    ? 'Debes hacer check-in para poder reclamar los puntos'
    : rivalCheckedIn
      ? 'El equipo rival ya hizo check-in. No puedes reclamar W.O.'
      : null

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
    >
      {/* Círculo indicador con icono */}
      <View
        className={`w-40 h-40 self-center rounded-full items-center justify-center mb-8 border-4 ${
          hasCheckedIn
            ? 'bg-primary/20 border-primary'
            : isWithinRange
              ? 'bg-primary/20 border-primary'
              : 'bg-card border-border'
        }`}
      >
        {hasCheckedIn ? (
          <Check size={64} color="#00D54B" strokeWidth={3} />
        ) : (
          <Navigation
            size={64}
            color={isWithinRange ? '#00D54B' : '#6B7280'}
          />
        )}
      </View>

      {/* Título */}
      <Text className="text-foreground text-3xl font-bold text-center mb-3">
        {hasCheckedIn
          ? '✅ Ya estás listo!'
          : `A ${formatDistance(distanceInMeters)}`}
      </Text>

      {/* Descripción */}
      <Text className="text-muted-foreground text-center mb-12 px-4 leading-6">
        {hasCheckedIn
          ? 'Tu equipo ya hizo check-in. Esperando al resto del equipo. El partido comenzará pronto.'
          : isLoading
            ? 'Obteniendo tu ubicación...'
            : !hasPermissions
              ? 'Por favor, otorga permisos de ubicación para hacer check-in.'
              : isWithinRange
                ? `Estás en la cancha (${formatDistance(distanceInMeters)}). Confirma tu presencia.`
                : `Acércate más a la sede para hacer check-in. Necesitas estar a menos de 150m (actualmente a ${formatDistance(distanceInMeters)})`}
      </Text>

      {/* Botón de Check-in */}
      {!hasCheckedIn && (
        <Button
          title={isSubmittingCheckin ? 'Confirmando...' : 'HACER CHECK-IN'}
          onPress={handleCheckin}
          disabled={!canCheckin}
          className="w-full h-14 mb-4"
          variant="primary"
        />
      )}

      {/* Botón de actualizar ubicación */}
      {!hasCheckedIn && (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 p-4 rounded-xl border border-border active:bg-muted mb-4"
          onPress={refreshLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#6B7280" size="small" />
          ) : (
            <RotateCw size={16} color="#6B7280" strokeWidth={2} />
          )}
          <Text className="text-muted-foreground text-xs font-semibold uppercase">
            📍 Actualizar Ubicación
          </Text>
        </TouchableOpacity>
      )}

      {/* Botón para terminar partido (solo si es capitán y ya hay check-in) */}
      {hasCheckedIn && canManage && (
        <Button
          title="Terminar Partido"
          variant="secondary"
          onPress={() => setMatchState('postmatch')}
          className="w-full mb-4"
        />
      )}

      {/* Botón para reportar W.O. - Solo si se cumplen las condiciones estrictas */}
      {canClaimWalkover && (
        <TouchableOpacity
          className="mt-4 flex-row items-center justify-center gap-2 bg-destructive/10 p-4 rounded-xl border border-destructive/30 active:bg-destructive/20"
          onPress={() => setShowWOModal(true)}
        >
          <AlertTriangle size={16} color="#D93036" strokeWidth={2} />
          <Text className="text-destructive text-xs font-bold uppercase">
            Reportar Ausencia (W.O.)
          </Text>
        </TouchableOpacity>
      )}

      {/* Mensaje bloqueante si no se cumplen las condiciones */}
      {!canClaimWalkover && woBlockReason && (
        <View className="mt-4 bg-warning/10 p-4 rounded-xl border border-warning/30 flex-row items-center gap-2">
          <AlertTriangle size={16} color="#F59E0B" strokeWidth={2} />
          <Text className="text-warning text-xs font-semibold flex-1">
            {woBlockReason}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}