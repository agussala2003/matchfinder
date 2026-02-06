import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Team } from '@/types/teams';
import { MapPin, Shield } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface TeamCardProps {
  team: Team | null;
  onCreatePress: () => void;
}

export function TeamCard({ team, onCreatePress }: TeamCardProps) {
  if (!team) {
    return (
      <Card className="flex-row items-center justify-between border-dashed border-gray-600 bg-transparent p-6">
        <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center">
                <Shield size={24} color="#666" />
            </View>
            <View>
                <Text className="text-gray-300 font-title text-lg">Sin Equipo</Text>
                <Text className="text-gray-500 text-xs">Crea o únete a uno</Text>
            </View>
        </View>
        <Button 
            title="Crear" 
            variant="primary" 
            onPress={onCreatePress}
            className="px-6 py-2 h-10" // Override de tamaño para botón chico
        />
      </Card>
    );
  }

  return (
    <Card className="flex-row items-center gap-4">
      <View className="w-16 h-16 bg-green-900/20 rounded-full items-center justify-center border border-primary/50">
        <Shield size={32} color="#39FF14" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-title text-xl">{team.name}</Text>
        <View className="flex-row items-center mt-1">
            <MapPin size={12} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">{team.home_zone}</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-primary font-title text-lg">{team.elo_rating}</Text>
        <Text className="text-gray-500 text-[10px] uppercase">Pts</Text>
      </View>
    </Card>
  );
}