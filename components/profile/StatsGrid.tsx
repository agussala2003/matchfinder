import { Card } from '@/components/ui/Card';
import { Target, TrendingUp, Trophy } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

export function StatsGrid() {
  return (
    <Card variant="glass" className="flex-row justify-between">
      <StatItem 
        icon={<Trophy size={20} color="#FBBF24" />} 
        value="0" 
        label="Partidos" 
      />
      <View className="w-[1px] bg-gray-700 h-10 self-center" />
      <StatItem 
        icon={<Target size={20} color="#39FF14" />} 
        value="0" 
        label="Goles" 
      />
      <View className="w-[1px] bg-gray-700 h-10 self-center" />
      <StatItem 
        icon={<TrendingUp size={20} color="#A855F7" />} 
        value="1200" 
        label="Elo" 
      />
    </Card>
  );
}

const StatItem = ({ icon, value, label }: { icon: any, value: string, label: string }) => (
  <View className="items-center flex-1">
    <View className="mb-1">{icon}</View>
    <Text className="text-white font-title text-xl">{value}</Text>
    <Text className="text-gray-500 text-[10px] uppercase font-bold">{label}</Text>
  </View>
);