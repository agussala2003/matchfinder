import { AlertCircle, CheckCircle, Info, X } from 'lucide-react-native'
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
  const translateY = useRef(new Animated.Value(-50)).current
  const progressWidth = useRef(new Animated.Value(0)).current // Nueva animación sin useNativeDriver

  const config = {
    success: {
      bg: 'bg-green-900/95',
      border: 'border-primary',
      iconBg: 'bg-primary/20',
      text: 'text-primary',
      progressBg: 'bg-primary',
      label: 'ÉXITO',
      icon: CheckCircle,
      iconColor: '#39FF14',
    },
    error: {
      bg: 'bg-red-900/95',
      border: 'border-red-500',
      iconBg: 'bg-red-500/20',
      text: 'text-red-400',
      progressBg: 'bg-red-500',
      label: 'ERROR',
      icon: AlertCircle,
      iconColor: '#F87171',
    },
    info: {
      bg: 'bg-blue-900/95',
      border: 'border-blue-500',
      iconBg: 'bg-blue-500/20',
      text: 'text-blue-400',
      progressBg: 'bg-blue-500',
      label: 'INFORMACIÓN',
      icon: Info,
      iconColor: '#60A5FA',
    },
  }

  const current = config[type]
  const IconComponent = current.icon

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide()
    })
  }, [opacity, translateY, onHide])

  useEffect(() => {
    // Animaciones de entrada (con useNativeDriver)
    Animated.parallel([
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start()

    // Animación de la barra de progreso (SIN useNativeDriver porque anima width)
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 4000, // Mismo tiempo que el timeout
      useNativeDriver: false, // IMPORTANTE: false para width
    }).start()

    const timer = setTimeout(() => {
      hide()
    }, 4000)

    return () => clearTimeout(timer)
  }, [hide, opacity, translateY, progressWidth])

  return (
    <SafeAreaView
      className='absolute top-0 left-0 w-full z-50 items-center'
      pointerEvents='box-none'
      edges={['top']}
    >
      <View className='pt-2 w-11/12 max-w-lg px-4'>
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }],
          }}
          className='w-full'
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={hide}
            className={`
              ${current.bg} ${current.border} 
              border-2 rounded-2xl 
              shadow-2xl shadow-black/80
              overflow-hidden
            `}
          >
            {/* Subtle gradient overlay for depth */}
            <View className='absolute inset-0 bg-gradient-to-b from-white/5 to-transparent' />

            <View className='flex-row items-start p-4 relative'>
              {/* Icon Container */}
              <View className={`${current.iconBg} rounded-xl p-2.5 mr-3 flex-shrink-0`}>
                <IconComponent size={22} color={current.iconColor} strokeWidth={2.5} />
              </View>

              {/* Content */}
              <View className='flex-1 mr-2'>
                <Text className={`font-title text-xs ${current.text} mb-1.5 tracking-widest`}>
                  {current.label}
                </Text>
                <Text className='text-white font-medium text-sm leading-5'>{message}</Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={hide}
                className='p-1.5 rounded-lg bg-gray-800/50 active:bg-gray-700/50 flex-shrink-0'
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color='#9CA3AF' strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View className='h-1 bg-gray-800/50 overflow-hidden'>
              <Animated.View
                className={current.progressBg}
                style={{
                  height: '100%',
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
