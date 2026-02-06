import { AlertCircle, CheckCircle, Info } from 'lucide-react-native'
import React, { useCallback, useEffect, useRef } from 'react'
import { Animated, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onHide: () => void
}

export const Toast = ({ message, type, onHide }: ToastProps) => {
  const opacity = useRef(new Animated.Value(0)).current

  const config = {
    success: {
      bg: 'bg-green-950/95',
      border: 'border-primary',
      text: 'text-primary',
      icon: <CheckCircle color='#39FF14' size={24} />,
    },
    error: {
      bg: 'bg-red-950/95',
      border: 'border-red-500',
      text: 'text-red-400',
      icon: <AlertCircle color='#EF4444' size={24} />,
    },
    info: {
      bg: 'bg-blue-950/95',
      border: 'border-blue-500',
      text: 'text-blue-400',
      icon: <Info color='#3B82F6' size={24} />,
    },
  }

  const current = config[type]

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onHide()
    })
  }, [opacity, onHide])

  useEffect(() => {
    Animated.spring(opacity, {
      toValue: 1,
      useNativeDriver: true,
      speed: 10, // Rápido
    }).start()

    const timer = setTimeout(() => {
      hide()
    }, 3000)

    return () => clearTimeout(timer)
  }, [hide, opacity])

  return (
    <SafeAreaView
      className='absolute top-0 left-0 w-full z-50 items-center'
      pointerEvents='box-none'
    >
      {/* Contenedor del ancho del toast (91%) */}
      <View className='pt-4 w-11/12 max-w-lg'>
        <Animated.View
          style={{
            opacity,
            transform: [
              {
                translateY: opacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
            ],
          }}
          className='w-full'
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hide}
            className={`${current.bg} ${current.border} border-2 flex-row items-center p-4 rounded-2xl shadow-xl shadow-black/60`}
          >
            <View className='mr-3'>{current.icon}</View>
            <View className='flex-1'>
              <Text className={`font-title uppercase text-xs ${current.text} mb-1 tracking-wider`}>
                {type === 'error' ? 'ERROR' : type === 'success' ? 'ÉXITO' : 'INFO'}
              </Text>
              <Text className='text-white font-body text-sm leading-5'>{message}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
