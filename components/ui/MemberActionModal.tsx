import { UserRole } from '@/types/core';
import { ArrowDown, Crown, Shield, UserMinus, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface MemberActionModalProps {
  visible: boolean;
  memberName: string;
  currentRole: UserRole; 
  onMakeCaptain: () => void;
  onMakeSubCaptain: () => void;
  onDemoteToPlayer: () => void;
  onKick: () => void;
  onCancel: () => void;
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
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/80 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-gray-900 rounded-t-3xl p-6 pb-10 border-t border-gray-800">
              
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-title text-xl">Gestionar Miembro</Text>
                <TouchableOpacity onPress={onCancel}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text className="text-gray-400 font-body mb-6">
                Acciones para <Text className="text-white font-bold">{memberName}</Text>
              </Text>

              {/* OPCIÓN 1: CEDER CAPITANÍA (Siempre disponible) */}
              <TouchableOpacity 
                onPress={onMakeCaptain}
                className="flex-row items-center bg-gray-800 p-4 rounded-xl mb-3 active:bg-gray-700"
              >
                <View className="bg-yellow-500/20 p-2 rounded-full mr-4">
                    <Crown size={20} color="#EAB308" />
                </View>
                <View>
                    <Text className="text-white font-bold text-base">Ceder Capitanía</Text>
                    <Text className="text-gray-500 text-xs">Le darás el control total. Tú serás jugador.</Text>
                </View>
              </TouchableOpacity>

              {/* OPCIÓN 2: GESTIÓN DE SUB-CAPITÁN */}
              {currentRole === UserRole.SUB_ADMIN ? (
                  // Si YA ES Sub-Capitán -> Ofrecer Degradar
                  <TouchableOpacity 
                    onPress={onDemoteToPlayer}
                    className="flex-row items-center bg-gray-800 p-4 rounded-xl mb-3 active:bg-gray-700"
                  >
                    <View className="bg-gray-600/20 p-2 rounded-full mr-4">
                        <ArrowDown size={20} color="#9CA3AF" />
                    </View>
                    <View>
                        <Text className="text-white font-bold text-base">Degradar a Jugador</Text>
                        <Text className="text-gray-500 text-xs">Perderá los privilegios de gestión.</Text>
                    </View>
                  </TouchableOpacity>
              ) : (
                  // Si ES Jugador -> Ofrecer Sub-Capitán
                  <TouchableOpacity 
                    onPress={onMakeSubCaptain}
                    className="flex-row items-center bg-gray-800 p-4 rounded-xl mb-3 active:bg-gray-700"
                  >
                    <View className="bg-blue-500/20 p-2 rounded-full mr-4">
                        <Shield size={20} color="#60A5FA" />
                    </View>
                    <View>
                        <Text className="text-white font-bold text-base">Nombrar Sub-Capitán</Text>
                        <Text className="text-gray-500 text-xs">Podrá gestionar el equipo en tu ausencia.</Text>
                    </View>
                  </TouchableOpacity>
              )}

              {/* OPCIÓN 3: EXPULSAR */}
              <TouchableOpacity 
                onPress={onKick}
                className="flex-row items-center bg-red-950/20 p-4 rounded-xl border border-red-900/30 active:bg-red-900/30"
              >
                <View className="bg-red-500/20 p-2 rounded-full mr-4">
                    <UserMinus size={20} color="#EF4444" />
                </View>
                <View>
                    <Text className="text-red-500 font-bold text-base">Expulsar del Equipo</Text>
                    <Text className="text-red-400/60 text-xs">El usuario perderá acceso al equipo.</Text>
                </View>
              </TouchableOpacity>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}