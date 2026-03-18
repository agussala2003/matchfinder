import LottieView from 'lottie-react-native'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'

interface SoccerLoaderProps {
  visible: boolean
  message?: string
  blocking?: boolean
}

export function SoccerLoader({
  visible,
  message = 'Cargando partido...',
  blocking = true,
}: SoccerLoaderProps) {
  const [lottieFailed, setLottieFailed] = useState(false)

  const useLottie = useMemo(() => Platform.OS !== 'web' && !lottieFailed, [lottieFailed])

  if (!visible) return null

  return (
    <View
      pointerEvents={blocking ? 'auto' : 'none'}
      className='absolute inset-0 z-[999] items-center justify-center'
      style={{ backgroundColor: blocking ? 'rgba(18,18,23,0.72)' : 'rgba(18,18,23,0.35)' }}
    >
      <View className='items-center rounded-3xl border border-border bg-card/95 px-6 py-6'>
        {useLottie ? (
          <LottieView
            source={require('../../assets/animations/soccer-loader.json')}
            autoPlay={true}
            loop={true}
            style={{ width: 170, height: 170 }}
            onAnimationFailure={() => setLottieFailed(true)}
          />
        ) : (
          <View className='h-[170px] w-[170px] items-center justify-center'>
            <ActivityIndicator size='large' color='#00D54B' />
          </View>
        )}

        <Text className='mt-1 text-center font-body text-sm text-foreground'>{message}</Text>
      </View>
    </View>
  )
}
