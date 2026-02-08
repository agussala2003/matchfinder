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
      <Text className='text-gray-400 font-title mb-2 uppercase text-xs pl-1'>{label}</Text>

      {/* Campo Trigger */}
      <TouchableOpacity
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={disabled ? 1 : 0.7}
        className={`bg-gray-800 p-4 h-[60px] rounded-xl border flex-row items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-700'
        } ${disabled ? 'opacity-50' : 'active:border-primary'}`}
      >
        <Text className={`text-base font-body ${selectedOption ? 'text-white' : 'text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={disabled ? '#444' : '#666'} />
      </TouchableOpacity>

      {/* Mensaje de Error */}
      {error && <Text className='text-red-500 font-body text-xs mt-1 ml-1'>{error}</Text>}

      {/* Modal de Selección */}
      <Modal
        visible={visible}
        animationType='slide'
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View className='flex-1 bg-black/80 justify-end'>
          <View className='bg-gray-900 rounded-t-3xl max-h-[70%] pb-8 border-t border-gray-800'>
            {/* Header del Modal */}
            <View className='p-4 border-b border-gray-800 flex-row justify-between items-center'>
              <Text className='text-white font-title text-xl ml-2'>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)} className='p-2'>
                <X size={24} color='#9CA3AF' />
              </TouchableOpacity>
            </View>

            {/* Lista de Opciones */}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.value)
                    setVisible(false)
                  }}
                  className={`p-4 border-b border-gray-800 rounded-lg flex-row justify-between items-center mb-2 ${
                    item.value === value ? 'bg-gray-800' : 'active:bg-gray-800'
                  }`}
                >
                  <View>
                    <Text
                      className={`text-lg font-body ${
                        item.value === value ? 'text-primary' : 'text-white'
                      }`}
                    >
                      {item.label}
                    </Text>
                    {/* Mostrar código si es diferente al label */}
                    {item.value !== item.label && (
                      <Text className='text-gray-500 text-xs font-title uppercase mt-1'>
                        {item.value}
                      </Text>
                    )}
                  </View>

                  {item.value === value && <Check size={20} color='#39FF14' />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}
