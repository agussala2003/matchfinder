import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * Componente reutilizable para inputs de autenticación
 * Maneja estilos consistentes, labels y mensajes de error
 */
export function AuthInput({
  label,
  error,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType,
  ...rest
}: AuthInputProps) {
  return (
    <View>
      <Text className="text-gray-400 font-title mb-2 uppercase text-xs">{label}</Text>
      <TextInput
        // CAMBIO: Agregado 'h-[60px]' para altura fija y 'text-lg' para coincidir con el Select
        className={`bg-card text-white p-4 h-[60px] text-lg rounded-xl border font-body ${
          error ? 'border-red-500' : 'border-gray-800 focus:border-primary'
        }`}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        {...rest}
      />
      {error && (
        <Text className="text-red-500 font-body text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
}