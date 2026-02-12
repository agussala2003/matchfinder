import { AuthInput } from '@/components/ui/AuthInput'
import { Select } from '@/components/ui/Select'
import { Team } from '@/types/teams'
import React from 'react'
import { View } from 'react-native'

interface SearchFiltersProps {
  myTeams: Team[]
  currentTeam: Team | null
  searchQuery: string
  selectedZone: string
  zoneOptions: { label: string; value: string }[]
  onTeamChange: (teamId: string) => void
  onSearchChange: (query: string) => void
  onZoneChange: (zone: string) => void
}

export const SearchFilters = ({
  myTeams,
  currentTeam,
  searchQuery,
  selectedZone,
  zoneOptions,
  onTeamChange,
  onSearchChange,
  onZoneChange,
}: SearchFiltersProps) => {
  return (
    <View className='mb-4 gap-3'>
      {myTeams.length > 1 && (
        <Select
          label='Gestionando como:'
          value={currentTeam?.id || ''}
          options={myTeams.map((t) => ({ label: t.name, value: t.id }))}
          onChange={onTeamChange}
        />
      )}
      
      <AuthInput
        label='Buscar equipo'
        placeholder='Buscar equipo...'
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      
      <Select
        label='Filtrar por Zona'
        placeholder='Selecciona zona...'
        options={zoneOptions}
        value={selectedZone}
        onChange={onZoneChange}
      />
    </View>
  )
}