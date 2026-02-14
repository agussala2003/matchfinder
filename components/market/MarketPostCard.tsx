import { POSICIONES_ARGENTINAS, Posicion } from '@/lib/constants'
import { MarketPost } from '@/types/market'
import { MapPin, MessageCircle, Shield, Trash2, User } from 'lucide-react-native'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

interface MarketPostCardProps {
    item: MarketPost
    currentUserId: string | null
    onContact: (post: MarketPost) => void
    onViewStats: (post: MarketPost) => void
    onDelete?: (id: string) => void
}

export const MarketPostCard = ({
    item,
    currentUserId,
    onContact,
    onViewStats,
    onDelete,
}: MarketPostCardProps) => {
    const isTeamPost = item.type === 'TEAM_SEEKING_PLAYER'
    const title = isTeamPost ? item.team?.name || 'Equipo' : item.profile?.full_name || 'Jugador'
    // const subtitle = isTeamPost ? 'Busca Jugador/a' : 'Busca Equipo' // Removed based on new layout preference

    // Parse position
    const rawPosition = item.position_needed as Posicion
    const role = POSICIONES_ARGENTINAS[rawPosition] || item.position_needed || 'Cualquiera'

    const imageUrl = isTeamPost ? item.team?.logo_url : item.profile?.avatar_url
    const isOwner = item.user_id === currentUserId

    // Derived values for the new layout
    const location = item.team?.home_zone || 'Zona desconocida'
    const category = item.team?.category || 'Sin categoría'
    const locationLine = isTeamPost ? `${location} - ${category}` : (item.profile?.position || 'Jugador')

    return (
        <View className='bg-card rounded-2xl border border-border mb-4 overflow-hidden relative'>
            {/* Accent Status Bar */}
            <View className={`h-1.5 w-full ${isTeamPost ? 'bg-accent' : 'bg-primary'}`} />

            {/* Top Right Actions (Delete) */}
            {isOwner && onDelete && (
                <View className="absolute top-4 right-4 z-10">
                    <TouchableOpacity
                        onPress={() => onDelete(item.id)}
                        className='bg-destructive/10 p-2 rounded-full border border-destructive/20 active:bg-destructive/20'
                    >
                        <Trash2 size={18} color='#EF4444' strokeWidth={2} />
                    </TouchableOpacity>
                </View>
            )}

            <View className='p-5 pt-6 items-center'>
                {/* 1. Avatar */}
                <View className='mb-3 relative'>
                    <View className='w-20 h-20 bg-secondary rounded-full items-center justify-center border-2 border-border overflow-hidden'>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} className='w-full h-full' resizeMode='cover' />
                        ) : isTeamPost ? (
                            <Shield size={32} color='#A1A1AA' strokeWidth={2} />
                        ) : (
                            <User size={32} color='#A1A1AA' strokeWidth={2} />
                        )}
                    </View>
                </View>

                {/* 2. Content Stack */}
                <View className='w-full mb-5'>
                    {isTeamPost ? (
                        // Layout para equipos: datos uno debajo del otro, alineados a la izquierda
                        <View className='w-full'>
                            {/* Row 1: Name */}
                            <Text className='text-foreground font-title text-xl mb-2' numberOfLines={1}>
                                {title}
                            </Text>

                            {/* Row 2: Location/Category */}
                            <View className='flex-row items-center gap-1.5 mb-2'>
                                <MapPin size={14} color='#A1A1AA' />
                                <Text className='text-muted-foreground text-sm font-medium'>
                                    {locationLine}
                                </Text>
                            </View>

                            {/* Row 3: Position Needed */}
                            <Text className='text-accent font-semibold text-sm mb-2'>
                                Busca: {role}
                            </Text>

                            {/* Row 4: Description */}
                            {item.description && (
                                <Text className='text-muted-foreground text-sm leading-5 mb-2'>
                                    "{item.description}"
                                </Text>
                            )}
                        </View>
                    ) : (
                        // Layout para jugadores: centrado como antes
                        <View className='items-center w-full'>
                            {/* Row 1: Name */}
                            <Text className='text-foreground font-title text-xl text-center mb-1' numberOfLines={1}>
                                {title}
                            </Text>

                            {/* Row 2: Player Info */}
                            <Text className='text-muted-foreground text-sm font-medium mb-2'>
                                {locationLine}
                            </Text>

                            {/* Row 3: Position Needed */}
                            <View className='bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg mb-3'>
                                <Text className='text-primary text-xs font-bold uppercase'>
                                    Busca Equipo: {role}
                                </Text>
                            </View>

                            {/* Row 4: Description */}
                            {item.description && (
                                <Text className='text-muted-foreground text-sm leading-5 italic text-center px-2'>
                                    "{item.description}"
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Actions */}
                {!isOwner ? (
                    <View className='flex-row w-full gap-3'>
                        <TouchableOpacity
                            onPress={() => onContact(item)}
                            className='flex-1 bg-primary h-12 rounded-xl flex-row items-center justify-center gap-2 active:bg-primary/80 shadow-sm'
                        >
                            <MessageCircle size={20} color='#121217' strokeWidth={2.5} />
                            <Text className='text-primary-foreground font-bold text-base'>CONTACTAR</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => onViewStats(item)}
                            className='bg-secondary border border-border h-12 px-4 rounded-xl flex-row items-center justify-center gap-2 active:bg-secondary/80'
                        >
                            <Text className='text-foreground font-semibold text-sm'>STATS</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className='bg-secondary/50 px-4 py-2 rounded-lg'>
                        <Text className='text-muted-foreground text-xs'>Tu publicación</Text>
                    </View>
                )}
            </View>
        </View>
    )
}