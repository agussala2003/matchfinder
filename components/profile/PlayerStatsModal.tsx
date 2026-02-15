import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { PlayerStats, statsService } from '@/services/stats.service'
import { Award, Target, TrendingUp, Trophy, User, X } from 'lucide-react-native'
import React, { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

interface PlayerStatsModalProps {
    visible: boolean
    onClose: () => void
    userId: string
}

export function PlayerStatsModal({ visible, onClose, userId }: PlayerStatsModalProps) {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<PlayerStats | null>(null)

    const loadStats = useCallback(async () => {
        setLoading(true)
        try {
            const result = await statsService.getPlayerStats(userId)
            if (result.success && result.data) {
                setStats(result.data)
            } else {
                showToast('Error al cargar estadísticas', 'error')
            }
        } catch {
            showToast('Error al cargar estadísticas', 'error')
        } finally {
            setLoading(false)
        }
    }, [userId, showToast])

    useEffect(() => {
        if (visible && userId) {
            loadStats()
        }
    }, [visible, userId, loadStats])

    const StatCard = ({ 
        icon: Icon, 
        title, 
        value, 
        subtitle, 
        color = '#00D54B' 
    }: {
        icon: any
        title: string
        value: string | number
        subtitle?: string
        color?: string
    }) => (
        <View className='bg-card p-4 rounded-xl border border-border flex-1'>
            <View className='flex-row items-center gap-3'>
                <View 
                    className='w-12 h-12 rounded-xl items-center justify-center'
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon size={24} color={color} strokeWidth={2} />
                </View>
                <View className='flex-1'>
                    <Text className='text-muted-foreground text-xs uppercase font-semibold tracking-wider'>
                        {title}
                    </Text>
                    <Text className='text-foreground text-xl font-bold mt-1'>
                        {value}
                    </Text>
                    {subtitle && (
                        <Text className='text-muted-foreground text-xs mt-1'>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    )

    return (
        <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
            <View className='flex-1 bg-black/80 justify-end'>
                <View className='bg-modal rounded-t-3xl border-t-2 border-transparent overflow-hidden h-[85%]'>
                    {/* Header */}
                    <View className='flex-row items-center justify-between px-6 py-4 border-b border-border'>
                        <View className='flex-row items-center gap-3'>
                            <View className='bg-primary/20 p-2 rounded-lg'>
                                <User size={24} color='#00D54B' strokeWidth={2} />
                            </View>
                            <Text className='text-foreground font-title text-xl'>Estadísticas</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className='p-2 -mr-2'>
                            <X size={24} color='#A1A1AA' strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View className='flex-1 items-center justify-center'>
                            <ActivityIndicator size='large' color='#00D54B' />
                            <Text className='text-muted-foreground mt-4'>Cargando estadísticas...</Text>
                        </View>
                    ) : stats ? (
                        <ScrollView className='flex-1' contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                            {/* Player Info */}
                            <View className='bg-card p-6 rounded-xl border border-border mb-6'>
                                <View className='flex-row items-center gap-4'>
                                    <View className='w-16 h-16 bg-secondary rounded-full overflow-hidden border border-border items-center justify-center'>
                                        {stats.avatarUrl ? (
                                            <Image
                                                source={{ uri: stats.avatarUrl }}
                                                className='w-full h-full'
                                                resizeMode='cover'
                                            />
                                        ) : (
                                            <Text className='text-muted-foreground font-bold text-2xl'>
                                                {stats.fullName[0] || 'J'}
                                            </Text>
                                        )}
                                    </View>
                                    <View className='flex-1'>
                                        <Text className='text-foreground font-bold text-lg'>
                                            {stats.fullName}
                                        </Text>
                                        {stats.username && (
                                            <Text className='text-muted-foreground text-sm'>
                                                @{stats.username}
                                            </Text>
                                        )}
                                        <View className='flex-row items-center gap-1 mt-2'>
                                            <TrendingUp size={14} color='#00D54B' strokeWidth={2} />
                                            <Text className='text-primary text-sm font-semibold'>
                                                {stats.reputation.toFixed(1)} puntos
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Main Stats Row */}
                            <View className='flex-row gap-3 mb-6'>
                                <StatCard
                                    icon={Trophy}
                                    title='Partidos'
                                    value={stats.totalMatches}
                                    subtitle='jugados'
                                />
                                <StatCard
                                    icon={Target}
                                    title='Goles'
                                    value={stats.totalGoals}
                                    subtitle='anotados'
                                />
                            </View>

                            {/* Performance Stats */}
                            <View className='flex-row gap-3 mb-6'>
                                <StatCard
                                    icon={Award}
                                    title='MVP'
                                    value={stats.mvpCount}
                                    subtitle='veces elegido'
                                    color='#F59E0B'
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    title='Efectividad'
                                    value={`${stats.winRate}%`}
                                    subtitle='victorias'
                                    color='#10B981'
                                />
                            </View>

                            {/* Win/Loss Breakdown */}
                            <View className='bg-card p-6 rounded-xl border border-border mb-6'>
                                <Text className='text-foreground font-bold text-lg mb-4'>
                                    Rendimiento por Partido
                                </Text>
                                
                                <View className='space-y-4'>
                                    {/* Victorias */}
                                    <View className='flex-row items-center justify-between'>
                                        <View className='flex-row items-center gap-3'>
                                            <View className='w-4 h-4 bg-green-500 rounded-full' />
                                            <Text className='text-foreground'>Victorias</Text>
                                        </View>
                                        <Text className='text-foreground font-bold'>
                                            {stats.winRate.toFixed(1)}%
                                        </Text>
                                    </View>

                                    {/* Empates */}
                                    <View className='flex-row items-center justify-between'>
                                        <View className='flex-row items-center gap-3'>
                                            <View className='w-4 h-4 bg-yellow-500 rounded-full' />
                                            <Text className='text-foreground'>Empates</Text>
                                        </View>
                                        <Text className='text-foreground font-bold'>
                                            {stats.drawRate.toFixed(1)}%
                                        </Text>
                                    </View>

                                    {/* Derrotas */}
                                    <View className='flex-row items-center justify-between'>
                                        <View className='flex-row items-center gap-3'>
                                            <View className='w-4 h-4 bg-red-500 rounded-full' />
                                            <Text className='text-foreground'>Derrotas</Text>
                                        </View>
                                        <Text className='text-foreground font-bold'>
                                            {stats.lossRate.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Additional Metrics */}
                            {stats.totalMatches > 0 && (
                                <View className='bg-card p-6 rounded-xl border border-border'>
                                    <Text className='text-foreground font-bold text-lg mb-4'>
                                        Promedios
                                    </Text>
                                    <View className='flex-row justify-between items-center'>
                                        <Text className='text-muted-foreground'>Goles por partido</Text>
                                        <Text className='text-foreground font-bold text-lg'>
                                            {(stats.totalGoals / stats.totalMatches).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View className='flex-row justify-between items-center mt-3'>
                                        <Text className='text-muted-foreground'>% de ser MVP</Text>
                                        <Text className='text-foreground font-bold text-lg'>
                                            {((stats.mvpCount / stats.totalMatches) * 100).toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    ) : (
                        <View className='flex-1 items-center justify-center px-6'>
                            <Text className='text-foreground text-lg font-bold mb-2'>Sin datos</Text>
                            <Text className='text-muted-foreground text-center'>
                                No se encontraron estadísticas para este jugador
                            </Text>
                        </View>
                    )}

                    {/* Footer */}
                    <View className='px-6 py-4 border-t border-border'>
                        <Button 
                            title='Cerrar' 
                            variant='secondary' 
                            onPress={onClose}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    )
}