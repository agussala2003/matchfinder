import React from 'react'
import { View, ViewProps } from 'react-native'

interface CardProps extends ViewProps {
  children: React.ReactNode
  variant?: 'default' | 'glass' | 'highlight'
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  const variants = {
    default: 'bg-card border-gray-800',
    glass: 'bg-card/80 backdrop-blur-xl border-gray-800/50',
    highlight: 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700',
  }

  return (
    <View
      className={`
        p-4 rounded-2xl border shadow-sm
        ${variants[variant]} 
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </View>
  )
}
