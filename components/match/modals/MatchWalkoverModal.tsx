import { Button } from '@/components/ui/Button'
import { AlertTriangle, Camera, Circle, X } from 'lucide-react-native'
import React from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { EdgeInsets } from 'react-native-safe-area-context'

interface MatchWalkoverModalProps {
  visible: boolean
  insets: EdgeInsets
  onClose: () => void
  onTakeEvidence: () => void
}

export function MatchWalkoverModal({
  visible,
  insets,
  onClose,
  onTakeEvidence,
}: MatchWalkoverModalProps) {
  return (
    <Modal visible={visible} animationType='slide'>
      <View className='flex-1 bg-background' style={{ paddingTop: insets.top }}>
        <View className='flex-row items-center justify-between border-b-2 border-border p-4'>
          <Text className='font-title text-xl text-foreground'>Validar W.O.</Text>
          <TouchableOpacity onPress={onClose} className='-mr-2 p-2'>
            <X size={24} color='#FBFBFB' strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View className='flex-1 p-6'>
          <View className='relative mb-6 flex-1 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary'>
            <Camera size={64} color='#6B7280' strokeWidth={2} />
            <Text className='mt-4 font-medium text-muted-foreground'>Vista Previa Cámara</Text>
            <View className='absolute top-4 rounded-full bg-black/60 px-4 py-2'>
              <Text className='text-xs font-medium text-white'>Asegúrate que se vea la cancha</Text>
            </View>
          </View>

          <View className='mb-6 gap-4'>
            <View className='flex-row items-center gap-3'>
              <Circle size={16} color='#6B7280' strokeWidth={2} />
              <Text className='text-muted-foreground'>Selfie con al menos 2 compañeros</Text>
            </View>
            <View className='flex-row items-center gap-3'>
              <Circle size={16} color='#6B7280' strokeWidth={2} />
              <Text className='text-muted-foreground'>Cancha visible de fondo</Text>
            </View>
          </View>

          <View className='mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3'>
            <View className='flex-row items-center gap-2'>
              <AlertTriangle size={16} color='#EAB308' strokeWidth={2} />
              <Text className='text-xs text-warning'>La evidencia será usada para validar el reclamo.</Text>
            </View>
          </View>

          <Button
            title='TOMAR FOTO Y RECLAMAR'
            variant='primary'
            onPress={onTakeEvidence}
            className='h-14'
          />
        </View>
      </View>
    </Modal>
  )
}
