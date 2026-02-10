import { Camera, Shield, User } from 'lucide-react-native'
import React, { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

interface AvatarProps {
  uri?: string
  size?: number
  shape?: 'square' | 'circle'
  fallback?: 'user' | 'shield'
  editable?: boolean
  loading?: boolean
  onEdit?: () => void
}

export function Avatar({
  uri,
  size = 112,
  shape = 'square',
  fallback = 'shield',
  editable = false,
  loading = false,
  onEdit,
}: AvatarProps) {
  const [error, setError] = useState(false)

  // Calculamos el radio dinámicamente según el tamaño
  const radius = shape === 'circle' ? size / 2 : 16
  const iconSize = size * 0.45

  const showImage = uri && !error
  const FallbackIcon = fallback === 'shield' ? Shield : User

  return (
    <View className='items-center'>
      <Pressable
        onPress={editable ? onEdit : undefined}
        // NativeWind maneja los estados 'active' para el feedback visual
        className='active:opacity-85 active:scale-95'
      >
        {/* Contenedor del Avatar */}
        <View
          className='bg-secondary border-2 border-border items-center justify-center overflow-hidden'
          style={{
            width: size,
            height: size,
            borderRadius: radius,
          }}
        >
          {showImage ? (
            <Image
              source={{ uri }}
              className='w-full h-full'
              resizeMode='cover'
              onError={() => setError(true)}
            />
          ) : (
            // Usamos el color 'text-muted' (#A1A1AA) definido en tu config
            <FallbackIcon size={iconSize} color='#A1A1AA' strokeWidth={2} />
          )}
        </View>

        {/* Badge de Cámara (Solo si es editable) */}
        {editable && (
          <View className='absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-full border-2 border-background'>
            {/* El color del icono es el background (#121217) para contraste con el verde */}
            <Camera size={16} color='#121217' strokeWidth={2.5} />
          </View>
        )}
      </Pressable>

      {/* Badge de Carga */}
      {loading && (
        <View className='mt-2 bg-primary/10 px-3 py-1 rounded-full'>
          <Text className='text-xs font-semibold text-primary'>Actualizando...</Text>
        </View>
      )}
    </View>
  )
}