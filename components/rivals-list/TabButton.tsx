import React from 'react'
import { Text, TouchableOpacity } from 'react-native'

interface TabButtonProps {
  title: string
  isActive: boolean
  onPress: () => void
}

export const TabButton = ({ title, isActive, onPress }: TabButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    className={`mr-6 pb-3 ${isActive ? 'border-b-2 border-primary' : 'opacity-40'}`}
  >
    <Text className={`font-title text-lg ${isActive ? 'text-primary' : 'text-text-muted'}`}>
      {title}
    </Text>
  </TouchableOpacity>
)