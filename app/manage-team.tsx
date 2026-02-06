import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Camera, Check, Copy, Crown, LogOut, MapPin, MoreVertical, Shield, Users, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native'

// Services & Context
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services/auth.service'
import { storageService } from '@/services/storage.service'
import { TeamMemberDetail, teamsService } from '@/services/teams.service'
import { TeamMemberStatus, UserRole } from '@/types/core'
import { Team } from '@/types/teams'

// Components
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { MemberActionModal } from '@/components/ui/MemberActionModal'
import { ScreenLayout } from '@/components/ui/ScreenLayout'
import { CONFIG } from '@/lib/config'

export default function ManageTeamScreen() {
  const { id } = useLocalSearchParams()
  const { showToast } = useToast()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMemberDetail[]>([])
  const [currentUser, setCurrentUser] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Modales
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
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

  async function handleEditShield() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (permissionResult.granted === false) {
      showToast('Se requiere acceso a la galería', 'error')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5,
    })
    if (!result.canceled && result.assets[0].uri && team) {
      setUploading(true)
      showToast('Subiendo escudo...', 'info')
      const path = `${team.id}/shield.png`
      const publicUrl = await storageService.uploadImage(result.assets[0].uri, CONFIG.supabase.storageBucket.teamLogos, path)
      if (publicUrl) {
        const update = await teamsService.updateTeam(team.id, { logo_url: publicUrl })
        if (update.success && update.data) {
          setTeam(update.data)
          showToast('¡Escudo actualizado!', 'success')
        } else { showToast('Error al guardar cambios', 'error') }
      } else { showToast('Error al subir imagen', 'error') }
      setUploading(false)
    }
  }

  const copyCode = async () => {
    if (team?.share_code) {
      await Clipboard.setStringAsync(team.share_code)
      showToast('Código copiado al portapapeles', 'success')
    }
  }

  async function handleRequest(userId: string, accept: boolean) {
    if (!team) return
    const status = accept ? TeamMemberStatus.ACTIVE : TeamMemberStatus.INACTIVE
    const res = await teamsService.manageMemberStatus(team.id, userId, status)
    if (res.success) {
      showToast(accept ? 'Jugador aceptado' : 'Solicitud rechazada', accept ? 'success' : 'info')
      if (team?.id) loadTeamData(team.id)
    } else { showToast('Error al procesar solicitud', 'error') }
  }

  // --- GESTIÓN DE ROLES ---

  const openMemberOptions = (member: TeamMemberDetail) => {
    if (isCaptain && member.user_id !== currentUser) {
        setSelectedMember(member);
        setShowMemberModal(true);
    }
  };

  async function handleKickMember() {
    if (!team || !selectedMember) return;
    setShowMemberModal(false);
    const res = await teamsService.manageMemberStatus(team.id, selectedMember.user_id, TeamMemberStatus.INACTIVE);
    if (res.success) {
        showToast(`Has expulsado a ${selectedMember.profile.full_name}`, 'success');
        loadTeamData(team.id);
    } else {
        showToast('Error al expulsar miembro', 'error');
    }
  }

  // SOLUCIÓN DEFINITIVA A 2 CAPITANES: Usamos la función RPC
  async function handleMakeCaptain() {
    if (!team || !selectedMember) return;
    setShowMemberModal(false);
    
    // Llamamos al nuevo servicio que usa la función SQL
    const res = await teamsService.transferCaptaincy(team.id, selectedMember.user_id);
    
    if (res.success) {
        showToast(`¡${selectedMember.profile.full_name} es el nuevo Capitán!`, 'success');
        loadTeamData(team.id);
    } else {
        showToast('Error al transferir capitanía. Intenta nuevamente.', 'error');
    }
  }

  async function handleMakeSubCaptain() {
    if (!team || !selectedMember) return;
    setShowMemberModal(false);
    const res = await teamsService.updateMemberRole(team.id, selectedMember.user_id, UserRole.SUB_ADMIN);
    if (res.success) {
        showToast(`${selectedMember.profile.full_name} es ahora Sub-Capitán`, 'success');
        loadTeamData(team.id);
    } else {
        showToast('Error al actualizar rol', 'error');
    }
  }

  async function handleDemoteToPlayer() {
    if (!team || !selectedMember) return;
    setShowMemberModal(false);
    const res = await teamsService.updateMemberRole(team.id, selectedMember.user_id, UserRole.PLAYER);
    if (res.success) {
        showToast(`${selectedMember.profile.full_name} vuelve a ser Jugador`, 'info');
        loadTeamData(team.id);
    } else {
        showToast('Error al actualizar rol', 'error');
    }
  }

  async function onConfirmLeave() {
    setShowLeaveModal(false)
    if (!team || !currentUser) return
    const res = await teamsService.leaveTeam(team.id, currentUser)
    if (res.success) {
      showToast('Has abandonado el equipo', 'success')
      router.replace('/(tabs)/profile')
    } else { showToast('Error al salir del equipo', 'error') }
  }

  const activeMembers = members.filter((m) => m.status === 'ACTIVE')
  const pendingMembers = members.filter((m) => m.status === 'PENDING')
  const isCaptain = team?.captain_id === currentUser

  if (loading) return <View className='flex-1 bg-dark items-center justify-center'><ActivityIndicator size='large' color='#39FF14' /></View>
  if (!team) return <ScreenLayout scrollable withPadding className='bg-dark'><View className='flex-1 items-center justify-center'><Text className='text-gray-400'>Error al cargar equipo</Text><Button title='Volver' variant='secondary' onPress={() => router.back()} className='mt-4' /></View></ScreenLayout>

  return (
    <ScreenLayout scrollable loading={false} withPadding={false} className='bg-dark'>
      <Stack.Screen options={{ title: 'Gestión de Equipo', headerShown: true, headerStyle: { backgroundColor: '#121212' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Oswald_700Bold' }, }} />

      {/* HEADER */}
      <View>
        <View className='items-center pb-4 pt-6'>
          <TouchableOpacity onPress={handleEditShield} activeOpacity={0.8} className='relative'>
            <View className='w-28 h-28 bg-gray-800 rounded-2xl items-center justify-center border-2 border-gray-700 overflow-hidden'>
              {team.logo_url ? <Image source={{ uri: team.logo_url }} className='w-full h-full' resizeMode='cover' /> : <Shield size={48} color='#6B7280' strokeWidth={2} />}
            </View>
            {isCaptain && <View className='absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-full border-2 border-gray-950'><Camera size={16} color='#000' strokeWidth={2.5} /></View>}
          </TouchableOpacity>
          {uploading && <View className='mt-2 bg-primary/10 px-3 py-1 rounded-full'><Text className='text-primary text-xs font-semibold'>Actualizando...</Text></View>}
        </View>

        <Text className='text-white font-title text-3xl text-center px-6 mb-2'>{team.name}</Text>
        <View className='flex-row items-center justify-center gap-2 mb-4'>
            <View className='flex-row items-center gap-1'><MapPin size={14} color='#9CA3AF' strokeWidth={2} /><Text className='text-gray-400 text-sm'>{team.home_zone}</Text></View>
            <View className='w-1 h-1 bg-gray-600 rounded-full' />
            <Text className='text-gray-400 text-sm'>{team.category === 'MALE' ? 'Masculino' : team.category === 'FEMALE' ? 'Femenino' : 'Mixto'}</Text>
        </View>
        <View className='items-center mb-4'>
          <Text className='text-gray-500 text-xs uppercase font-semibold tracking-wide mb-1'>Rating ELO</Text>
          <Text className='text-primary font-title text-4xl font-bold'>{team.elo_rating}</Text>
        </View>
        <View className='items-center pb-6'>
          <TouchableOpacity onPress={copyCode} activeOpacity={0.7} className='flex-row items-center bg-gray-800/50 px-4 py-2.5 rounded-xl border border-gray-700'>
            <Text className='text-gray-500 text-xs uppercase font-semibold mr-2'>Código:</Text>
            <Text className='text-primary font-mono text-base font-bold tracking-widest mr-2.5'>{team.share_code}</Text>
            <Copy size={14} color='#39FF14' strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <View className='p-5 pb-24'>
        {/* SOLICITUDES */}
        {isCaptain && pendingMembers.length > 0 && (
          <View className='mb-6'>
            <View className='flex-row items-center justify-between mb-3'>
              <Text className='text-white font-title text-lg'>Solicitudes Pendientes</Text>
              <View className='bg-yellow-500/20 px-2.5 py-1 rounded-full border border-yellow-500/30'><Text className='text-yellow-500 text-xs font-bold'>{pendingMembers.length}</Text></View>
            </View>
            <View className='gap-3'>
              {pendingMembers.map((m) => (
                <Card key={m.user_id} className='flex-row items-center justify-between p-3.5 border-yellow-500/20 bg-yellow-500/5'>
                  <View className='flex-row items-center gap-3 flex-1 min-w-0'>
                    <View className='w-12 h-12 bg-gray-700 rounded-xl items-center justify-center overflow-hidden border border-gray-600 flex-shrink-0'>
                      {m.profile.avatar_url ? <Image source={{ uri: m.profile.avatar_url }} className='w-full h-full' resizeMode='cover' /> : <Text className='text-white font-title text-lg'>{m.profile.full_name?.[0]?.toUpperCase()}</Text>}
                    </View>
                    <View className='flex-1 min-w-0'>
                      <Text className='text-white font-semibold text-base' numberOfLines={1}>{m.profile.full_name}</Text>
                      <Text className='text-gray-400 text-xs' numberOfLines={1}>@{m.profile.username}</Text>
                    </View>
                  </View>
                  <View className='flex-row gap-2 flex-shrink-0 ml-2'>
                    <TouchableOpacity onPress={() => handleRequest(m.user_id, true)} className='bg-green-500/20 w-11 h-11 rounded-xl border border-green-500/40 items-center justify-center active:bg-green-500/30'><Check size={20} color='#4ade80' strokeWidth={2.5} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRequest(m.user_id, false)} className='bg-red-500/20 w-11 h-11 rounded-xl border border-red-500/40 items-center justify-center active:bg-red-500/30'><X size={20} color='#f87171' strokeWidth={2.5} /></TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* PLANTEL */}
        <View className='mb-6'>
          <View className='flex-row items-center gap-2 mb-3'>
            <Users size={20} color='#39FF14' strokeWidth={2.5} />
            <Text className='text-white font-title text-lg'>Plantel</Text>
            <View className='bg-gray-800 px-2.5 py-0.5 rounded-full'><Text className='text-gray-400 text-xs font-bold'>{activeMembers.length}</Text></View>
          </View>

          <View className='gap-3'>
            {activeMembers.map((member) => (
              <TouchableOpacity 
                key={member.user_id}
                activeOpacity={isCaptain && member.user_id !== currentUser ? 0.7 : 1}
                onPress={() => openMemberOptions(member)}
              >
                  <Card className='flex-row items-center p-3.5'>
                    <View className='w-12 h-12 bg-gray-700 rounded-xl overflow-hidden items-center justify-center border border-gray-600 mr-3 flex-shrink-0'>
                      {member.profile.avatar_url ? <Image source={{ uri: member.profile.avatar_url }} className='w-full h-full' resizeMode='cover' /> : <Text className='text-white font-title text-lg'>{member.profile.full_name?.[0]?.toUpperCase() || '?'}</Text>}
                    </View>
                    <View className='flex-1 min-w-0'>
                      <Text className='text-white font-semibold text-base' numberOfLines={1}>{member.profile.full_name}</Text>
                      <Text className='text-gray-500 text-xs' numberOfLines={1}>@{member.profile.username}</Text>
                    </View>

                    {/* BADGES */}
                    {member.role === UserRole.ADMIN && (
                      <View className='flex-row items-center gap-1 bg-yellow-500/20 px-2.5 py-1 rounded-lg border border-yellow-500/40 ml-2'>
                        <Crown size={12} color='#EAB308' strokeWidth={2.5} />
                        <Text className='text-yellow-500 text-[10px] font-bold uppercase'>Capitán</Text>
                      </View>
                    )}
                    {member.role === UserRole.SUB_ADMIN && (
                      <View className='flex-row items-center gap-1 bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/40 ml-2'>
                        <Shield size={12} color='#60A5FA' strokeWidth={2.5} />
                        <Text className='text-blue-400 text-[10px] font-bold uppercase'>Sub-Cap</Text>
                      </View>
                    )}
                    {member.role === UserRole.PLAYER && (
                      <View className='flex-row items-center gap-1 bg-gray-700/30 px-2.5 py-1 rounded-lg border border-gray-600/50 ml-2'>
                        <Text className='text-gray-400 text-[10px] font-bold uppercase'>Jugador</Text>
                      </View>
                    )}

                    {isCaptain && member.user_id !== currentUser && (
                        <View className="ml-auto pl-2">
                            <MoreVertical size={20} color="#6B7280" />
                        </View>
                    )}
                  </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button title='Abandonar Equipo' variant='danger' onPress={() => setShowLeaveModal(true)} icon={<LogOut size={20} color='#EF4444' strokeWidth={2.5} />} className='mt-2' />
      </View>

      <ConfirmationModal visible={showLeaveModal} title='¿Abandonar Equipo?' message='Si eres el único miembro, el equipo se eliminará permanentemente.' confirmText='Sí, salir' cancelText='Cancelar' variant='danger' onConfirm={onConfirmLeave} onCancel={() => setShowLeaveModal(false)} />
      
      {/* AQUÍ ESTABA EL BUG: Pasamos selectedMember?.role o PLAYER por defecto */}
      <MemberActionModal 
        visible={showMemberModal}
        memberName={selectedMember?.profile.full_name || 'Jugador'}
        currentRole={(selectedMember?.role as UserRole) ?? UserRole.PLAYER} 
        onMakeCaptain={handleMakeCaptain}
        onMakeSubCaptain={handleMakeSubCaptain}
        onDemoteToPlayer={handleDemoteToPlayer}
        onKick={handleKickMember}
        onCancel={() => setShowMemberModal(false)}
      />
    </ScreenLayout>
  )
}