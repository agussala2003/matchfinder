import { Copy } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface ShareCodeSectionProps {
  shareCode: string
  onCopyCode: () => void
}

export const ShareCodeSection = ({ shareCode, onCopyCode }: ShareCodeSectionProps) => (
  <View className="items-center px-4">
    <TouchableOpacity
      onPress={onCopyCode}
      activeOpacity={0.7}
      className="flex-row items-center gap-1"
    >
      <Text className="text-gray-500 uppercase tracking-wide">
        Código: <Text className="text-primary font-mono">{shareCode}</Text>
      </Text>
      <Copy size={14} color="#39FF14" strokeWidth={2} />
    </TouchableOpacity>
  </View>
)