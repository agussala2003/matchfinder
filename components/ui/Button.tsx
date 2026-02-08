import React from 'react'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  loading?: boolean
  variant?: ButtonVariant
  icon?: React.ReactNode
}

export function Button({
  title,
  loading = false,
  variant = 'primary',
  icon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const styles = {
    primary: { container: 'bg-primary border-transparent', text: 'text-background font-title' },
    secondary: { container: 'bg-modal border-border', text: 'text-text-main font-title' },
    outline: { container: 'bg-transparent border-border', text: 'text-text-main font-title' },
    ghost: { container: 'bg-transparent border-transparent', text: 'text-text-muted font-body' },
    danger: { container: 'bg-error/20 border-error/50', text: 'text-error font-title' },
  }

  const currentStyle = styles[variant]

  return (
    <TouchableOpacity
      disabled={loading || disabled}
      className={`
        flex-row items-center justify-center 
        p-4 rounded-xl border
        ${currentStyle.container}
        ${loading || disabled ? 'opacity-50' : 'active:opacity-90'}
        ${className || ''}
      `}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'black' : 'white'} />
      ) : (
        <>
          {icon && <View className='mr-2'>{icon}</View>}
          <Text className={`${currentStyle.text} text-base uppercase tracking-wide`}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}
