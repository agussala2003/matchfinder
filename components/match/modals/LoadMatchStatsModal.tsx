import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { statsService } from '@/services/stats.service'
import { TeamMemberDetail } from '@/services/teams.service'
import { Minus, Plus, Shield, Trophy } from 'lucide-react-native'
import React, { useState } from 'react'
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'


interface LoadMatchStatsModalProps {
  visible: boolean
  matchId: string
  teamMembers: TeamMemberDetail[]
  myTeamId: string
  onClose: () => void
  onSuccess?: () => void
}

export const LoadMatchStatsModal = ({
  visible,
  matchId,
  teamMembers,
  myTeamId,
  onClose,
  onSuccess,
}: LoadMatchStatsModalProps) => {
  const { showToast } = useToast()
  const [localGoals, setLocalGoals] = useState<Record<string, number>>({})
  const [selectedMVP, setSelectedMVP] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddGoal = (userId: string) => {
    setLocalGoals((prev) => ({
      ...prev,
      [userId]: Math.min((prev[userId] || 0) + 1, 30),
    }))
  }

  const handleRemoveGoal = (userId: string) => {
    setLocalGoals((prev) => ({
      ...prev,
      [userId]: Math.max((prev[userId] || 0) - 1, 0),
    }))
  }

  const handleSaveStats = async () => {
    try {
      setIsLoading(true)

      // Preparar los datos de estadísticas
      const statsData = teamMembers
        .filter((member) => member.user_id) // Asegurar que xista user_id
        .map((member) => ({
          userId: member.user_id,
          teamId: myTeamId,
          goals: localGoals[member.user_id] || 0,
        }))

      if (statsData.length === 0) {
        showToast('No hay jugadores para guardar', 'error')
        return
      }

      // Llamar al servicio
      const result = await statsService.saveMatchStats(matchId, statsData, selectedMVP || undefined)

      if (!result.success) {
        showToast(result.error || 'Error al guardar estadísticas', 'error')
        return
      }

      showToast('¡Estadísticas guardadas exitosamente!', 'success')

      // Limpiar estado local
      setLocalGoals({})
      setSelectedMVP(null)

      // Callback de éxito
      onSuccess?.()

      // Cerrar modal
      onClose()
    } catch (error) {
      console.error('Error saving match stats:', error)
      showToast('Error inesperado al guardar', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-background rounded-t-3xl mt-auto overflow-hidden">
          {/* Header */}
          <View className="bg-card border-b border-border px-4 py-4">
            <Text className="text-foreground font-title text-xl text-center">
              Cargar Estadísticas Individuales
            </Text>
            <Text className="text-muted-foreground text-center text-xs mt-1">
              Ingresa goles y selecciona la figura del partido
            </Text>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-4 py-4">
            {teamMembers.length === 0 ? (
              <View className="items-center justify-center py-8">
                <Text className="text-muted-foreground">No hay jugadores disponibles</Text>
              </View>
            ) : (
              <View className="gap-3">
                {teamMembers.map((member) => (
                  <View
                    key={member.user_id}
                    className="bg-card rounded-lg border border-border p-4 flex-row items-center justify-between"
                  >
                    {/* Avatar y Nombre */}
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-12 h-12 rounded-full bg-secondary border border-border items-center justify-center overflow-hidden">
                        {member.profile?.avatar_url ? (
                          <Image
                            source={{ uri: member.profile.avatar_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Shield size={20} color="#A1A1AA" strokeWidth={2} />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="text-foreground font-semibold text-sm">
                          {member.profile?.full_name || 'Jugador'}
                        </Text>
                        {member.profile?.username && (
                          <Text className="text-muted-foreground text-xs">
                            @{member.profile.username}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Goles (Stepper) */}
                    <View className="flex-row items-center gap-2 bg-secondary rounded-lg border border-border px-2 py-1">
                      <TouchableOpacity
                        onPress={() => handleRemoveGoal(member.user_id)}
                        disabled={isLoading}
                        className="p-1 active:bg-muted rounded"
                      >
                        <Minus size={16} color="#A1A1AA" strokeWidth={2} />
                      </TouchableOpacity>

                      <Text className="text-foreground font-bold text-sm min-w-[20px] text-center">
                        {localGoals[member.user_id] || 0}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleAddGoal(member.user_id)}
                        disabled={isLoading}
                        className="p-1 active:bg-muted rounded"
                      >
                        <Plus size={16} color="#00D54B" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>

                    {/* MVP Button (Trophy) */}
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedMVP(selectedMVP === member.user_id ? null : member.user_id)
                      }
                      disabled={isLoading}
                      className={`ml-2 p-2 rounded-lg border ${
                        selectedMVP === member.user_id
                          ? 'bg-primary/20 border-primary'
                          : 'bg-card border-border'
                      }`}
                    >
                      <Trophy
                        size={18}
                        color={selectedMVP === member.user_id ? '#00D54B' : '#A1A1AA'}
                        strokeWidth={2}
                        fill={selectedMVP === member.user_id ? '#00D54B' : 'none'}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* MVP Info */}
            {selectedMVP && (
              <View className="bg-primary/10 border border-primary rounded-lg p-3 mt-4">
                <Text className="text-primary text-xs font-semibold">
                  🏆 MVP SELECCIONADO
                </Text>
                <Text className="text-foreground text-sm mt-1">
                  {teamMembers.find((m) => m.user_id === selectedMVP)?.profile?.full_name ||
                    'Jugador'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="border-t border-border bg-card p-4 gap-2">
            <Button
              title={isLoading ? 'Guardando...' : 'GUARDAR ESTADÍSTICAS'}
              variant="primary"
              onPress={handleSaveStats}
              disabled={isLoading}
              className="w-full h-12"
            />
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={onClose}
              disabled={isLoading}
              className="w-full h-12"
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
