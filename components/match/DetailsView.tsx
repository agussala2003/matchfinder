import { Button } from '@/components/ui/Button'
import { Calendar, CheckCircle2, Pencil, X } from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { DetailRow } from './DetailRow'

interface DetailsViewProps {
  match: {
    status: string
    is_friendly: boolean
    venue?: {
      name: string
    }
  }
  canManage: boolean
  canCancelMatch: () => boolean
  onEditMatch: () => void
  onCancelMatch: () => void
}

export const DetailsView = ({
  match,
  canManage,
  canCancelMatch,
  onEditMatch,
  onCancelMatch,
}: DetailsViewProps) => (
  <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
    {match.status === 'CONFIRMED' ? (
      <>
        <View className="bg-card rounded-xl border border-border p-4 gap-2">
          <DetailRow
            label="Tipo"
            value={match.is_friendly ? 'Amistoso' : 'Por los Puntos'}
            highlight
          />
          <DetailRow label="Modalidad" value="Fútbol 5" />
          <DetailRow label="Duración" value="60 minutos" />
          {match.venue?.name && (
            <DetailRow label="Sede" value={match.venue.name} />
          )}
        </View>

        <View className="bg-card rounded-xl border border-border p-4 mt-4">
          <View className="flex-row justify-between items-center mb-4 border-b border-border pb-2">
            <Text className="text-foreground font-bold">Estado de Cancha</Text>
            <Text className="text-primary text-xs font-bold uppercase">Reservada</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-lg items-center justify-center bg-primary/20">
              <CheckCircle2
                size={22}
                color="#00D54B"
                strokeWidth={2}
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-bold">Reserva de Cancha</Text>
              <Text className="text-muted-foreground text-xs mt-0.5">
                Confirmada
              </Text>
            </View>
          </View>
        </View>

        {canManage && (
          <View className="gap-3 mt-6">
            <Button 
              title="Gestionar Reserva / Cambiar Detalles"
              variant="secondary"
              icon={<Pencil size={18} color="#FBFBFB" />}
              onPress={onEditMatch}
            />
            {canCancelMatch() && (
              <Button 
                title="Cancelar Partido (24hs mínimo)"
                variant="secondary"
                icon={<X size={18} color="#FBFBFB" />}
                onPress={onCancelMatch}
              />
            )}
          </View>
        )}
      </>
    ) : (
      <View className="flex-1 items-center justify-center py-20">
        <View className="w-16 h-16 bg-card rounded-2xl items-center justify-center mb-4 border border-border">
          <Calendar size={32} color="#A1A1AA" strokeWidth={2} />
        </View>
        <Text className="text-foreground font-bold text-lg mb-2 text-center">
          Pendiente de Confirmación
        </Text>
        <Text className="text-muted-foreground text-center text-sm leading-5 px-6">
          Los detalles del partido aparecerán una vez que se confirme la fecha y hora
        </Text>
      </View>
    )}
  </ScrollView>
)