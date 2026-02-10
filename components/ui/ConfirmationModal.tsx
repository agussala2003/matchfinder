import { Button } from '@/components/ui/Button'
import { AlertTriangle, Info } from 'lucide-react-native'
import React from 'react'
import { Modal, Text, TouchableWithoutFeedback, View } from 'react-native'

interface ConfirmationModalProps {
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Modal transparent visible={visible} animationType='fade' onRequestClose={onCancel}>
      {/* Overlay: Fondo negro con opacidad */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className='flex-1 bg-modal/80 justify-center items-center px-6'>
          {/* Modal Container: Evita que el click cierre el modal */}
          <TouchableWithoutFeedback>
            <View className='bg-modal border border-border w-full rounded-3xl p-6 shadow-2xl shadow-black'>
              {/* ICONO + TÍTULO */}
              <View className='items-center mb-5'>
                <View
                  className={`w-14 h-14 rounded-full items-center justify-center mb-4 border ${
                    variant === 'danger'
                      ? 'bg-error/10 border-error/20'
                      : 'bg-primary/10 border-primary/20'
                  }`}
                >
                  {variant === 'danger' ? (
                    <AlertTriangle size={28} color='#EF4444' />
                  ) : (
                    <Info size={28} color='#39FF14' />
                  )}
                </View>

                <Text className='text-text-main font-title text-xl text-center uppercase tracking-wide'>
                  {title}
                </Text>
              </View>

              {/* MENSAJE */}
              <Text className='text-text-muted font-body text-center mb-8 leading-6 text-base px-2'>
                {message}
              </Text>

              {/* BOTONES */}
              <View className='flex-row gap-3'>
                <Button
                  title={cancelText}
                  variant='ghost' // 'ghost' o 'secondary' quedan bien aquí
                  onPress={onCancel}
                  className='flex-1 border border-border bg-transparent'
                />
                <Button
                  title={confirmText}
                  variant={variant}
                  onPress={onConfirm}
                  className='flex-1'
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
