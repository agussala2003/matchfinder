import { StatusBar } from 'expo-status-bar'
import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  View,
  ViewProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface ScreenLayoutProps extends ViewProps {
  children: React.ReactNode
  scrollable?: boolean
  withPadding?: boolean
  className?: string
  loading?: boolean // Por si quieres agregar un spinner global luego
}

export const ScreenLayout = ({
  children,
  scrollable = false,
  withPadding = false,
  className,
  loading = false,
  ...props
}: ScreenLayoutProps) => {
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height'

  // Contenido común
  const content = (
    <View className={`flex-1 ${withPadding ? 'px-6' : ''} ${className || ''}`} {...props}>
      {children}
    </View>
  )

  return (
    <View className='flex-1 bg-dark'>
      <StatusBar style='light' />

      {/* 1. edges={['top']}: Solo protegemos arriba (Notch). 
            Abajo dejamos que el contenido fluya para evitar el borde negro cortado,
            y lo manejamos con padding en el ScrollView.
      */}
      <SafeAreaView edges={['top', 'left', 'right']} className='flex-1'>
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          className='flex-1'
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {scrollable ? (
            <ScrollView
              // 2. 'flex-1' AQUÍ es la clave para que ocupe todo el alto disponible
              className={`flex-1 ${className || ''}`}
              contentContainerStyle={{
                flexGrow: 1,
                // 3. Movemos el padding aquí para que la scrollbar no se corte
                paddingHorizontal: withPadding ? 24 : 0,
                paddingBottom: 20, // Espacio extra abajo para gestos
              }}
              showsVerticalScrollIndicator={false}
              {...(props as ScrollViewProps)}
            >
              {children}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
