import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ZONAS_AMBA } from '@/lib/constants'
import { Team } from '@/types/teams'
import { X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { AuthInput } from '../ui/AuthInput'

interface EditTeamModalProps {
  visible: boolean
  team: Team
  onSave: (updates: Partial<Team>) => Promise<void>
  onCancel: () => void
}

export function EditTeamModal({ visible, team, onSave, onCancel }: EditTeamModalProps) {
  const [name, setName] = useState<string>(team.name)
  const [homeZone, setHomeZone] = useState<(typeof ZONAS_AMBA)[number]>(team.home_zone)
  const [category, setCategory] = useState<'MALE' | 'FEMALE' | 'MIXED'>(team.category)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setName(team.name)
      setHomeZone(team.home_zone)
      setCategory(team.category)
    }
  }, [visible, team])

  const handleSave = async () => {
    setSaving(true)
    await onSave({ name, home_zone: homeZone, category })
    setSaving(false)
    onCancel()
  }

  return (
    <Modal transparent visible={visible} animationType='fade' onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className='flex-1 bg-modal/80 justify-center px-6'>
          <TouchableWithoutFeedback>
            <View className='bg-modal border border-border w-full rounded-3xl p-6 shadow-2xl shadow-black'>
              {/* Header */}
              <View className='flex-row justify-between items-center mb-6'>
                <Text className='text-white font-title text-xl uppercase'>Editar Equipo</Text>
                <TouchableOpacity onPress={onCancel} className='p-2 -mr-2'>
                  <X size={24} color='#9CA3AF' strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Input: Nombre */}
              <View className='mb-4'>
                <AuthInput
                  label='Nombre del Equipo'
                  placeholder='Ej: Los Galácticos FC'
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Select: Zona */}
              <View className='mb-4'>
                <Select
                  label='Zona / Barrio'
                  value={homeZone}
                  options={ZONAS_AMBA.map((zona) => ({ label: zona, value: zona }))}
                  onChange={(value) => setHomeZone(value as typeof homeZone)}
                  placeholder='Seleccionar zona...'
                />
              </View>

              {/* Select: Categoría */}
              <View className='mb-6'>
                <Text className='text-text-muted text-xs uppercase font-bold mb-2 pl-1'>
                  Categoría
                </Text>
                <View className='flex-row gap-2'>
                  {(['MALE', 'FEMALE', 'MIXED'] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                        category === cat ? 'bg-primary/10 border-primary' : 'bg-card border-border'
                      }`}
                    >
                      <Text
                        className={`font-bold text-sm uppercase ${
                          category === cat ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {cat === 'MALE' ? 'Masc' : cat === 'FEMALE' ? 'Fem' : 'Mixto'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View className='flex-row gap-3'>
                <Button
                  title='Cancelar'
                  variant='secondary'
                  onPress={onCancel}
                  disabled={saving}
                  className='flex-1'
                />
                <Button
                  title='Guardar'
                  variant='primary'
                  onPress={handleSave}
                  loading={saving}
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
