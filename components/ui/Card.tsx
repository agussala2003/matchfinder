import React from 'react'
import { View, ViewProps } from 'react-native'

interface CardProps extends ViewProps {
  children: React.ReactNode
  variant?: 'default' | 'glass' | 'highlight'
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  const variants = {
    default: 'bg-card border-border',
    glass: 'bg-card/80 backdrop-blur-xl border-border/50',
    highlight: 'bg-secondary border-border',
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
