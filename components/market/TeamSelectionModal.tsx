import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { teamsService } from '@/services/teams.service'
import { Team } from '@/types/teams'
import { X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface TeamSelectionModalProps {
    visible: boolean
    onClose: () => void
    onSelectTeam: (team: Team) => void
    userId: string
}

export function TeamSelectionModal({ visible, onClose, onSelectTeam, userId }: TeamSelectionModalProps) {
    const { showToast } = useToast()
    const insets = useSafeAreaInsets()

    const [loading, setLoading] = useState(false)
    const [managedTeams, setManagedTeams] = useState<Team[]>([])

    useEffect(() => {
        if (visible && userId) {
            loadManagedTeams()
        }
    }, [visible, userId])

    async function loadManagedTeams() {
        setLoading(true)
        try {
            const res = await teamsService.getUserManagedTeams(userId)
            if (res.success && res.data) {
                setManagedTeams(res.data)
            } else {
                showToast('Error al cargar equipos', 'error')
            }
        } catch (error) {
            showToast('Error inesperado', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectTeam = (team: Team) => {
        onSelectTeam(team)
        onClose()
    }

    return (
        <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
            <View className='flex-1 bg-black/80 justify-end'>
                <View 
                    className='bg-modal rounded-t-3xl border-t-2 border-border overflow-hidden max-h-[70%]'
                    style={{ paddingBottom: Math.max(insets.bottom, 20) }}
                >
                    {/* Header */}
                    <View className='flex-row items-center justify-between px-6 py-4 border-b border-border'>
                        <Text className='text-foreground font-title text-xl'>Seleccionar Equipo</Text>
                        <TouchableOpacity onPress={onClose} className='p-2 -mr-2'>
                            <X size={24} color='#A1A1AA' strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <View className='px-6 py-2'>
                        <Text className='text-muted-foreground text-sm'>
                            ¿Desde qué equipo quieres contactar a este jugador?
                        </Text>
                    </View>

                    {loading ? (
                        <View className='flex-1 items-center justify-center py-12'>
                            <ActivityIndicator size='large' color='#00D54B' />
                            <Text className='text-muted-foreground mt-4'>Cargando equipos...</Text>
                        </View>
                    ) : (
                        <ScrollView className='flex-1' contentContainerStyle={{ padding: 24, paddingTop: 16 }}>
                            {managedTeams.length === 0 ? (
                                <View className='items-center py-12'>
                                    <Text className='text-muted-foreground text-center'>
                                        No administras ningún equipo.
                                        {'\n'}
                                        Solo los capitanes pueden contactar jugadores.
                                    </Text>
                                </View>
                            ) : (
                                <View className='gap-4'>
                                    {managedTeams.map((team) => (
                                        <TouchableOpacity
                                            key={team.id}
                                            onPress={() => handleSelectTeam(team)}
                                            className='bg-card border border-border rounded-2xl p-4 flex-row items-center gap-4 active:bg-secondary/30'
                                        >
                                            {/* Team Logo */}
                                            <View className='w-12 h-12 bg-secondary rounded-full overflow-hidden border border-border items-center justify-center'>
                                                {team.logo_url ? (
                                                    <Image
                                                        source={{ uri: team.logo_url }}
                                                        className='w-full h-full'
                                                        resizeMode='cover'
                                                    />
                                                ) : (
                                                    <Text className='text-muted-foreground font-bold text-lg'>
                                                        {team.name[0]}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Team Info */}
                                            <View className='flex-1'>
                                                <Text className='text-foreground font-bold text-base' numberOfLines={1}>
                                                    {team.name}
                                                </Text>
                                                <Text className='text-muted-foreground text-sm'>
                                                    {team.category} • {team.home_zone}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    )}

                    {/* Footer */}
                    <View className='px-6 py-4 border-t border-border'>
                        <Button title='Cancelar' variant='secondary' onPress={onClose} />
                    </View>
                </View>
            </View>
        </Modal>
    )
}