import { Plus, Users } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface EmptyStateProps {
  onCreateMatch?: () => void
  type: 'noMatches' | 'noLive' | 'noPending' | 'noFinished'
}

export const EmptyState = ({ onCreateMatch, type }: EmptyStateProps) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'noMatches':
        return {
          icon: <Users size={48} color="#6B7280" strokeWidth={1.5} />,
          title: 'No tienes partidos aún',
          description: 'Crea desafíos para organizar tus primeros partidos',
          showCreateButton: true,
        }
      case 'noLive':
        return {
          icon: <Users size={40} color="#6B7280" strokeWidth={1.5} />,
          title: 'No hay partidos en vivo',
          description: 'Los partidos confirmados aparecerán aquí',
          showCreateButton: false,
        }
      case 'noPending':
        return {
          icon: <Users size={40} color="#6B7280" strokeWidth={1.5} />,
          title: 'No hay partidos pendientes',
          description: 'Los desafíos sin confirmar aparecerán aquí',
          showCreateButton: false,
        }
      case 'noFinished':
        return {
          icon: <Users size={40} color="#6B7280" strokeWidth={1.5} />,
          title: 'No hay partidos finalizados',
          description: 'Tu historial de partidos aparecerá aquí',
          showCreateButton: false,
        }
      default:
        return {
          icon: <Users size={48} color="#6B7280" strokeWidth={1.5} />,
          title: 'No hay partidos',
          description: 'Crea desafíos para organizar partidos',
          showCreateButton: true,
        }
    }
  }

  const content = getEmptyStateContent()

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="items-center gap-4">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center">
          {content.icon}
        </View>
        
        <View className="items-center gap-2">
          <Text className="text-text-main text-lg font-bold text-center">
            {content.title}
          </Text>
          <Text className="text-text-muted text-sm text-center max-w-64">
            {content.description}
          </Text>
        </View>

        {content.showCreateButton && onCreateMatch && (
          <TouchableOpacity
            onPress={onCreateMatch}
            className="bg-primary rounded-xl px-6 py-3 flex-row items-center gap-2 mt-4"
          >
            <Plus size={20} color="white" strokeWidth={2} />
            <Text className="text-white font-semibold">Crear Desafío</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}