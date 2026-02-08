import { UserRole } from '@/types/core'
import { ArrowDown, Crown, Shield, UserMinus, X } from 'lucide-react-native'
import React from 'react'
import { Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'

interface MemberActionModalProps {
  visible: boolean
  memberName: string
  currentRole: UserRole
  onMakeCaptain: () => void
  onMakeSubCaptain: () => void
  onDemoteToPlayer: () => void
  onKick: () => void
  onCancel: () => void
}

export function MemberActionModal({
  visible,
  memberName,
  currentRole,
  onMakeCaptain,
  onMakeSubCaptain,
  onDemoteToPlayer,
  onKick,
  onCancel,
}: MemberActionModalProps) {
  return (
    <Modal transparent visible={visible} animationType='fade' onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className='flex-1 bg-black/70 justify-end'>
          <TouchableWithoutFeedback>
            <View className='bg-gray-900 rounded-t-3xl p-6 pb-10 border-t-2 border-gray-800'>
              {/* Header */}
              <View className='flex-row justify-between items-center mb-6'>
                <Text className='text-white font-title text-xl'>Gestionar Miembro</Text>
                <TouchableOpacity onPress={onCancel} className='p-2 -mr-2'>
                  <X size={24} color='#9CA3AF' strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <Text className='text-gray-400 font-body mb-6'>
                Acciones para <Text className='text-white font-bold'>{memberName}</Text>
              </Text>

              {/* OPTION 1: Transfer Captaincy */}
              <TouchableOpacity
                onPress={onMakeCaptain}
                className='flex-row items-center bg-gray-800/50 p-4 rounded-xl mb-3 border-2 border-gray-700 active:border-yellow-500/50'
              >
                <View className='bg-yellow-500/20 p-2.5 rounded-lg mr-4'>
                  <Crown size={20} color='#EAB308' strokeWidth={2.5} />
                </View>
                <View className='flex-1'>
                  <Text className='text-white font-bold text-base'>Ceder Capitanía</Text>
                  <Text className='text-gray-400 text-xs mt-0.5'>
                    Le darás el control total. Tú serás jugador.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* OPTION 2: Sub-Captain Management */}
              {currentRole === UserRole.SUB_ADMIN ? (
                // If already Sub-Captain -> Offer to Demote
                <TouchableOpacity
                  onPress={onDemoteToPlayer}
                  className='flex-row items-center bg-gray-800/50 p-4 rounded-xl mb-3 border-2 border-gray-700 active:border-gray-500/50'
                >
                  <View className='bg-gray-600/20 p-2.5 rounded-lg mr-4'>
                    <ArrowDown size={20} color='#9CA3AF' strokeWidth={2.5} />
                  </View>
                  <View className='flex-1'>
                    <Text className='text-white font-bold text-base'>Degradar a Jugador</Text>
                    <Text className='text-gray-400 text-xs mt-0.5'>
                      Perderá los privilegios de gestión.
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                // If Player -> Offer Sub-Captain
                <TouchableOpacity
                  onPress={onMakeSubCaptain}
                  className='flex-row items-center bg-gray-800/50 p-4 rounded-xl mb-3 border-2 border-gray-700 active:border-gray-300/50'
                >
                  <View className='bg-gray-300/20 p-2.5 rounded-lg mr-4'>
                    <Shield size={20} color='#E5E7EB' strokeWidth={2.5} />
                  </View>
                  <View className='flex-1'>
                    <Text className='text-white font-bold text-base'>Nombrar Sub-Capitán</Text>
                    <Text className='text-gray-400 text-xs mt-0.5'>
                      Podrá gestionar el equipo en tu ausencia.
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* OPTION 3: Kick Player */}
              <TouchableOpacity
                onPress={onKick}
                className='flex-row items-center bg-red-900/20 p-4 rounded-xl border-2 border-red-500/30 active:bg-red-900/40'
              >
                <View className='bg-red-500/20 p-2.5 rounded-lg mr-4'>
                  <UserMinus size={20} color='#EF4444' strokeWidth={2.5} />
                </View>
                <View className='flex-1'>
                  <Text className='text-red-400 font-bold text-base'>Expulsar del Equipo</Text>
                  <Text className='text-red-400/80 text-xs mt-0.5'>
                    El usuario perderá acceso al equipo.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
