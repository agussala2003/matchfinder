import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TeamStats, statsService } from '@/services/stats.service'
import { TeamMemberDetail } from '@/services/teams.service'
import { UserRole } from '@/types/core'
import { Team } from '@/types/teams'
import { RelativePathString, router } from 'expo-router'
import { MapPin, Users, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { TeamMemberCard } from '../teams/TeamMemberCard'; // ✅ Importamos la card oficial
import { ChallengeRelationship } from './RivalCard'

interface TeamDetailModalProps {
  visible: boolean
  team: Team | null
  teamMembers?: TeamMemberDetail[]

  // Multi-equipo
  myTeams: Team[]
  selectedTeamId: string
  onSelectTeam: (id: string) => void

  // Acciones
  onClose: () => void
  onChallenge: () => void
  onAccept: () => void
  onReject: () => void
  onCancel: () => void
  activeMatchId?: string

  relationship: ChallengeRelationship
}

export function TeamDetailModal({
  visible,
  team,
  teamMembers = [],
  myTeams,
  selectedTeamId,
  onSelectTeam,
  onClose,
  onChallenge,
  onAccept,
  onReject,
  onCancel,
  activeMatchId,
  relationship,
}: TeamDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'INFO' | 'MEMBERS'>('INFO')
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadTeamStats() {
      if (!visible || !team?.id) {
        setLoadingStats(false)
        return
      }

      setLoadingStats(true)
      const result = await statsService.getTeamStats(team.id)

      if (isMounted) {
        setTeamStats(result.success ? result.data ?? null : null)
        setLoadingStats(false)
      }
    }

    loadTeamStats()

    return () => {
      isMounted = false
    }
  }, [visible, team?.id])

  if (!team) return null

  // Filtramos solo miembros activos para mostrar en la lista rival
  const activeMembers = teamMembers.filter((m) => m.status === 'ACTIVE')

  // Ordenar: Admin -> SubAdmin -> Player
  const sortedMembers = [...activeMembers].sort((a, b) => {
    const roles = { ADMIN: 0, SUB_ADMIN: 1, PLAYER: 2 }
    return (roles[a.role as UserRole] || 2) - (roles[b.role as UserRole] || 2)
  })

  const showTeamSelector = myTeams.length > 1 && relationship === 'NONE'

  return (
    <Modal visible={visible} animationType='slide' transparent onRequestClose={onClose}>
      <View className='flex-1 bg-black/80 justify-end'>
        <View className='bg-modal h-[90%] rounded-t-3xl border-t border-transparent w-full overflow-hidden'>
          {/* Close Button */}
          <View className='absolute top-4 right-4 z-10'>
            <TouchableOpacity
              onPress={onClose}
              className='bg-card/80 p-2 rounded-full border border-border'
            >
              <X size={24} color='#fff' />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {/* --- HEADER (Estilo ManageTeam) --- */}
            <View className='pb-4 pt-10 px-4'>
              <View className='items-center pb-4'>
                <Avatar uri={team.logo_url} fallback='shield' size={100} shape='circle' />
              </View>

              <View className='flex-row items-center justify-center gap-2 mb-2'>
                <Text className='text-white font-title text-3xl text-center' numberOfLines={2}>
                  {team.name}
                </Text>
              </View>

              <View className='flex-row items-center justify-center gap-2 mb-4'>
                <View className='flex-row items-center gap-1'>
                  <MapPin size={14} color='#9CA3AF' strokeWidth={2} />
                  <Text className='text-gray-400 text-sm'>{team.home_zone}</Text>
                </View>
                <View className='w-1 h-1 bg-gray-600 rounded-full' />
                <Text className='text-gray-400 text-sm'>
                  {team.category === 'MALE'
                    ? 'Masculino'
                    : team.category === 'FEMALE'
                      ? 'Femenino'
                      : 'Mixto'}
                </Text>
              </View>

              <View className='items-center mb-2'>
                <Text className='text-gray-500 text-xs uppercase font-semibold tracking-wide mb-1'>
                  Rating ELO
                </Text>
                <Text className='text-primary font-title text-4xl font-bold'>
                  {team.elo_rating}
                </Text>
              </View>
            </View>

            {/* --- TABS --- */}
            <View className='px-4'>
              <View className='flex-row mb-6 bg-gray-800/50 rounded-xl p-1'>
                <TouchableOpacity
                  onPress={() => setActiveTab('INFO')}
                  className={`flex-1 py-2.5 rounded-lg items-center ${
                    activeTab === 'INFO' ? 'bg-primary' : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`font-semibold text-sm ${
                      activeTab === 'INFO' ? 'text-black' : 'text-gray-400'
                    }`}
                  >
                    Información
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('MEMBERS')}
                  className={`flex-1 py-2.5 rounded-lg items-center flex-row justify-center gap-2 ${
                    activeTab === 'MEMBERS' ? 'bg-primary' : 'bg-transparent'
                  }`}
                >
                  <Users size={14} color={activeTab === 'MEMBERS' ? '#000' : '#9CA3AF'} />
                  <Text
                    className={`font-semibold text-sm ${
                      activeTab === 'MEMBERS' ? 'text-black' : 'text-gray-400'
                    }`}
                  >
                    Plantel ({activeMembers.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- CONTENIDO --- */}
            <View className='px-4'>
              {activeTab === 'INFO' ? (
                <>
                  {/* Selector de Equipo (Solo si tengo varios y voy a desafiar) */}
                  {showTeamSelector && (
                    <View className='mb-6'>
                      <Select
                        label='Desafiar como:'
                        options={myTeams.map((t) => ({ label: t.name, value: t.id }))}
                        value={selectedTeamId}
                        onChange={onSelectTeam}
                      />
                    </View>
                  )}

                  <View className='flex-row gap-3 mb-6'>
                    <StatBox
                      label='Partidos'
                      value={teamStats?.totalMatches ?? 0}
                      isLoading={loadingStats}
                    />
                    <StatBox
                      label='Victorias'
                      value={teamStats?.wins ?? 0}
                      highlight
                      isLoading={loadingStats}
                    />
                    <StatBox
                      label='Derrotas'
                      value={teamStats?.losses ?? 0}
                      isLoading={loadingStats}
                    />
                  </View>
                </>
              ) : (
                /* Tab de Miembros con TeamMemberCard */
                <View className='gap-3 min-h-[200px]'>
                  {sortedMembers.length > 0 ? (
                    sortedMembers.map((member) => (
                      <TeamMemberCard
                        key={member.user_id}
                        userId={member.user_id}
                        fullName={member.profile.full_name}
                        username={member.profile.username}
                        avatarUrl={member.profile.avatar_url || undefined}
                        role={member.role as UserRole}
                        isCurrentUser={false}
                        canManage={false} // No podemos gestionar rivales
                      />
                    ))
                  ) : (
                    <View className='items-center py-8 opacity-50'>
                      <Users size={40} color='#6B7280' />
                      <Text className='text-gray-400 mt-2'>No hay miembros públicos</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View className='absolute bottom-0 w-full p-4 bg-modal border-t border-border'>
            {relationship === 'NONE' && (
              <Button title='Enviar Desafío' variant='primary' onPress={onChallenge} />
            )}

            {relationship === 'SENT' && (
              <Button
                title='Solicitud Pendiente'
                variant='secondary'
                disabled
                className='opacity-50'
              />
            )}

            {relationship === 'CAN_CANCEL' && (
              <Button title='Cancelar Desafío' variant='danger' onPress={onCancel} />
            )}

            {relationship === 'RECEIVED' && (
              <View className='flex-row gap-3'>
                <View className='flex-1'>
                  <Button title='Rechazar' variant='danger' onPress={onReject} />
                </View>
                <View className='flex-1'>
                  <Button title='Aceptar' variant='primary' onPress={onAccept} />
                </View>
              </View>
            )}

            {relationship === 'ACCEPTED' && (
              <Button
                title='Ver Partido'
                variant='outline'
                disabled={!activeMatchId}
                onPress={() => {
                  if (!activeMatchId) return
                  onClose()
                  router.push(`/match/${activeMatchId}` as RelativePathString)
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

interface StatBoxProps {
  label: string
  value: string | number
  highlight?: boolean
  isLoading?: boolean
}

const StatBox = ({ label, value, highlight = false, isLoading = false }: StatBoxProps) => (
  <View
    className={`flex-1 p-4 rounded-xl border items-center justify-center ${
      highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
    }`}
  >
    {isLoading ? (
      <ActivityIndicator size='small' color={highlight ? '#22C55E' : '#9CA3AF'} />
    ) : (
      <Text className={`text-2xl font-title ${highlight ? 'text-primary' : 'text-text-main'}`}>
        {value}
      </Text>
    )}
    <Text className='text-text-muted text-[10px] uppercase font-bold mt-1'>{label}</Text>
  </View>
)
