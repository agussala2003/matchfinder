import { Card } from '@/components/ui/Card'
import { Target, TrendingUp, Trophy } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'

interface StatsGridProps {
  matches: number
  goals: number
  wins: number
  mvps: number
}

// Falta cargar las estadisticas reales desde el backend
export function StatsGrid({ matches, goals, wins, mvps }: StatsGridProps) {
  return (
    <Card className='flex-row justify-between py-4'>
      <StatItem icon={<Trophy size={20} color='#FBBF24' />} value={wins.toString()} label='Victorias' />
      <View className='w-[1px] bg-border h-10 self-center' />
      <StatItem icon={<Target size={20} color='#39FF14' />} value={goals.toString()} label='Goles' />
      <View className='w-[1px] bg-border h-10 self-center' />
      <StatItem icon={<TrendingUp size={20} color='#A855F7' />} value={matches.toString()} label='Partidos' />
      <View className='w-[1px] bg-border h-10 self-center' />
      <StatItem icon={<Trophy size={20} color='#EF4444' />} value={mvps.toString()} label='MVPs' />
    </Card>
  )
}

const StatItem = ({ icon, value, label }: { icon: any; value: string; label: string }) => (
  <View className='items-center flex-1'>
    <View className='mb-1'>{icon}</View>
    <Text className='text-text-main font-title text-xl'>{value}</Text>
    <Text className='text-text-muted text-[10px] uppercase font-bold'>{label}</Text>
  </View>
)
