import React from 'react'
import { Text, View } from 'react-native'

interface DetailRowProps {
  label: string
  value: string
  highlight?: boolean
}

export const DetailRow = ({ label, value, highlight }: DetailRowProps) => (
  <View className="flex-row justify-between items-center py-2.5 border-b border-border/30">
    <Text className="text-muted-foreground">{label}</Text>
    <Text className={`font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</Text>
  </View>
)