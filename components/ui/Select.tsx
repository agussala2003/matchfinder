import { Check, ChevronDown, X } from 'lucide-react-native'
import React, { useState } from 'react'
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native'

export interface SelectOption {
  label: string
  value: string
}

interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: any) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar...',
  error,
  disabled = false,
}: SelectProps) {
  const [visible, setVisible] = useState(false)

  // Buscamos la etiqueta correspondiente al valor actual
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <View>
      {/* Label superior */}
      <Text className='text-text-muted text-xs uppercase font-semibold tracking-wide mb-2 pl-1'>
        {label}
      </Text>

      {/* Campo Trigger */}
      <TouchableOpacity
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
        className={`
          bg-card px-4 h-[60px] rounded-xl border
          flex-row items-center justify-between
          ${error ? 'border-red-500/50' : 'border-gray-700'}
          ${disabled ? 'opacity-50' : 'active:border-primary/50'}
        `}
      >
        <Text
          className={`text-base flex-1 mr-2 ${selectedOption ? 'text-white font-medium' : 'text-gray-500'}`}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown
          size={18}
          color={disabled ? '#4B5563' : error ? '#EF4444' : '#9CA3AF'}
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      {/* Mensaje de Error */}
      {error && (
        <View className='mt-2 ml-1'>
          <Text className='text-red-500 text-xs font-medium'>{error}</Text>
        </View>
      )}

      {/* Modal de Selección */}
      <Modal
        visible={visible}
        animationType='slide'
        transparent
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <View className='flex-1 bg-black/70 justify-end'>
          <View className='bg-gray-900 rounded-t-3xl border-gray-800' style={{ maxHeight: '75%' }}>
            {/* Header del Modal */}
            <View className='px-5 py-4 border-b border-gray-800 flex-row justify-between items-center'>
              <View className='flex-1'>
                <Text className='text-white font-title text-lg'>{label}</Text>
                <Text className='text-gray-500 text-xs mt-0.5'>
                  {options.length} {options.length === 1 ? 'opción' : 'opciones'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                className='w-10 h-10 items-center justify-center rounded-lg bg-gray-800/50 active:bg-gray-800'
              >
                <X size={20} color='#9CA3AF' strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Lista de Opciones */}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 50,
              }}
              showsVerticalScrollIndicator={true}
              indicatorStyle='white'
              bounces={true}
              renderItem={({ item }) => {
                const isSelected = item.value === value

                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.value)
                      setVisible(false)
                    }}
                    activeOpacity={0.7}
                    className={`
                      px-4 py-4 rounded-xl mb-2
                      border-2 flex-row justify-between items-center
                      ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-gray-800/30 border-gray-700/50 active:bg-gray-800/60'
                      }
                    `}
                  >
                    <View className='flex-1 mr-3'>
                      <Text
                        className={`text-base font-semibold ${
                          isSelected ? 'text-primary' : 'text-white'
                        }`}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>

                      {/* Mostrar código si es diferente al label */}
                      {item.value !== item.label && (
                        <Text className='text-gray-600 text-xs font-mono mt-0.5 uppercase'>
                          {item.value}
                        </Text>
                      )}
                    </View>

                    {/* Indicador de selección */}
                    {isSelected && (
                      <View className='w-6 h-6 bg-primary rounded-full items-center justify-center flex-shrink-0'>
                        <Check size={14} color='#000' strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}
