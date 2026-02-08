import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { TeamMemberDetail } from '@/services/teams.service'
import { UserRole } from '@/types/core'
import { Team } from '@/types/teams'
import { Crown, Shield, Users, X } from 'lucide-react-native'
import React, { useState } from 'react'
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ChallengeRelationship } from './RivalCard'

interface TeamDetailModalProps {
  visible: boolean
  team: Team | null
  teamMembers?: TeamMemberDetail[] // Lista de miembros del equipo

  // Multi-equipo
  myTeams: Team[]
  selectedTeamId: string
  onSelectTeam: (id: string) => void

  // Acciones
  onClose: () => void
  onChallenge: () => void
  onAccept: () => void
  onReject: () => void

  relationship: ChallengeRelationship
}

export function TeamDetailModal({
  visible,
  team,
  teamMembers = [],
  onClose,
  onChallenge,
  onAccept,
  onReject,
  relationship,
}: TeamDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'INFO' | 'MEMBERS'>('INFO')

  if (!team) return null

  const captain = teamMembers.find((m) => m.role === 'ADMIN')
  const subAdmins = teamMembers.filter((m) => m.role === 'SUB_ADMIN')
  const players = teamMembers.filter((m) => m.role === 'PLAYER')

  return (
    <Modal visible={visible} animationType='slide' transparent onRequestClose={onClose}>
      <View className='flex-1 bg-black/80 justify-end'>
        <View className='bg-modal h-[90%] rounded-t-3xl border-t  w-full overflow-hidden'>
          <View className='absolute top-4 right-4 z-10'>
            <TouchableOpacity
              onPress={onClose}
              className='bg-card/80 p-2 rounded-full border border-border'
            >
              <X size={24} color='#fff' />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
            {/* Header Identity */}
            <View className='items-center mb-8 mt-4'>
              {/* Avatar del Equipo */}
              <View className='relative mb-4'>
                <Avatar uri={team.logo_url} fallback='shield' size={100} />
                {relationship === 'ACCEPTED' && (
                  <View className='absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full items-center justify-center border-2 border-gray-900'>
                    <Crown size={16} color='#000' strokeWidth={2.5} />
                  </View>
                )}
              </View>

              <Text className='text-white font-title text-3xl text-center leading-tight'>
                {team.name}
              </Text>
              <Text className='text-gray-400 text-sm font-semibold uppercase tracking-widest mt-1'>
                {team.home_zone} •{' '}
                {team.category === 'MALE'
                  ? 'Masculino'
                  : team.category === 'FEMALE'
                    ? 'Femenino'
                    : 'Mixto'}
              </Text>

              {/* Nuevo diseño del ELO */}
              <View className='mt-6 flex-row items-center gap-3'>
                <View className='bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-6 py-3 rounded-2xl border border-amber-500/30 flex-row items-center gap-2'>
                  <Shield size={18} color='#F59E0B' strokeWidth={2} />
                  <View>
                    <Text className='text-amber-500 font-title text-2xl font-bold'>
                      {team.elo_rating}
                    </Text>
                    <Text className='text-amber-500/60 text-xs font-medium uppercase tracking-wide'>
                      Rating ELO
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tabs */}
            <View className='flex-row mb-6 bg-gray-800/50 rounded-xl p-1'>
              <TouchableOpacity
                onPress={() => setActiveTab('INFO')}
                className={`flex-1 py-3 rounded-lg items-center ${
                  activeTab === 'INFO' ? 'bg-primary' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    activeTab === 'INFO' ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  Información
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('MEMBERS')}
                className={`flex-1 py-3 rounded-lg items-center flex-row justify-center gap-2 ${
                  activeTab === 'MEMBERS' ? 'bg-primary' : 'bg-transparent'
                }`}
              >
                <Users size={16} color={activeTab === 'MEMBERS' ? '#000' : '#9CA3AF'} />
                <Text
                  className={`font-semibold ${
                    activeTab === 'MEMBERS' ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  Equipo ({teamMembers.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contenido de las Tabs */}
            {activeTab === 'INFO' ? (
              <>
                {/* Stats */}
                <View className='flex-row gap-3 mb-8'>
                  <StatBox label='Partidos' value='0' />
                  <StatBox label='Victorias' value='0' highlight />
                  <StatBox label='Derrotas' value='0' />
                </View>

                {/* Información del Capitán */}
                {captain && (
                  <>
                    <Text className='text-white font-title text-xl mb-4'>Liderazgo</Text>
                    <View className='bg-gray-800/60 p-4 rounded-xl border border-gray-700/50 flex-row items-center mb-8'>
                      <Avatar
                        uri={captain.profile.avatar_url}
                        fallback='user'
                        size={52}
                        shape='circle'
                      />
                      <View className='ml-4 flex-1'>
                        <Text className='text-white font-bold text-lg'>
                          {captain.profile.full_name || 'Capitán del Equipo'}
                        </Text>
                        <View className='items-start mt-1'>
                          <RoleBadge role={captain.role as UserRole} />
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </>
            ) : (
              /* Tab de Miembros */
              <View className='min-h-[300px]'>
                {teamMembers.length > 0 ? (
                  <View className='gap-3'>
                    {/* Capitán */}
                    {captain && (
                      <MemberCard
                        member={captain}
                        isLeader
                        icon={<Crown size={16} color='#F59E0B' strokeWidth={2} />}
                      />
                    )}

                    {/* Subcapitanes */}
                    {subAdmins.map((member) => (
                      <MemberCard
                        key={member.user_id}
                        member={member}
                        icon={<Shield size={16} color='#6B7280' strokeWidth={2} />}
                      />
                    ))}

                    {/* Jugadores */}
                    {players.map((member) => (
                      <MemberCard key={member.user_id} member={member} />
                    ))}
                  </View>
                ) : (
                  <View className='items-center py-12'>
                    <View className='w-16 h-16 bg-gray-800/50 rounded-full items-center justify-center mb-4'>
                      <Users size={24} color='#6B7280' />
                    </View>
                    <Text className='text-gray-400 text-center'>No hay miembros disponibles</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View className='absolute bottom-0 w-full p-6 bg-modal border-t border-border'>
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
          </View>
        </View>
      </View>
    </Modal>
  )
}

const MemberCard = ({
  member,
  isLeader,
  icon,
}: {
  member: TeamMemberDetail
  isLeader?: boolean
  icon?: React.ReactNode
}) => (
  <View
    className={`p-4 rounded-xl border flex-row items-center gap-3 ${
      isLeader ? 'bg-amber-500/5 border-amber-500/20' : 'bg-gray-800/40 border-gray-700/50'
    }`}
  >
    <Avatar uri={member.profile.avatar_url} fallback='user' size={44} shape='circle' />
    <View className='flex-1'>
      <View className='flex-row items-center gap-2'>
        {icon}
        <Text className={`font-semibold ${isLeader ? 'text-amber-500' : 'text-white'}`}>
          {member.profile.full_name || 'Miembro del Equipo'}
        </Text>
      </View>
      <View className='items-start mt-1'>
        <RoleBadge role={member.role as UserRole} />
      </View>
    </View>
  </View>
)

const StatBox = ({ label, value, highlight }: any) => (
  <View
    className={`flex-1 p-4 rounded-xl border items-center justify-center ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}
  >
    <Text className={`text-2xl font-title ${highlight ? 'text-primary' : 'text-text-main'}`}>
      {value}
    </Text>
    <Text className='text-text-muted text-[10px] uppercase font-bold mt-1'>{label}</Text>
  </View>
)
