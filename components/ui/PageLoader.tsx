import LottieView from 'lottie-react-native'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'

interface PageLoaderProps {
  visible: boolean
}

export function PageLoader({ visible }: PageLoaderProps) {
  const [lottieFailed, setLottieFailed] = useState(false)

  const useLottie = useMemo(() => Platform.OS !== 'web' && !lottieFailed, [lottieFailed])

  if (!visible) return null

  return (
    <View className='flex-1 items-center justify-center bg-background'>
      {useLottie ? (
        <LottieView
          source={require('../../assets/animations/soccer-loader.json')}
          autoPlay={true}
          loop={true}
          style={{ width: 240, height: 240 }}
          onAnimationFailure={() => setLottieFailed(true)}
        />
      ) : (
        <ActivityIndicator size='large' color='#00D54B' />
      )}
    </View>
  )
}
