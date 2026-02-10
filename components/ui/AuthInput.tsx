import React from 'react'
import { Text, TextInput, TextInputProps, View } from 'react-native'

interface AuthInputProps extends TextInputProps {
  label: string
  error?: string
  icon?: React.ReactNode
}

export function AuthInput({
  label,
  error,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType,
  icon,
  ...rest
}: AuthInputProps) {
  return (
    <View>
      <Text className='text-text-muted text-xs uppercase font-bold mb-2 pl-1'>{label}</Text>

      <View className='relative'>
        <TextInput
          className={`bg-card text-text-main px-4 h-[60px] text-base rounded-xl border font-body ${
            error ? 'border-error' : 'border-border focus:border-primary'
          }`}
          placeholder={placeholder}
          placeholderTextColor='#A1A1AA'
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          {...rest}
        />

        {icon && <View className='absolute right-4 top-0 bottom-0 justify-center'>{icon}</View>}
      </View>

      {error && <Text className='text-error text-xs mt-1 ml-1'>{error}</Text>}
    </View>
  )
}
