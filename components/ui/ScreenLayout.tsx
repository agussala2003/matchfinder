import { StatusBar } from 'expo-status-bar'
import React from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  ViewProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface ScreenLayoutProps extends ViewProps {
  children: React.ReactNode
  scrollable?: boolean
  withPadding?: boolean
  loading?: boolean
  keyboardBehavior?: 'padding' | 'height' | 'position'
}

export function ScreenLayout({
  children,
  scrollable = false,
  withPadding = true,
  loading = false,
  keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height',
  className,
  ...props
}: ScreenLayoutProps) {
  if (loading) {
    return (
      <View className='flex-1 bg-dark items-center justify-center'>
        <ActivityIndicator size='large' color='#39FF14' />
      </View>
    )
  }

  const content = (
    <View className={`flex-1 ${withPadding ? 'px-6' : ''} ${className || ''}`} {...props}>
      {children}
    </View>
  )

  return (
    <View className='flex-1 bg-dark'>
      <StatusBar style='light' />
      <SafeAreaView edges={['top', 'bottom']} className='flex-1'>
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          className='flex-1'
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {scrollable ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              keyboardShouldPersistTaps='handled'
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
