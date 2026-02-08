import { Camera, Shield, User } from 'lucide-react-native'
import React, { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

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

  const radius = shape === 'circle' ? size / 2 : 16
  const iconSize = size * 0.45

  const showImage = uri && !error
  const FallbackIcon = fallback === 'shield' ? Shield : User

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={editable ? onEdit : undefined}
        style={({ pressed }) => [pressed && editable && styles.pressed]}
      >
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
        >
          {showImage ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode='cover'
              onError={() => setError(true)}
            />
          ) : (
            <FallbackIcon size={iconSize} color='#6B7280' strokeWidth={2} />
          )}
        </View>

        {editable && (
          <View style={styles.cameraBadge}>
            <Camera size={16} color='#000' strokeWidth={2.5} />
          </View>
        )}
      </Pressable>

      {loading && (
        <View style={styles.loadingBadge}>
          <Text style={styles.loadingText}>Actualizando...</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#39FF14', // primary
    padding: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#030712',
  },

  loadingBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(57,255,20,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#39FF14',
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
})
