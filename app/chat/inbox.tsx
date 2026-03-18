import { ChatInbox } from '@/components/chat/ChatInbox'
import { Stack } from 'expo-router'
import React from 'react'

export default function ChatInboxScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Mensajes',
          headerStyle: { backgroundColor: '#1A1A21' },
          headerTintColor: '#FBFBFB',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
          headerShadowVisible: false,
        }}
      />
      <ChatInbox />
    </>
  )
}