import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { TeamStats, statsService } from '@/services/stats.service'
import { BarChart3, Shield, Target, Trophy, Users, X } from 'lucide-react-native'
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

interface TeamStatsModalProps {
    visible: boolean
    onClose: () => void
    teamId: string
}

export function TeamStatsModal({ visible, onClose, teamId }: TeamStatsModalProps) {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<TeamStats | null>(null)

    const loadStats = useCallback(async () => {
        setLoading(true)
        try {
            const result = await statsService.getTeamStats(teamId)
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
    }, [teamId, showToast])

    useEffect(() => {
        if (visible && teamId) {
            loadStats()
        }
    }, [visible, teamId, loadStats])

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

    const getRankingText = (elo: number) => {
        if (elo >= 1600) return { text: 'Élite', color: '#8B5CF6' }
        if (elo >= 1400) return { text: 'Avanzado', color: '#F59E0B' }
        if (elo >= 1200) return { text: 'Intermedio', color: '#10B981' }
        return { text: 'Principiante', color: '#6B7280' }
    }

    return (
        <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
            <View className='flex-1 bg-black/80 justify-end'>
                <View className='bg-modal rounded-t-3xl border-t-2 border-transparent overflow-hidden h-[85%]'>
                    {/* Header */}
                    <View className='flex-row items-center justify-between px-6 py-4 border-b border-border'>
                        <View className='flex-row items-center gap-3'>
                            <View className='bg-primary/20 p-2 rounded-lg'>
                                <Users size={24} color='#00D54B' strokeWidth={2} />
                            </View>
                            <Text className='text-foreground font-title text-xl'>Estadísticas del Equipo</Text>
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
                            {/* Team Info */}
                            <View className='bg-card p-6 rounded-xl border border-border mb-6'>
                                <View className='flex-row items-center gap-4'>
                                    <View className='w-16 h-16 bg-secondary rounded-full overflow-hidden border border-border items-center justify-center'>
                                        {stats.logoUrl ? (
                                            <Image
                                                source={{ uri: stats.logoUrl }}
                                                className='w-full h-full'
                                                resizeMode='cover'
                                            />
                                        ) : (
                                            <Text className='text-muted-foreground font-bold text-2xl'>
                                                {stats.teamName[0] || 'E'}
                                            </Text>
                                        )}
                                    </View>
                                    <View className='flex-1'>
                                        <Text className='text-foreground font-bold text-lg'>
                                            {stats.teamName}
                                        </Text>
                                        <Text className='text-muted-foreground text-sm'>
                                            {stats.category} • {stats.homeZone}
                                        </Text>
                                        <View className='flex-row items-center gap-1 mt-2'>
                                            <Shield size={14} color={getRankingText(stats.eloRating).color} strokeWidth={2} />
                                            <Text 
                                                className='text-sm font-semibold'
                                                style={{ color: getRankingText(stats.eloRating).color }}
                                            >
                                                {stats.eloRating} ELO • {getRankingText(stats.eloRating).text}
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
                                    icon={BarChart3}
                                    title='Efectividad'
                                    value={`${stats.winRate}%`}
                                    subtitle='victorias'
                                    color='#10B981'
                                />
                            </View>

                            {/* Goals Stats */}
                            <View className='flex-row gap-3 mb-6'>
                                <StatCard
                                    icon={Target}
                                    title='Goles A Favor'
                                    value={stats.goalsFor}
                                    color='#00D54B'
                                />
                                <StatCard
                                    icon={Target}
                                    title='Goles En Contra'
                                    value={stats.goalsAgainst}
                                    color='#EF4444'
                                />
                            </View>

                            {/* Win/Loss Record */}
                            <View className='bg-card p-6 rounded-xl border border-border mb-6'>
                                <Text className='text-foreground font-bold text-lg mb-4'>
                                    Historial de Partidos
                                </Text>
                                
                                <View className='space-y-4'>
                                    {/* Victorias */}
                                    <View className='flex-row items-center justify-between'>
                                        <View className='flex-row items-center gap-3'>
                                            <View className='w-4 h-4 bg-green-500 rounded-full' />
                                            <Text className='text-foreground'>Victorias</Text>
                                        </View>
                                        <Text className='text-foreground font-bold'>
                                            {stats.wins}
                                        </Text>
                                    </View>

                                    {/* Empates */}
                                    <View className='flex-row items-center justify-between'>
                                        <View className='flex-row items-center gap-3'>
                                            <View className='w-4 h-4 bg-yellow-500 rounded-full' />
                                            <Text className='text-foreground'>Empates</Text>
                                        </View>
                                        <Text className='text-foreground font-bold'>
                                            {stats.draws}
                                        </Text>
                                    </View>

                                    {/* Derrotas */}
                                    <View className='flex-row items-center justify-between'>
                                        <View className='flex-row items-center gap-3'>
                                            <View className='w-4 h-4 bg-red-500 rounded-full' />
                                            <Text className='text-foreground'>Derrotas</Text>
                                        </View>
                                        <Text className='text-foreground font-bold'>
                                            {stats.losses}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Goal Performance */}
                            <View className='bg-card p-6 rounded-xl border border-border mb-6'>
                                <Text className='text-foreground font-bold text-lg mb-4'>
                                    Rendimiento Goleador
                                </Text>
                                
                                <View className='flex-row justify-between items-center mb-3'>
                                    <Text className='text-muted-foreground'>Diferencia de gol</Text>
                                    <Text 
                                        className={`font-bold text-lg ${
                                            stats.goalDifference >= 0 ? 'text-green-500' : 'text-red-500'
                                        }`}
                                    >
                                        {stats.goalDifference >= 0 ? '+' : ''}{stats.goalDifference}
                                    </Text>
                                </View>

                                {stats.totalMatches > 0 && (
                                    <>
                                        <View className='flex-row justify-between items-center mb-3'>
                                            <Text className='text-muted-foreground'>Goles por partido</Text>
                                            <Text className='text-foreground font-bold text-lg'>
                                                {(stats.goalsFor / stats.totalMatches).toFixed(2)}
                                            </Text>
                                        </View>

                                        <View className='flex-row justify-between items-center'>
                                            <Text className='text-muted-foreground'>Goles recibidos por partido</Text>
                                            <Text className='text-foreground font-bold text-lg'>
                                                {(stats.goalsAgainst / stats.totalMatches).toFixed(2)}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* ELO Progress */}
                            <View className='bg-card p-6 rounded-xl border border-border'>
                                <Text className='text-foreground font-bold text-lg mb-4'>
                                    Rating ELO
                                </Text>
                                
                                <View className='items-center'>
                                    <Text 
                                        className='text-4xl font-bold mb-2'
                                        style={{ color: getRankingText(stats.eloRating).color }}
                                    >
                                        {stats.eloRating}
                                    </Text>
                                    <Text 
                                        className='text-lg font-semibold mb-4'
                                        style={{ color: getRankingText(stats.eloRating).color }}
                                    >
                                        {getRankingText(stats.eloRating).text}
                                    </Text>
                                    
                                    {/* ELO Progress Bar */}
                                    <View className='w-full bg-secondary h-2 rounded-full overflow-hidden'>
                                        <View 
                                            className='h-full rounded-full'
                                            style={{
                                                backgroundColor: getRankingText(stats.eloRating).color,
                                                width: `${Math.min((stats.eloRating - 800) / 1200 * 100, 100)}%`
                                            }}
                                        />
                                    </View>
                                    <View className='flex-row justify-between w-full mt-2'>
                                        <Text className='text-xs text-muted-foreground'>800</Text>
                                        <Text className='text-xs text-muted-foreground'>2000</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    ) : (
                        <View className='flex-1 items-center justify-center px-6'>
                            <Text className='text-foreground text-lg font-bold mb-2'>Sin datos</Text>
                            <Text className='text-muted-foreground text-center'>
                                No se encontraron estadísticas para este equipo
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