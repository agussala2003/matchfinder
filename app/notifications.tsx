import { NotificationsList } from '@/components/notifications/NotificationsList'
import { authService } from '@/services/auth.service'
import { router, Stack } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { View } from 'react-native'

export default function NotificationsScreen() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const sessionRes = await authService.getSession()
      const id = sessionRes.data?.user?.id ?? null
      if (mounted) {
        setUserId(id)
      }
    }

    loadUser()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <Stack.Screen options={{ title: 'Notificaciones', headerShown: true }} />
      <View className='flex-1 bg-background pt-4'>
        {userId ? (
          <NotificationsList
            userId={userId}
            onOpenMatch={(matchId) => router.push(`/match/${matchId}`)}
          />
        ) : null}
      </View>
    </>
  )
}
