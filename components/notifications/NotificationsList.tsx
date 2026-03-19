import { Notification, notificationsService } from '@/services/notifications.service'
import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native'

interface NotificationsListProps {
  userId: string
  onOpenMatch: (matchId: string) => void
}

function extractMatchId(data: Notification['data']): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const candidate = (data as Record<string, unknown>).matchId
  return typeof candidate === 'string' ? candidate : null
}

export function NotificationsList({ userId, onOpenMatch }: NotificationsListProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const { data, error } = await notificationsService.getUserNotifications(userId)
      if (error) throw error

      setNotifications((data ?? []) as Notification[])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  React.useEffect(() => {
    if (!userId) return
    loadNotifications()
  }, [userId, loadNotifications])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  async function handlePressNotification(item: Notification) {
    if (!item.is_read) {
      await notificationsService.markAsRead(item.id)
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
    }

    if (item.type === 'MATCH_RESULT') {
      const matchId = extractMatchId(item.data)
      if (matchId) {
        onOpenMatch(matchId)
      }
    }
  }

  if (loading) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator color='#00D54B' size='large' />
        <Text className='mt-2 text-sm text-muted-foreground'>Cargando notificaciones...</Text>
      </View>
    )
  }

  return (
    <View className='flex-1'>
      <View className='mb-3 px-4'>
        <Text className='font-title text-2xl text-foreground'>Notificaciones</Text>
        <Text className='mt-1 text-xs text-muted-foreground'>
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al dia'}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => loadNotifications(true)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <View className='mt-10 items-center'>
            <Text className='font-semibold text-foreground'>No hay notificaciones</Text>
            <Text className='mt-1 text-xs text-muted-foreground'>
              Cuando haya actividad, la vas a ver aca.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const matchId = item.type === 'MATCH_RESULT' ? extractMatchId(item.data) : null
          return (
            <TouchableOpacity
              onPress={() => handlePressNotification(item)}
              activeOpacity={0.85}
              className={`mb-2 rounded-2xl border p-4 ${
                item.is_read ? 'border-border bg-card' : 'border-primary/40 bg-primary/10'
              }`}
            >
              <View className='flex-row items-start justify-between'>
                <Text className='flex-1 pr-2 font-semibold text-foreground'>{item.title}</Text>
                {!item.is_read && <View className='mt-1 h-2 w-2 rounded-full bg-primary' />}
              </View>

              <Text className='mt-1 text-sm text-muted-foreground'>{item.message}</Text>

              {matchId && (
                <Text className='mt-2 text-xs font-semibold text-primary'>
                  Tocar para abrir el partido y confirmar
                </Text>
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}
