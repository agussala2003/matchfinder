import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Copy, LogOut, MapPin, Pencil, Users } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { storageService } from '@/services/storage.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import { TeamMemberStatus, UserRole } from '@/types/core'
import { Team } from '@/types/teams'

// Components
import { EditTeamModal } from '@/components/teams/EditTeamModal'
import { MemberActionModal } from '@/components/teams/MemberActionModal'
import { PendingRequestCard } from '@/components/teams/PendingRequestCard'
import { TeamMemberCard } from '@/components/teams/TeamMemberCard'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { CONFIG } from '@/lib/config'

export default function ManageTeamScreen() {
  const { id } = useLocalSearchParams()
  const { showToast } = useToast()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMemberDetail[]>([])
  const [currentUser, setCurrentUser] = useState<string>('')

  // UI States
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null)

  useEffect(() => {
    if (id) {
      loadTeamData(id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadTeamData(teamId: string) {
    try {
      setLoading(true)
      const session = await authService.getSession()
      const userId = session.data?.user.id
      if (!userId) {
        setLoading(false)
        return
      }
      setCurrentUser(userId)

      const teamRes = await teamsService.getTeamById(teamId)
      if (teamRes.data) {
        setTeam(teamRes.data)
        const membersRes = await teamsService.getTeamMembers(teamId)
        if (membersRes.data) {
          setMembers(membersRes.data)
        }
      }
    } catch (e) {
      console.error(e)
      showToast('Error al cargar información del equipo', 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- PERMISSIONS ---
  const myMemberProfile = members.find((m: TeamMemberDetail) => m.user_id === currentUser)
  const myRole = myMemberProfile?.role
  const canEdit = myRole === UserRole.ADMIN || myRole === UserRole.SUB_ADMIN
  const isCaptain = team?.captain_id === currentUser

  // --- EDIT ACTIONS ---
  async function handleEditShield() {
    if (!canEdit) return

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (permissionResult.granted === false) {
      showToast('Se requiere acceso a la galería', 'error')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0].uri && team) {
      setUploading(true)
      showToast('Subiendo escudo...', 'info')
      const path = `${team.id}/shield.png`
      const publicUrl = await storageService.uploadImage(
        result.assets[0].uri,
        CONFIG.supabase.storageBucket.teamLogos,
        path,
      )

      if (publicUrl) {
        const update = await teamsService.updateTeam(team.id, { logo_url: publicUrl })
        if (update.success && update.data) {
          setTeam(update.data)
          showToast('¡Escudo actualizado!', 'success')
        } else {
          showToast('Error al guardar cambios', 'error')
        }
      } else {
        showToast('Error al subir imagen', 'error')
      }
      setUploading(false)
    }
  }

  async function handleUpdateTeamInfo(updates: Partial<Team>) {
    if (!team) return
    const res = await teamsService.updateTeam(team.id, updates)
    if (res.success && res.data) {
      setTeam(res.data)
      showToast('Información actualizada', 'success')
    } else {
      showToast('Error al actualizar equipo', 'error')
    }
  }

  const copyCode = async () => {
    if (team?.share_code) {
      await Clipboard.setStringAsync(team.share_code)
      showToast('Código copiado al portapapeles', 'success')
    }
  }

  // --- REQUEST MANAGEMENT ---
  async function handleRequest(userId: string, accept: boolean) {
    if (!team) return
    const status = accept ? TeamMemberStatus.ACTIVE : TeamMemberStatus.INACTIVE
    const res = await teamsService.manageMemberStatus(team.id, userId, status)
    if (res.success) {
      showToast(accept ? 'Jugador aceptado' : 'Solicitud rechazada', accept ? 'success' : 'info')
      if (team?.id) loadTeamData(team.id)
    } else {
      showToast('Error al procesar solicitud', 'error')
    }
  }

  // --- ROLE MANAGEMENT ---
  const openMemberOptions = (member: TeamMemberDetail) => {
    if (isCaptain && member.user_id !== currentUser) {
      setSelectedMember(member)
      setShowMemberModal(true)
    }
  }

  async function handleKickMember() {
    if (!team || !selectedMember) return
    setShowMemberModal(false)
    const res = await teamsService.manageMemberStatus(
      team.id,
      selectedMember.user_id,
      TeamMemberStatus.INACTIVE,
    )
    if (res.success) {
      showToast(`Has expulsado a ${selectedMember.profile.full_name}`, 'success')
      loadTeamData(team.id)
    } else {
      showToast('Error al expulsar miembro', 'error')
    }
  }

  async function handleMakeCaptain() {
    if (!team || !selectedMember) return
    setShowMemberModal(false)
    const res = await teamsService.transferCaptaincy(team.id, selectedMember.user_id)
    if (res.success) {
      showToast(`¡${selectedMember.profile.full_name} es el nuevo Capitán!`, 'success')
      loadTeamData(team.id)
    } else {
      showToast('Error al transferir capitanía.', 'error')
    }
  }

  async function handleMakeSubCaptain() {
    if (!team || !selectedMember) return
    setShowMemberModal(false)
    const res = await teamsService.updateMemberRole(
      team.id,
      selectedMember.user_id,
      UserRole.SUB_ADMIN,
    )
    if (res.success) {
      showToast(`${selectedMember.profile.full_name} es ahora Sub-Capitán`, 'success')
      loadTeamData(team.id)
    } else {
      showToast('Error al actualizar rol', 'error')
    }
  }

  async function handleDemoteToPlayer() {
    if (!team || !selectedMember) return
    setShowMemberModal(false)
    const res = await teamsService.updateMemberRole(
      team.id,
      selectedMember.user_id,
      UserRole.PLAYER,
    )
    if (res.success) {
      showToast(`${selectedMember.profile.full_name} vuelve a ser Jugador`, 'info')
      loadTeamData(team.id)
    } else {
      showToast('Error al actualizar rol', 'error')
    }
  }

  async function onConfirmLeave() {
    setShowLeaveModal(false)
    if (!team || !currentUser) return
    const res = await teamsService.leaveTeam(team.id, currentUser)
    if (res.success) {
      showToast('Has abandonado el equipo', 'success')
      router.replace('/(tabs)/profile')
    } else {
      showToast('Error al salir del equipo', 'error')
    }
  }

  const activeMembers = members.filter((m: TeamMemberDetail) => m.status === 'ACTIVE')
  const pendingMembers = members.filter((m: TeamMemberDetail) => m.status === 'PENDING')

  // LOADING STATE
  if (loading) {
    return (
      <ScreenLayout scrollable={false} withPadding={false} className='bg-background'>
        <Stack.Screen
          options={{
            title: 'Gestión de Equipo',
            headerShown: true,
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: 'Oswald_700Bold' },
          }}
        />
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#39FF14' />
        </View>
      </ScreenLayout>
    )
  }

  // ERROR STATE
  if (!team) {
    return (
      <ScreenLayout scrollable withPadding className='bg-background'>
        <Stack.Screen
          options={{
            title: 'Gestión de Equipo',
            headerShown: true,
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: 'Oswald_700Bold' },
          }}
        />
        <View className='flex-1 items-center justify-center'>
          <Text className='text-gray-400 text-center mb-4'>
            No se pudo cargar la información del equipo
          </Text>
          <Button title='Volver' variant='secondary' onPress={() => router.back()} />
        </View>
      </ScreenLayout>
    )
  }

  // MAIN CONTENT
  return (
    <ScreenLayout scrollable withPadding={false} className='bg-background'>
      <Stack.Screen
        options={{
          title: 'Gestión de Equipo',
          headerShown: true,
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Oswald_700Bold' },
        }}
      />

      {/* HEADER SECTION */}
      <View className='pb-6'>
        <View className='items-center pt-6 pb-4'>
          {/* Team Logo */}
          <Avatar
            uri={team.logo_url}
            fallback='shield'
            editable={canEdit}
            loading={uploading}
            onEdit={handleEditShield}
          />
        </View>

        {/* Team Name */}
        <View className='flex-row items-center justify-center gap-2 mb-2 px-6'>
          <Text className='text-white font-title text-3xl text-center' numberOfLines={2}>
            {team.name}
          </Text>
          {canEdit && (
            <TouchableOpacity
              onPress={() => setShowEditTeamModal(true)}
              className='bg-gray-800 p-2 ml-2 mt-1 rounded-full border border-gray-700'
            >
              <Pencil size={12} color='#39FF14' />
            </TouchableOpacity>
          )}
        </View>

        {/* Team Info: Location + Category */}
        <View className='flex-row items-center justify-center gap-2 mb-4 px-4'>
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

        {/* ELO Rating */}
        <View className='items-center mb-4'>
          <Text className='text-gray-500 text-xs uppercase font-semibold tracking-wide mb-1'>
            Rating ELO
          </Text>
          <Text className='text-primary font-title text-4xl font-bold'>{team.elo_rating}</Text>
        </View>

        {/* Share Code */}
        <View className='items-center px-4'>
          <TouchableOpacity
            onPress={copyCode}
            activeOpacity={0.7}
            className='flex-row items-center bg-gray-800/50 px-4 py-2.5 rounded-xl border border-gray-700'
          >
            <Text className='text-gray-500 text-xs uppercase font-semibold mr-2'>Código:</Text>
            <Text className='text-primary font-mono text-base font-bold tracking-widest mr-2.5'>
              {team.share_code}
            </Text>
            <Copy size={14} color='#39FF14' strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT SECTION */}
      <View className='p-5 pb-24 gap-6'>
        {/* PENDING REQUESTS */}
        {canEdit && pendingMembers.length > 0 && (
          <View>
            <View className='flex-row items-center justify-between mb-3'>
              <Text className='text-white font-title text-lg'>Solicitudes Pendientes</Text>
              <View className='bg-yellow-500/20 px-2.5 py-1 rounded-full border border-yellow-500/30'>
                <Text className='text-yellow-500 text-xs font-bold'>{pendingMembers.length}</Text>
              </View>
            </View>
            <View className='gap-3'>
              {pendingMembers.map((m: TeamMemberDetail) => (
                <PendingRequestCard
                  key={m.user_id}
                  userId={m.user_id}
                  fullName={m.profile.full_name}
                  username={m.profile.username}
                  avatarUrl={m.profile.avatar_url || undefined}
                  onAccept={() => handleRequest(m.user_id, true)}
                  onReject={() => handleRequest(m.user_id, false)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ACTIVE MEMBERS */}
        <View>
          <View className='flex-row items-center gap-2 mb-3'>
            <Users size={20} color='#39FF14' strokeWidth={2.5} />
            <Text className='text-white font-title text-lg'>Plantel</Text>
            <View className='bg-gray-800 px-2.5 py-0.5 rounded-full'>
              <Text className='text-gray-400 text-xs font-bold'>{activeMembers.length}</Text>
            </View>
          </View>

          <View className='gap-3'>
            {activeMembers.map((member: TeamMemberDetail) => (
              <TeamMemberCard
                key={member.user_id}
                userId={member.user_id}
                fullName={member.profile.full_name}
                username={member.profile.username}
                avatarUrl={member.profile.avatar_url || undefined}
                role={member.role as UserRole}
                isCurrentUser={member.user_id === currentUser}
                canManage={isCaptain}
                onPress={() => openMemberOptions(member)}
              />
            ))}
          </View>
        </View>

        {/* LEAVE TEAM BUTTON */}
        <Button
          title='Abandonar Equipo'
          variant='danger'
          onPress={() => setShowLeaveModal(true)}
          icon={<LogOut size={20} color='#EF4444' strokeWidth={2.5} />}
          className='mt-2'
        />
      </View>

      {/* MODALS */}
      <ConfirmationModal
        visible={showLeaveModal}
        title='¿Abandonar Equipo?'
        message='Si eres el único miembro, el equipo se eliminará permanentemente.'
        confirmText='Sí, salir'
        cancelText='Cancelar'
        variant='danger'
        onConfirm={onConfirmLeave}
        onCancel={() => setShowLeaveModal(false)}
      />

      {selectedMember && (
        <MemberActionModal
          visible={showMemberModal}
          memberName={selectedMember.profile.full_name}
          currentRole={selectedMember.role as UserRole}
          onMakeCaptain={handleMakeCaptain}
          onMakeSubCaptain={handleMakeSubCaptain}
          onDemoteToPlayer={handleDemoteToPlayer}
          onKick={handleKickMember}
          onCancel={() => setShowMemberModal(false)}
        />
      )}

      {team && (
        <EditTeamModal
          visible={showEditTeamModal}
          team={team}
          onSave={handleUpdateTeamInfo}
          onCancel={() => setShowEditTeamModal(false)}
        />
      )}
    </ScreenLayout>
  )
}
