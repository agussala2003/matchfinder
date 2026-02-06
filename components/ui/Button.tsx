import { View } from 'lucide-react-native'
import React from 'react'
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native'

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
    primary: { container: 'bg-primary border-transparent', text: 'text-black font-title' },
    secondary: { container: 'bg-gray-800 border-gray-700', text: 'text-white font-title' },
    outline: { container: 'bg-transparent border-primary', text: 'text-primary font-title' },
    ghost: { container: 'bg-transparent border-transparent', text: 'text-gray-400 font-body' },
    danger: { container: 'bg-red-900/20 border-red-900/50', text: 'text-red-500 font-title' },
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
