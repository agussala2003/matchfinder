import { POSICIONES_ARGENTINAS, Posicion } from '@/lib/constants'
import { MarketPost } from '@/types/market'
import { BarChart2, MapPin, MessageCircle, Shield, User } from 'lucide-react-native'
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
    const subtitle = isTeamPost ? 'Busca Jugador/a' : 'Busca Equipo'

    // Parse position
    const rawPosition = item.position_needed as Posicion
    const role = POSICIONES_ARGENTINAS[rawPosition] || item.position_needed || 'Cualquiera'

    const imageUrl = isTeamPost ? item.team?.logo_url : item.profile?.avatar_url
    const isOwner = item.user_id === currentUserId

    return (
        <View className='bg-card rounded-2xl border border-border mb-4 overflow-hidden'>
            {/* Accent Bar */}
            <View className={`h-1.5 w-full ${isTeamPost ? 'bg-accent' : 'bg-primary'}`} />

            <View className='p-6 items-center'>
                {/* Top Section: Avatar & Role Badge */}
                <View className='mb-4 relative'>
                    <View className='w-20 h-20 bg-secondary rounded-full items-center justify-center border-2 border-border overflow-hidden'>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} className='w-full h-full' resizeMode='cover' />
                        ) : isTeamPost ? (
                            <Shield size={32} color='#A1A1AA' strokeWidth={2} />
                        ) : (
                            <User size={32} color='#A1A1AA' strokeWidth={2} />
                        )}
                    </View>
                    <View className={`absolute -bottom-2 self-center px-3 py-1 rounded-full border ${isTeamPost ? 'bg-accent border-accent' : 'bg-primary border-primary'
                        }`}>
                        <Text className={`text-[10px] font-black uppercase ${isTeamPost ? 'text-accent-foreground' : 'text-primary-foreground'
                            }`}>
                            {subtitle}
                        </Text>
                    </View>
                </View>

                {/* Info Section */}
                <View className='items-center mb-4 w-full'>
                    <Text className='text-foreground font-title text-xl text-center mb-1' numberOfLines={1}>
                        {title}
                    </Text>

                    <View className='flex-row items-center justify-center gap-2 mb-3'>
                        <Text className='text-primary font-bold text-sm uppercase tracking-wide'>
                            {role}
                        </Text>
                        {item.team?.home_zone && (
                            <>
                                <Text className='text-muted-foreground text-xs'>•</Text>
                                <View className='flex-row items-center gap-1'>
                                    <MapPin size={12} color='#A1A1AA' strokeWidth={2} />
                                    <Text className='text-muted-foreground text-xs'>{item.team.home_zone}</Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Description (Centered Quote) */}
                    {item.description && (
                        <Text className='text-muted-foreground text-sm leading-5 italic text-center px-4'>
                            "{item.description}"
                        </Text>
                    )}
                </View>

                {/* Actions (Symmetrical Buttons) */}
                {!isOwner ? (
                    <View className='flex-row gap-3 w-full border-t border-border pt-4'>
                        <TouchableOpacity
                            onPress={() => onContact(item)}
                            className='flex-1 bg-primary h-12 rounded-xl flex-row items-center justify-center gap-2 active:bg-primary/80 shadow-sm'
                        >
                            <MessageCircle size={18} color='#121217' strokeWidth={2.5} />
                            <Text className='text-primary-foreground font-bold text-sm'>CONTACTAR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onViewStats(item)}
                            className='flex-1 bg-secondary h-12 rounded-xl border border-border flex-row items-center justify-center gap-2 active:bg-muted'
                        >
                            <BarChart2 size={18} color='#A1A1AA' strokeWidth={2} />
                            <Text className='text-muted-foreground font-bold text-sm'>STATS</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className='w-full border-t border-border pt-4 items-center flex-row justify-center gap-2'>
                        <Text className='text-muted-foreground text-xs font-medium'>Tu publicación</Text>
                        {onDelete && (
                            <TouchableOpacity onPress={() => onDelete(item.id)} className='bg-destructive/10 px-3 py-1.5 rounded-full'>
                                <Text className='text-destructive text-[10px] font-bold'>ELIMINAR</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}