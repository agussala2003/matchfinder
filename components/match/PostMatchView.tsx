import { TeamMemberDetail } from '@/services/teams.service'
import React from 'react'
import { EdgeInsets } from 'react-native-safe-area-context'
import { PostmatchSection } from './PostmatchSection'

interface TeamSummary {
  id: string
  name: string
  logo_url?: string
}

interface PostMatchViewProps {
  myTeam: TeamSummary
  rivalTeam: TeamSummary
  teamMembers: TeamMemberDetail[]
  homeScore: number
  setHomeScore: React.Dispatch<React.SetStateAction<number>>
  awayScore: number
  setAwayScore: React.Dispatch<React.SetStateAction<number>>
  selectedMVP: string | null
  setSelectedMVP: React.Dispatch<React.SetStateAction<string | null>>
  playerGoals: Record<string, number>
  setPlayerGoals: React.Dispatch<React.SetStateAction<Record<string, number>>>
  onSubmitResult: () => void
  onOpenLoadStats?: () => void
  insets: EdgeInsets
}

export function PostMatchView({
  myTeam,
  rivalTeam,
  teamMembers,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  selectedMVP,
  setSelectedMVP,
  playerGoals,
  setPlayerGoals,
  onSubmitResult,
  onOpenLoadStats,
  insets,
}: PostMatchViewProps) {
  return (
    <PostmatchSection
      myTeam={myTeam}
      rivalTeam={rivalTeam}
      teamMembers={teamMembers}
      homeScore={homeScore}
      setHomeScore={setHomeScore}
      awayScore={awayScore}
      setAwayScore={setAwayScore}
      selectedMVP={selectedMVP}
      setSelectedMVP={setSelectedMVP}
      playerGoals={playerGoals}
      setPlayerGoals={setPlayerGoals}
      onSubmitResult={onSubmitResult}
      onOpenLoadStats={onOpenLoadStats}
      insets={insets}
    />
  )
}
