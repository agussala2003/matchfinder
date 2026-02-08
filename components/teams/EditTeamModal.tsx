import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ZONAS_AMBA } from '@/lib/constants'
import { Team } from '@/types/teams'
import { X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

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

  // Resetear valores cuando se abre el modal
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
        <View className='flex-1 bg-black/80 justify-center px-6'>
          <TouchableWithoutFeedback>
            <View className='bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl'>
              {/* Header */}
              <View className='flex-row justify-between items-center mb-6'>
                <Text className='text-white font-title text-xl uppercase'>Editar Equipo</Text>
                <TouchableOpacity onPress={onCancel}>
                  <X size={24} color='#6B7280' />
                </TouchableOpacity>
              </View>

              {/* Input: Nombre */}
              <View className='mb-4'>
                <Text className='text-gray-400 text-xs font-bold uppercase mb-2 ml-1'>
                  Nombre del Equipo
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className='bg-gray-800 text-white p-4 rounded-xl border border-gray-700 font-body text-base'
                  placeholderTextColor='#6B7280'
                />
              </View>

              {/* Select: Zona */}
              <View className='mb-6'>
                <Select
                  label='Zona / Barrio'
                  value={homeZone}
                  options={ZONAS_AMBA.map((zona) => ({ label: zona, value: zona }))}
                  onChange={setHomeZone}
                  placeholder='Seleccionar zona...'
                />
              </View>

              {/* Select: Categoría */}
              <View className='mb-8'>
                <Text className='text-gray-400 text-xs font-bold uppercase mb-3 ml-1'>
                  Categoría
                </Text>
                <View className='flex-row gap-2'>
                  {['MALE', 'FEMALE', 'MIXED'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat as any)}
                      className={`flex-1 py-3 rounded-xl border ${
                        category === cat
                          ? 'bg-primary border-primary'
                          : 'bg-gray-800 border-gray-700'
                      } items-center justify-center`}
                    >
                      <Text
                        className={`font-bold text-xs uppercase ${category === cat ? 'text-black' : 'text-gray-400'}`}
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
