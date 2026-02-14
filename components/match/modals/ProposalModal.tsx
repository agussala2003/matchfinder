import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { Calendar, Clock, X } from 'lucide-react-native'
import React from 'react'
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ProposalModalProps {
    visible: boolean
    onClose: () => void
    onSend: () => void
    propDate: Date
    // setPropDate: (date: Date) => void // Removed as unused 
    // Parent handles DatePicker visibility, so simple props for now or move DatePicker here?
    // Moving DatePicker here is better for encapsulation but might be tricky with platform specifics if not careful.
    // Let's keep it simple: Pass values and triggers or pass just the state setters if passing logic.
    // Ideally this component should own its UI state (modality, duration) but date picking often requires a global or parent picker in RN if using native one.
    // For now let's pass all props to minimize refactor risk.

    propTime: Date
    propModality: string
    setPropModality: React.Dispatch<React.SetStateAction<string>>
    propDuration: string
    setPropDuration: React.Dispatch<React.SetStateAction<string>>
    propIsFriendly: boolean
    setPropIsFriendly: React.Dispatch<React.SetStateAction<boolean>>

    onShowDatePicker: () => void
    onShowTimePicker: () => void
}

export function ProposalModal({
    visible,
    onClose,
    onSend,
    propDate,
    propTime,
    propModality,
    setPropModality,
    propDuration,
    setPropDuration,
    propIsFriendly,
    setPropIsFriendly,
    onShowDatePicker,
    onShowTimePicker,
}: ProposalModalProps) {
    const insets = useSafeAreaInsets()

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/80 justify-end">
                <View
                    className="bg-card rounded-t-3xl border-t border-border overflow-hidden"
                    style={{ paddingBottom: Math.max(insets.bottom, 20) }}
                >
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
                        <View className="flex-row items-center gap-3">
                            <View className="bg-warning/20 p-2 rounded-lg">
                                <Calendar size={24} color="#EAB308" strokeWidth={2} />
                            </View>
                            <Text className="text-foreground font-title text-xl">Proponer Fecha</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                            <X size={24} color="#A1A1AA" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="p-6 gap-4" contentContainerStyle={{ paddingBottom: 40 }}>
                        {/* Fechas */}
                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Fecha</Text>
                                <TouchableOpacity
                                    onPress={onShowDatePicker}
                                    className="bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between active:border-primary"
                                >
                                    <Text className="text-foreground">{format(propDate, 'dd/MM/yyyy')}</Text>
                                    <Calendar size={20} color="#A1A1AA" strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Hora</Text>
                                <TouchableOpacity
                                    onPress={onShowTimePicker}
                                    className="bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between active:border-primary"
                                >
                                    <Text className="text-foreground">{format(propTime, 'HH:mm')}</Text>
                                    <Clock size={20} color="#A1A1AA" strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Tipo */}
                        <View className="mb-4">
                            <Text className="text-muted-foreground text-xs mb-2 ml-1">Tipo de Partido</Text>
                            <View className="flex-row bg-card rounded-xl border border-border p-1">
                                <TouchableOpacity
                                    onPress={() => setPropIsFriendly(false)}
                                    className={`flex-1 py-3 rounded-lg items-center ${!propIsFriendly ? 'bg-primary' : ''}`}
                                >
                                    <Text
                                        className={`font-bold text-xs ${!propIsFriendly ? 'text-background' : 'text-muted-foreground'}`}
                                    >
                                        Por los Puntos
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setPropIsFriendly(true)}
                                    className={`flex-1 py-3 rounded-lg items-center ${propIsFriendly ? 'bg-primary' : ''}`}
                                >
                                    <Text
                                        className={`font-bold text-xs ${propIsFriendly ? 'text-background' : 'text-muted-foreground'}`}
                                    >
                                        Amistoso
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Modalidad y Duración */}
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Modalidad</Text>
                                <TouchableOpacity
                                    onPress={() =>
                                        setPropModality((m) =>
                                            m === 'Fútbol 5' ? 'Fútbol 7' : m === 'Fútbol 7' ? 'Fútbol 11' : 'Fútbol 5'
                                        )
                                    }
                                    className="bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between"
                                >
                                    <Text className="text-foreground">{propModality}</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Text className="text-muted-foreground text-xs mb-2 ml-1">Duración</Text>
                                <TouchableOpacity
                                    onPress={() => setPropDuration((d) => (d === '60 min' ? '90 min' : '60 min'))}
                                    className="bg-card h-14 rounded-xl border border-border px-4 flex-row items-center justify-between"
                                >
                                    <Text className="text-foreground">{propDuration}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="gap-3">
                            <Button title="Enviar Propuesta" variant="primary" onPress={onSend} />
                            <Button title="Cancelar" variant="secondary" onPress={onClose} />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}
