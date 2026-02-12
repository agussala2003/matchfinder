import { Button } from '@/components/ui/Button'
import { AlertTriangle, Check, Navigation } from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'

interface CheckinSectionProps {
  gpsDistance: number
  setGpsDistance: (fn: (d: number) => number) => void
  checkedIn: boolean
  setCheckedIn: (checked: boolean) => void
  canManage: boolean
  setMatchState: (state: 'previa' | 'checkin' | 'postmatch') => void
  setShowWOModal: (show: boolean) => void
}

export const CheckinSection = ({
  gpsDistance,
  setGpsDistance,
  checkedIn,
  setCheckedIn,
  canManage,
  setMatchState,
  setShowWOModal,
}: CheckinSectionProps) => (
  <ScrollView
    className="flex-1"
    contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
  >
    <View
      className={`w-40 h-40 self-center rounded-full items-center justify-center mb-8 border-4 ${gpsDistance <= 100
          ? 'bg-primary/20 border-primary'
          : 'bg-card border-border'
        }`}
    >
      {checkedIn ? (
        <Check size={64} color="#00D54B" strokeWidth={3} />
      ) : (
        <Navigation size={64} color={gpsDistance <= 100 ? '#00D54B' : '#6B7280'} />
      )}
    </View>

    <Text className="text-foreground text-3xl font-bold text-center mb-3">
      {checkedIn ? '¡Ya estás listo!' : `A ${gpsDistance}m`}
    </Text>
    <Text className="text-muted-foreground text-center mb-12 px-4 leading-6">
      {checkedIn
        ? 'Esperando al resto del equipo. El partido comenzará pronto.'
        : gpsDistance <= 100
          ? 'Estás en zona. Confirma tu presencia.'
          : 'Acércate más a la sede para hacer check-in.'}
    </Text>

    {!checkedIn && (
      <Button
        title="HACER CHECK-IN"
        onPress={() => setCheckedIn(true)}
        disabled={gpsDistance > 100}
        className="w-full h-14 mb-4"
        variant="primary"
      />
    )}

    {__DEV__ && (
      <View className="flex-row gap-4 mb-8 opacity-40">
        <Button
          title="-50m"
          variant="secondary"
          onPress={() => setGpsDistance((d) => Math.max(0, d - 50))}
        />
        <Button
          title="+50m"
          variant="secondary"
          onPress={() => setGpsDistance((d) => d + 50)}
        />
      </View>
    )}

    {checkedIn && canManage && (
      <Button
        title="Terminar Partido (Demo)"
        variant="secondary"
        onPress={() => setMatchState('postmatch')}
        className="w-full mb-4"
      />
    )}

    <TouchableOpacity
      className="mt-4 flex-row items-center justify-center gap-2 bg-destructive/10 p-4 rounded-xl border border-destructive/30 active:bg-destructive/20"
      onPress={() => setShowWOModal(true)}
    >
      <AlertTriangle size={16} color="#D93036" strokeWidth={2} />
      <Text className="text-destructive text-xs font-bold uppercase">
        Reportar Ausencia (W.O.)
      </Text>
    </TouchableOpacity>
  </ScrollView>
)