import { AuthInput } from '@/components/ui/AuthInput'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { marketService } from '@/services/market.service'
import { teamsService } from '@/services/teams.service'
import { MarketPostType } from '@/types/market'
import { Team } from '@/types/teams'
import { X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native'

interface CreatePostModalProps {
    visible: boolean
    onClose: () => void
    onSuccess: () => void
}

const POSITIONS = [
    { label: 'Cualquiera', value: 'ANY' },
    { label: 'Arquero', value: 'GOALKEEPER' },
    { label: 'Defensor', value: 'DEFENDER' },
    { label: 'Mediocampista', value: 'MIDFIELDER' },
    { label: 'Delantero', value: 'FORWARD' },
]

const TYPES = [
    { label: 'Soy Jugador buscando Equipo', value: 'PLAYER_SEEKING_TEAM' },
    { label: 'Soy Equipo buscando Jugador', value: 'TEAM_SEEKING_PLAYER' },
]

export function CreatePostModal({ visible, onClose, onSuccess }: CreatePostModalProps) {
    const { showToast } = useToast()

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
                const res = await teamsService.getUserTeams(session.data.user.id)
                if (res.success && res.data) {
                    // Filter teams where user is captain? Only captains should post for team?
                    // For now allow any member or filtered by captain in UI logic if strictly required.
                    // Assuming better UX is only captains.
                    // Note: getUserTeams returns Team[] which has minimal info.
                    // We might need to check role. But let's assume if he is in the team he can post for now
                    // or filter client side if we had the role.
                    // Actually `getUserTeams` returns Team[] not TeamMemberDetail[]. 
                    // Let's filter by those created by user? `captain_id` is in Team.
                    const captainTeams = res.data.filter(t => t.captain_id === session.data?.user?.id)
                    setMyTeams(captainTeams)
                    if (captainTeams.length > 0) {
                        setSelectedTeamId(captainTeams[0].id)
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
                user_id: session.data.user.id, // Always link to creator
                team_id: type === 'TEAM_SEEKING_PLAYER' ? selectedTeamId! : undefined,
                position_needed: position === 'ANY' ? undefined : position,
                description: description.trim() || undefined
            })

            if (res.success) {
                showToast('Publicación creada con éxito', 'success')
                onSuccess()
                onClose()
                // Reset form
                setDescription('')
                setType('PLAYER_SEEKING_TEAM')
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

    const teamOptions = myTeams.map(t => ({ label: t.name, value: t.id }))

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/80 justify-end">
                <View className="bg-card rounded-t-3xl border-t border-border p-6 h-[85%]">

                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-foreground text-xl font-bold">Nueva Publicación</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <View className="gap-4 flex-1">
                        <View>
                            <Text className="text-text-muted mb-2 font-bold">¿Qué buscas?</Text>
                            <Select
                                options={TYPES}
                                value={type}
                                onChange={(v) => setType(v as MarketPostType)}
                                placeholder="Selecciona tipo"
                                label="Tipo de publicación"
                            />
                        </View>

                        {type === 'TEAM_SEEKING_PLAYER' && (
                            <View>
                                <Text className="text-text-muted mb-2 font-bold">Para el equipo:</Text>
                                {fetchingTeams ? (
                                    <ActivityIndicator color="#00D54B" />
                                ) : myTeams.length > 0 ? (
                                    <Select
                                        options={teamOptions}
                                        value={selectedTeamId || ''}
                                        onChange={setSelectedTeamId}
                                        placeholder="Selecciona tu equipo"
                                        label="Equipo"
                                    />
                                ) : (
                                    <Text className="text-destructive">No eres capitán de ningún equipo.</Text>
                                )}
                            </View>
                        )}

                        <View>
                            <Text className="text-text-muted mb-2 font-bold">Posición {type === 'TEAM_SEEKING_PLAYER' ? 'Buscada' : 'Principal'}</Text>
                            <Select
                                options={POSITIONS}
                                value={position}
                                onChange={setPosition}
                                placeholder="Selecciona posición"
                                label="Posición"
                            />
                        </View>

                        <View>
                            <Text className="text-text-muted mb-2 font-bold">Descripción (Opcional)</Text>
                            <AuthInput
                                label="Descripción"
                                value={description}
                                onChangeText={setDescription}
                                placeholder={type === 'TEAM_SEEKING_PLAYER' ? "Ej: Jugamos los Domingos en Palermo..." : "Ej: Disponible fines de semana..."}
                                icon={<View />} // Hack to reuse AuthInput without icon
                            />
                        </View>
                    </View>

                    <Button
                        title={loading ? "PUBLICANDO..." : "PUBLICAR"}
                        onPress={handleCreate}
                        disabled={loading || (type === 'TEAM_SEEKING_PLAYER' && !selectedTeamId)}
                        variant="primary"
                        className="mt-4"
                    />

                </View>
            </View>
        </Modal>
    )
}
