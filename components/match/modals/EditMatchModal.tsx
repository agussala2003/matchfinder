import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { X } from 'lucide-react-native'
import React from 'react'
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface EditMatchModalProps {
    visible: boolean
    onClose: () => void
    onConfirm: () => void
    propDate: Date
    propTime: Date
    propVenue: string
    setPropVenue: (v: string) => void
    onShowDatePicker: () => void
    onShowTimePicker: () => void
}

export function EditMatchModal({
    visible,
    onClose,
    onConfirm,
    propDate,
    propTime,
    propVenue,
    setPropVenue,
    onShowDatePicker,
    onShowTimePicker,
}: EditMatchModalProps) {
    const insets = useSafeAreaInsets()

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/80 justify-end">
                <View
                    className="bg-card rounded-t-3xl border-t border-border overflow-hidden"
                    style={{ paddingBottom: Math.max(insets.bottom, 20) }}
                >
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                        <Text className="text-foreground font-title text-xl">Gestionar Reserva</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="p-6 gap-4" contentContainerStyle={{ paddingBottom: 40 }}>
                        <Text className="text-muted-foreground text-sm mb-2 leading-5">
                            Confirma la sede y hora definitivas. Esto marcará el partido como Reservado/Confirmado.
                        </Text>

                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Fecha Acordada</Text>
                                <TouchableOpacity
                                    onPress={onShowDatePicker}
                                    className="bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between"
                                >
                                    <Text className="text-foreground">{format(propDate, 'dd/MM/yyyy')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Hora</Text>
                                <TouchableOpacity
                                    onPress={onShowTimePicker}
                                    className="bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between"
                                >
                                    <Text className="text-foreground">{format(propTime, 'HH:mm')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-muted-foreground text-xs mb-2 ml-1">
                                Sede (Ubicación de Cancha)
                            </Text>
                            <TextInput
                                className="bg-card h-14 rounded-xl border border-border px-4 text-foreground focus:border-primary"
                                placeholder="Ej: Canchas Norte..."
                                placeholderTextColor="#6B7280"
                                value={propVenue}
                                onChangeText={setPropVenue}
                            />
                        </View>

                        <Button title="Confirmar Reserva" variant="primary" onPress={onConfirm} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}
