import { MatchState } from '@/hooks/useMatchScreenState'
import { MatchDetail } from '@/services/matches.service'
import React from 'react'
import { CheckinSection } from './CheckinSection'

interface CheckinMatchViewProps {
  match: MatchDetail
  isTeamA: boolean
  canManage: boolean
  setMatchState: (state: MatchState) => void
  setShowWOModal: (visible: boolean) => void
  submitCheckinFlow: (isTeamA: boolean, onSuccess?: () => void) => Promise<void>
}

export function CheckinMatchView({
  match,
  isTeamA,
  canManage,
  setMatchState,
  setShowWOModal,
  submitCheckinFlow,
}: CheckinMatchViewProps) {
  return (
    <CheckinSection
      match={match}
      isTeamA={isTeamA}
      canManage={canManage}
      setMatchState={setMatchState}
      setShowWOModal={setShowWOModal}
      submitCheckinFlow={submitCheckinFlow}
    />
  )
}
