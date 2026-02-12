import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth.service'
import { ChatMessage, chatService } from '@/services/chat.service'
import { MatchDetail, matchesService } from '@/services/matches.service'
import { PlayerStat, statsService } from '@/services/stats.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import { UserRole } from '@/types/core'
import { format, parseISO, set } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'

export type CitedPlayer = TeamMemberDetail & {
    teamName: string
    isBothTeams?: boolean
}

export function useMatchDetails(matchId: string | undefined) {
    const { showToast } = useToast()

    const [loading, setLoading] = useState(true)
    const [match, setMatch] = useState<MatchDetail | null>(null)

    const [myTeamId, setMyTeamId] = useState<string>('')
    const [myTeam, setMyTeam] = useState<{ id: string; name: string; logo_url?: string } | null>(null)
    const [rivalTeam, setRivalTeam] = useState<{ id: string; name: string; logo_url?: string } | null>(null)

    const [teamMembers, setTeamMembers] = useState<TeamMemberDetail[]>([])
    const [citedPlayers, setCitedPlayers] = useState<CitedPlayer[]>([])
    const [canManage, setCanManage] = useState(false)

    const [messages, setMessages] = useState<ChatMessage[]>([])

    const initializeMatch = useCallback(async () => {
        if (!matchId) return
        try {
            setLoading(true)

            const session = await authService.getSession()
            const userId = session.data?.user?.id
            if (!userId) {
                showToast('No se pudo identificar el usuario', 'error')
                setLoading(false)
                return
            }

            const matchRes = await matchesService.getMatchById(matchId)
            if (!matchRes.data) {
                showToast('Partido no encontrado', 'error')
                setLoading(false)
                return
            }
            setMatch(matchRes.data)

            if (matchRes.data?.team_a?.id && matchRes.data?.team_b?.id) {
                const [resA, resB] = await Promise.all([
                    teamsService.getTeamMembers(matchRes.data.team_a.id),
                    teamsService.getTeamMembers(matchRes.data.team_b.id),
                ])

                const memberA = resA.data?.find((m) => m.user_id === userId)
                const memberB = resB.data?.find((m) => m.user_id === userId)

                const isTeamAAdmin = !!(memberA && (memberA.role === UserRole.ADMIN || memberA.role === UserRole.SUB_ADMIN))
                const isTeamBAdmin = !!(memberB && (memberB.role === UserRole.ADMIN || memberB.role === UserRole.SUB_ADMIN))
                const canUserManage = isTeamAAdmin || isTeamBAdmin

                if (memberA) {
                    setMyTeamId(matchRes.data.team_a.id)
                    setMyTeam(matchRes.data.team_a)
                    setRivalTeam(matchRes.data.team_b)
                    setTeamMembers(resA.data || [])
                    setCanManage(canUserManage)
                } else if (memberB) {
                    setMyTeamId(matchRes.data.team_b.id)
                    setMyTeam(matchRes.data.team_b)
                    setRivalTeam(matchRes.data.team_a)
                    setTeamMembers(resB.data || [])
                    setCanManage(canUserManage)
                } else {
                    showToast('No tienes acceso a este partido', 'error')
                    setLoading(false)
                    return
                }

                const bothTeamMembers: CitedPlayer[] = [
                    ...(resA.data || []).map((player) => ({
                        ...player,
                        teamName: matchRes.data?.team_a?.name || 'Equipo A',
                        isBothTeams: false,
                    })),
                    ...(resB.data || []).map((player) => ({
                        ...player,
                        teamName: matchRes.data?.team_b?.name || 'Equipo B',
                        isBothTeams: false,
                    })),
                ]
                setCitedPlayers(bothTeamMembers)
            }

            const chatRes = await chatService.getMessages(matchId)
            if (chatRes.data) setMessages(chatRes.data)
        } catch (e) {
            console.error('Error initializing match:', e)
            showToast('Error al cargar el partido', 'error')
        } finally {
            setLoading(false)
        }
    }, [matchId, showToast])

    useEffect(() => {
        initializeMatch()

        if (!matchId) return

        const channel = supabase
            .channel(`match-${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_messages',
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    setMessages((prev) => [payload.new as ChatMessage, ...prev])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId, initializeMatch])


    // ACTIONS
    async function sendProposal(
        propDate: Date,
        propTime: Date,
        propModality: string,
        propDuration: string,
        propIsFriendly: boolean,
        propVenue: string
    ) {
        if (!myTeamId || !match) return false

        if (!canManage) {
            showToast('Solo capitanes pueden enviar propuestas', 'error')
            return false
        }

        const dateStr = format(propDate, 'yyyy-MM-dd')
        const timeStr = format(propTime, 'HH:mm')

        const { error } = await supabase.from('match_messages').insert({
            match_id: match.id,
            sender_team_id: myTeamId,
            content: 'Propuesta de partido',
            type: 'PROPOSAL',
            status: 'SENT',
            proposal_data: {
                date: dateStr,
                time: timeStr,
                modality: propModality,
                duration: propDuration,
                isFriendly: propIsFriendly,
                venue: propVenue || match.venue?.name || ''
            }
        })

        if (!error) {
            showToast('Propuesta enviada', 'success')
            return true
        } else {
            showToast('Error al enviar propuesta', 'error')
            return false
        }
    }

    async function acceptProposal(msg: ChatMessage) {
        if (!match || !msg.proposal_data) return

        if (!canManage) {
            showToast('Solo capitanes pueden aceptar propuestas', 'error')
            return
        }

        const result = await chatService.respondProposal(msg.id, 'ACCEPTED')

        if (result.success) {
            const pData: any = msg.proposal_data
            const combinedDateTimeString = `${pData.date}T${pData.time}:00`
            const combinedDate = parseISO(combinedDateTimeString)
            const isoString = combinedDate.toISOString()

            const updateResult = await matchesService.updateMatch(match.id, {
                scheduled_at: isoString,
                is_friendly: pData.isFriendly !== undefined ? pData.isFriendly : match.is_friendly,
                status: 'CONFIRMED',
            })

            if (updateResult.success) {
                showToast('¡Partido Confirmado!', 'success')
                initializeMatch()
            } else {
                showToast('Error al confirmar partido', 'error')
            }
        } else {
            showToast('Error al aceptar propuesta', 'error')
        }
    }

    async function rejectProposal(msg: ChatMessage) {
        if (!canManage) {
            showToast('Solo capitanes pueden rechazar propuestas', 'error')
            return
        }
        const result = await chatService.respondProposal(msg.id, 'REJECTED')
        if (result.success) initializeMatch()
        else showToast('Error al rechazar propuesta', 'error')
    }

    async function cancelProposal(msg: ChatMessage) {
        if (!canManage) {
            showToast('Solo capitanes pueden cancelar propuestas', 'error')
            return
        }
        const result = await chatService.respondProposal(msg.id, 'CANCELLED')
        if (result.success) {
            showToast('Propuesta cancelada', 'success')
            initializeMatch()
        }
        else showToast('Error al cancelar propuesta', 'error')
    }

    async function updateMatchDetails(propDate: Date, propTime: Date, propVenue: string, propIsFriendly: boolean) {
        if (!canManage || !match) return false

        const combinedDate = set(propDate, {
            hours: propTime.getHours(),
            minutes: propTime.getMinutes(),
            seconds: 0,
            milliseconds: 0
        })
        const isoString = combinedDate.toISOString()

        const updateResult = await matchesService.updateMatch(match.id, {
            scheduled_at: isoString,
            is_friendly: propIsFriendly,
            status: 'CONFIRMED'
        })

        if (updateResult.success) {
            showToast('Reserva actualizada', 'success')
            initializeMatch()
            return true
        } else {
            showToast('Error al actualizar reserva', 'error')
            return false
        }
    }

    async function cancelMatch() {
        if (!canManage || !match) return

        const updateResult = await matchesService.updateMatch(match.id, {
            status: 'CANCELLED',
            scheduled_at: undefined
        })

        if (updateResult.success) {
            showToast('Partido cancelado', 'success')
            initializeMatch()
        } else {
            showToast('Error al cancelar partido', 'error')
        }
    }

    async function submitResult(homeScore: number, awayScore: number, playerGoals: Record<string, number>, selectedMVP: string | null) {
        if (!match || !myTeamId) return

        if (!canManage) {
            showToast('Solo capitanes pueden enviar resultados', 'error')
            return
        }

        const resultPayload = {
            match_id: match.id,
            goals_a: homeScore,
            goals_b: awayScore,
            is_draw: homeScore === awayScore,
            confirmed_by_a: myTeamId === match.team_a.id,
            confirmed_by_b: myTeamId === match.team_b.id
        }

        await matchesService.saveMatchResult(resultPayload)

        if (myTeamId && match) {
            const stats: PlayerStat[] = teamMembers.map(member => ({
                userId: member.user_id,
                teamId: myTeamId,
                goals: playerGoals[member.user_id] || 0,
                isMvp: selectedMVP === member.user_id
            }))

            const statsRes = await statsService.savePlayerStats(match.id, stats)
            if (!statsRes.success) {
                showToast('Error al guardar estadísticas', 'error')
                return
            }
        }

        showToast('Resultado y Estadísticas enviados', 'success')
        setMatch({ ...match, status: 'FINISHED' })
        await matchesService.updateMatch(match!.id, { status: 'FINISHED' })
    }

    async function claimWalkover(evidenceUrl: string) {
        if (!match || !myTeamId) return

        const status = myTeamId === match.team_a.id ? 'WO_A' : 'WO_B'

        const updateRes = await matchesService.updateMatch(match.id, {
            status: status,
            wo_evidence_url: evidenceUrl
        })

        if (updateRes.success) {
            showToast('W.O. Reclamado exitosamente', 'success')
            initializeMatch()
            return true
        } else {
            showToast('Error al actualizar partido', 'error')
            return false
        }
    }

    return {
        match,
        loading,
        myTeam,
        myTeamId,
        rivalTeam,
        canManage,
        messages,
        citedPlayers,
        teamMembers,
        refreshMatch: initializeMatch,
        sendProposal,
        acceptProposal,
        rejectProposal,
        cancelProposal,
        updateMatchDetails,
        cancelMatch,
        submitResult,
        claimWalkover
    }
}
