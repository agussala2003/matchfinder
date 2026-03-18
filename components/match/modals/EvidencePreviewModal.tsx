import React from 'react'
import { ActivityIndicator, Image, Modal, Text, TouchableOpacity, View } from 'react-native'

interface EvidencePreviewModalProps {
  visible: boolean
  evidenceUri: string | null
  isLoading: boolean
  onRetake: () => void
  onConfirm: () => void
  onDismiss: () => void
}

export function EvidencePreviewModal({
  visible,
  evidenceUri,
  isLoading,
  onRetake,
  onConfirm,
  onDismiss,
}: EvidencePreviewModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View className="flex-1 bg-black/70 justify-center items-center px-4">
        {/* Preview Card */}
        <View className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
          {/* Image Preview */}
          {evidenceUri && (
            <Image
              source={{ uri: evidenceUri }}
              className="w-full h-80 bg-gray-200"
              resizeMode="cover"
            />
          )}

          {/* Content */}
          <View className="p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Verificar Foto
            </Text>
            <Text className="text-gray-600 mb-6">
              Revisa que la foto sea clara y completa antes de enviar como evidencia de W.O.
            </Text>

            {/* Buttons */}
            <View className="flex-row gap-3">
              {/* Retake Button */}
              <TouchableOpacity
                onPress={onRetake}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-gray-100 rounded-lg items-center justify-center disabled:opacity-50"
              >
                <Text className="text-gray-700 font-semibold">Sacar de Nuevo</Text>
              </TouchableOpacity>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={onConfirm}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-green-600 rounded-lg items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Confirmar y Enviar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Close Button (subtle) */}
            {!isLoading && (
              <TouchableOpacity onPress={onDismiss} className="mt-4 py-2">
                <Text className="text-center text-gray-500 text-sm">Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}
