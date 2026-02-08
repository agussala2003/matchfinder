import { UserRole } from '@/types/core'
import { Crown, Shield } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md'
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1',
    md: 'px-2.5 py-1.5',
  }

  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
  }

  const iconSize = size === 'sm' ? 10 : 12

  // Role-based rendering configuration
  const roleConfig = {
    [UserRole.ADMIN]: {
      icon: <Crown size={iconSize} color='#EAB308' strokeWidth={2.5} />,
      label: 'CAPITÁN',
      textColor: 'text-gold',
      backgroundColor: 'bg-gold/20',
      borderColor: 'border-gold/40',
    },
    [UserRole.SUB_ADMIN]: {
      icon: <Shield size={iconSize} color='#E5E7EB' strokeWidth={2.5} />,
      label: 'SUB-CAP',
      textColor: 'text-silver',
      backgroundColor: 'bg-silver/20',
      borderColor: 'border-silver/40',
    },
    [UserRole.PLAYER]: {
      icon: null,
      label: 'JUGADOR',
      textColor: 'text-text-muted',
      backgroundColor: 'bg-modal/30',
      borderColor: 'border-gray-600',
    },
  }

  const config = roleConfig[role]

  return (
    <View
      className={`flex-row items-center gap-1 rounded-lg border ${sizeClasses[size]} ${config.backgroundColor} ${config.borderColor}`}
    >
      {config.icon}
      <Text className={`${config.textColor} ${textSizeClasses[size]} font-bold uppercase`}>
        {config.label}
      </Text>
    </View>
  )
}
