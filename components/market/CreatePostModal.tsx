import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import { POSICIONES_ARGENTINAS, POSICIONES_LISTA } from '@/lib/constants'
import { authService } from '@/services/auth.service'
import { marketService } from '@/services/market.service'
import { teamsService } from '@/services/teams.service'
import { MarketPostType } from '@/types/market'
import { Team } from '@/types/teams'
import { Briefcase, User, Users, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface CreatePostModalProps {
    visible: boolean
    onClose: () => void
    onSuccess: () => void
}

const POSITIONS = POSICIONES_LISTA.map((key) => ({
    label: POSICIONES_ARGENTINAS[key],
    value: key,
}))

export function CreatePostModal({ visible, onClose, onSuccess }: CreatePostModalProps) {
    const { showToast } = useToast()
    const insets = useSafeAreaInsets()

    const [loading, setLoading] = useState(false)
    const [type, setType] = useState<MarketPostType>('PLAYER_SEEKING_TEAM')
    const [position, setPosition] = useState('ANY')
    const [description, setDescription] = useState('')
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

    const [myTeams, setMyTeams] = useState<Team[]>([])
    const [fetchingTeams, setFetchingTeams] = useState(false)

    useEffect(() => {
        if (visible) {
            loadTeams()
        }
    }, [visible])

    async function loadTeams() {
        setFetchingTeams(true)
        try {
            const session = await authService.getSession()
            if (session.data?.user) {
                // Use the new method to get teams where user is ADMIN or SUB_ADMIN
                const res = await teamsService.getUserManagedTeams(session.data.user.id)
                if (res.success && res.data) {
                    setMyTeams(res.data)
                    // Auto-select first team if internal logic requires, or just let user select
                    if (res.data.length === 1) {
                        setSelectedTeamId(res.data[0].id)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setFetchingTeams(false)
        }
    }

    const handleCreate = async () => {
        if (type === 'TEAM_SEEKING_PLAYER' && !selectedTeamId) {
            showToast('Debes seleccionar un equipo', 'error')
            return
        }

        setLoading(true)
        try {
            const session = await authService.getSession()
            if (!session.data?.user) return

            const res = await marketService.createPost({
                type,
                user_id: session.data.user.id,
                team_id: type === 'TEAM_SEEKING_PLAYER' ? selectedTeamId! : undefined,
                position_needed: position === 'ANY' ? undefined : position,
                description: description.trim() || undefined,
            })

            if (res.success) {
                showToast('Publicación creada con éxito', 'success')
                onSuccess()
                onClose()
                setDescription('')
                setType('PLAYER_SEEKING_TEAM')
                setPosition('ANY')
            } else {
                showToast(res.error || 'Error al crear publicación', 'error')
            }
        } catch (e) {
            console.error(e)
            showToast('Error inesperado', 'error')
        } finally {
            setLoading(false)
        }
    }

    const teamOptions = myTeams.map((t) => ({ label: t.name, value: t.id }))

    return (
        <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
            <View className='flex-1 bg-black/80 justify-end'>
                <View className='bg-modal rounded-t-3xl border-t-2 border-transparent overflow-hidden h-[87%] flex-1'>
                    {/* Header */}
                    <View className='flex-row items-center justify-between px-6 py-4 border-b border-border'>
                        <View className='flex-row items-center gap-3'>
                            <View className='bg-primary/20 p-2 rounded-lg'>
                                <Briefcase size={24} color='#00D54B' strokeWidth={2} />
                            </View>
                            <Text className='text-foreground font-title text-xl'>Nueva Publicación</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className='p-2 -mr-2'>
                            <X size={24} color='#A1A1AA' strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        className='flex-1'
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <ScrollView 
                            className='flex-1' 
                            contentContainerStyle={{ flexGrow: 1, padding: 24 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                        {/* Tipo de Publicación */}
                        <View className='mb-6'>
                            <Text className='text-text-muted text-xs uppercase font-semibold tracking-wide mb-2 pl-1'>
                                ¿Qué buscas?
                            </Text>

                            <View className='flex-row gap-3'>
                                <TouchableOpacity
                                    onPress={() => setType('PLAYER_SEEKING_TEAM')}
                                    className={`flex-1 p-4 rounded-xl border-2 ${type === 'PLAYER_SEEKING_TEAM'
                                        ? 'bg-primary/10 border-primary'
                                        : 'bg-card border-border'
                                        }`}
                                >
                                    <View className='items-center gap-2'>
                                        <View
                                            className={`w-12 h-12 rounded-xl items-center justify-center ${type === 'PLAYER_SEEKING_TEAM' ? 'bg-primary/20' : 'bg-secondary'
                                                }`}
                                        >
                                            <User
                                                size={24}
                                                color={type === 'PLAYER_SEEKING_TEAM' ? '#00D54B' : '#A1A1AA'}
                                                strokeWidth={2}
                                            />
                                        </View>
                                        <Text
                                            className={`text-xs font-bold text-center ${type === 'PLAYER_SEEKING_TEAM' ? 'text-primary' : 'text-muted-foreground'
                                                }`}
                                        >
                                            Busco Equipo
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setType('TEAM_SEEKING_PLAYER')}
                                    className={`flex-1 p-4 rounded-xl border-2 ${type === 'TEAM_SEEKING_PLAYER'
                                        ? 'bg-primary/10 border-primary'
                                        : 'bg-card border-border'
                                        }`}
                                >
                                    <View className='items-center gap-2'>
                                        <View
                                            className={`w-12 h-12 rounded-xl items-center justify-center ${type === 'TEAM_SEEKING_PLAYER' ? 'bg-primary/20' : 'bg-secondary'
                                                }`}
                                        >
                                            <Users
                                                size={24}
                                                color={type === 'TEAM_SEEKING_PLAYER' ? '#00D54B' : '#A1A1AA'}
                                                strokeWidth={2}
                                            />
                                        </View>
                                        <Text
                                            className={`text-xs font-bold text-center ${type === 'TEAM_SEEKING_PLAYER' ? 'text-primary' : 'text-muted-foreground'
                                                }`}
                                        >
                                            Busco Jugador
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Selector de Equipo (si aplica) */}
                        {type === 'TEAM_SEEKING_PLAYER' && (
                            <View className='mb-6'>
                                {fetchingTeams ? (
                                    <View className='h-14 items-center justify-center bg-card rounded-xl border border-border'>
                                        <ActivityIndicator color='#00D54B' />
                                    </View>
                                ) : myTeams.length > 0 ? (
                                    <Select
                                        options={teamOptions}
                                        value={selectedTeamId || ''}
                                        onChange={setSelectedTeamId}
                                        placeholder='Selecciona tu equipo'
                                        label='Equipo'
                                    />
                                ) : (
                                    <View className='bg-destructive/10 p-4 rounded-xl border border-destructive/30'>
                                        <Text className='text-destructive text-sm font-medium text-center'>
                                            No eres capitán de ningún equipo
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Posición */}
                        <View className='mb-6'>
                            <Select
                                options={POSITIONS}
                                value={position}
                                onChange={setPosition}
                                placeholder='Selecciona posición'
                                label='Posición'
                            />
                        </View>

                        {/* Descripción */}
                        <View className='mb-4'>
                            <Text className='text-text-muted text-xs uppercase font-semibold tracking-wide mb-2 pl-1'>
                                Descripción (Opcional)
                            </Text>
                            <TextInput
                                className='bg-card text-foreground px-4 py-3 rounded-xl border-2 border-border min-h-[100px]'
                                placeholder={
                                    type === 'TEAM_SEEKING_PLAYER'
                                        ? 'Ej: Jugamos los Domingos en Palermo...'
                                        : 'Ej: Disponible fines de semana...'
                                }
                                placeholderTextColor='#6B7280'
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                textAlignVertical='top'
                                maxLength={200}
                            />
                            <Text className='text-muted-foreground text-xs mt-2 ml-1'>
                                {description.length}/200 caracteres
                            </Text>
                        </View>
                        </ScrollView>

                        {/* Footer */}
                        <View 
                            className='px-6 py-4 border-t border-border gap-3'
                        >
                            <Button
                                title={loading ? 'PUBLICANDO...' : 'PUBLICAR'}
                                onPress={handleCreate}
                                disabled={loading || (type === 'TEAM_SEEKING_PLAYER' && !selectedTeamId)}
                                variant='primary'
                            />
                            <Button title='Cancelar' variant='secondary' onPress={onClose} />
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    )
}