import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { LogOut } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { storageService } from '@/services/storage.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import { TeamMemberStatus, UserRole } from '@/types/core'
import { Team, TeamSafeUpdate } from '@/types/teams'

// Components
import { ActiveMembersSection } from '@/components/manage-team/ActiveMembersSection'
import { PendingRequestsSection } from '@/components/manage-team/PendingRequestsSection'
import { ShareCodeSection } from '@/components/manage-team/ShareCodeSection'
import { TeamHeader } from '@/components/manage-team/TeamHeader'
import { EditTeamModal } from '@/components/teams/EditTeamModal'
import { MemberActionModal } from '@/components/teams/MemberActionModal'
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

  async function handleUpdateTeamInfo(updates: TeamSafeUpdate) {
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
            headerStyle: { backgroundColor: '#121217' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: 'Inter_700Bold' },
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
            headerStyle: { backgroundColor: '#121217' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: 'Inter_700Bold' },
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
          headerStyle: { backgroundColor: '#121217' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        }}
      />

      {/* HEADER SECTION */}
      <TeamHeader
        team={team}
        canEdit={canEdit}
        uploading={uploading}
        onEditShield={handleEditShield}
        onEditTeam={() => setShowEditTeamModal(true)}
      />
      
      <ShareCodeSection shareCode={team.share_code} onCopyCode={copyCode} />

      {/* CONTENT SECTION */}
      <View className="p-5 pb-24 gap-5">
        {canEdit && (
          <PendingRequestsSection
            pendingMembers={pendingMembers}
            onAccept={(userId) => handleRequest(userId, true)}
            onReject={(userId) => handleRequest(userId, false)}
          />
        )}

        <ActiveMembersSection
          activeMembers={activeMembers}
          currentUser={currentUser}
          isCaptain={isCaptain}
          onMemberPress={openMemberOptions}
        />

        <Button
          title="Abandonar Equipo"
          variant="danger"
          onPress={() => setShowLeaveModal(true)}
          icon={<LogOut size={20} color="#EF4444" strokeWidth={2.5} />}
          className="mt-2"
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
