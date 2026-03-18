import { supabase } from '@/lib/supabase'
import { Json, TablesInsert } from '@/types/supabase'

export interface Notification {
    id: string
    user_id: string
    type: 'TEAM_INVITE' | 'MATCH_ALERT' | 'MATCH_RESULT' | 'SYSTEM'
    title: string
    message: string
    data?: Json
    is_read: boolean
    created_at: string
}

type NotificationInsertInput = Omit<Notification, 'id' | 'created_at' | 'is_read'>

export const notificationsService = {
    async getUserNotifications(userId: string) {
        return await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
    },

    async markAsRead(notificationId: string) {
        return await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
    },

    async markAllAsRead(userId: string) {
        return await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)
    },

    async createNotification(notification: NotificationInsertInput) {
        const payload: TablesInsert<'notifications'> = {
            user_id: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data ?? null,
            is_read: false,
        }

        return await supabase
            .from('notifications')
            .insert(payload)
    },

    // Realtime subscription helper could be added here
}
