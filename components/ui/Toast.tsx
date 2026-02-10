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
  const scale = useRef(new Animated.Value(0.95)).current
  const progressWidth = useRef(new Animated.Value(0)).current

  const config = {
    success: {
      bg: 'bg-card',
      border: 'border-primary',
      iconBg: 'bg-primary/15',
      iconColor: '#00D54B', // primary
      progressBg: 'bg-primary',
      label: 'ÉXITO',
      icon: CheckCircle,
    },
    error: {
      bg: 'bg-card',
      border: 'border-destructive',
      iconBg: 'bg-destructive/15',
      iconColor: '#D93036', // destructive
      progressBg: 'bg-destructive',
      label: 'ERROR',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-card',
      border: 'border-accent',
      iconBg: 'bg-accent/15',
      iconColor: '#5D5FEF', // accent
      progressBg: 'bg-accent',
      label: 'INFO',
      icon: Info,
    },
  }

  const current = config[type]
  const IconComponent = current.icon

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide()
    })
  }, [opacity, translateY, scale, onHide])

  useEffect(() => {
    // Entrada suave con spring
    Animated.parallel([
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 9,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 9,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 9,
      }),
    ]).start()

    // Barra de progreso
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: false,
    }).start()

    const timer = setTimeout(() => {
      hide()
    }, 4000)

    return () => clearTimeout(timer)
  }, [hide, opacity, translateY, scale, progressWidth])

  return (
    <SafeAreaView
      className='absolute top-0 left-0 w-full z-50 items-center'
      pointerEvents='box-none'
      edges={['top']}
    >
      <View className='pt-3 w-full px-4'>
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }, { scale }],
          }}
          className='w-full'
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={hide}
            className={`
              ${current.bg} ${current.border} 
              border-2 rounded-2xl 
              shadow-2xl shadow-black/60
              overflow-hidden
            `}
          >
            {/* Gradient overlay sutil */}
            <View className='absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none' />

            <View className='flex-row items-start px-4 py-3.5 gap-3'>
              {/* Icon Container */}
              <View className={`${current.iconBg} rounded-xl p-2 flex-shrink-0`}>
                <IconComponent size={20} color={current.iconColor} strokeWidth={2.5} />
              </View>

              {/* Content */}
              <View className='flex-1 min-w-0'>
                <Text className='font-bold text-[10px] text-text-muted mb-1 tracking-widest uppercase'>
                  {current.label}
                </Text>
                <Text className='text-foreground font-medium leading-5'>{message}</Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={hide}
                className='p-1.5 rounded-lg bg-background/40 active:bg-background/60 flex-shrink-0 -mt-0.5'
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color='#A1A1AA' strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View className='h-[3px] bg-background/50 overflow-hidden'>
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
