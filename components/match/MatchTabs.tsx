import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface MatchTabsProps {
  activeTab: 'details' | 'lineup' | 'chat'
  onTabPress: (tab: 'details' | 'lineup' | 'chat') => void
}

export const MatchTabs = ({ activeTab, onTabPress }: MatchTabsProps) => (
  <View className="flex-row mx-4 bg-secondary p-1 rounded-xl mb-3 border border-border">
    {(['chat', 'lineup', 'details'] as const).map((tab) => (
      <TouchableOpacity
        key={tab}
        onPress={() => onTabPress(tab)}
        className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab ? 'bg-card border border-primary/40' : ''
          }`}
      >
        <Text
          className={`text-xs font-bold uppercase ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'
            }`}
        >
          {tab === 'lineup' ? 'Citados' : tab === 'details' ? 'Detalles' : 'Chat'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)