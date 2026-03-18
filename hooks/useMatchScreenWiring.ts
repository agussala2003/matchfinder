import { CheckinMatchView } from '@/components/match/CheckinMatchView'
import { MatchFlowModals } from '@/components/match/MatchFlowModals'
import { PostMatchView } from '@/components/match/PostMatchView'
import { PreMatchView } from '@/components/match/PreMatchView'
import { matchesService } from '@/services/matches.service'
import { RefObject } from 'react'
import { FlatList } from 'react-native'
import { EdgeInsets } from 'react-native-safe-area-context'
import { useMatchCriticalActions } from './useMatchCriticalActions'
import { useMatchDerivedState } from './useMatchDerivedState'
import { useMatchDetails } from './useMatchDetails'
import { useMatchScreenState } from './useMatchScreenState'

interface UseMatchScreenWiringParams {
  id: string
  insets: EdgeInsets
  flatListRef: RefObject<FlatList | null>
}

export function useMatchScreenWiring({ id, insets, flatListRef }: UseMatchScreenWiringParams) {
  const details = useMatchDetails(id)
  const state = useMatchScreenState()
  const derived = useMatchDerivedState(details.match, details.canManage)

  const actions = useMatchCriticalActions({
    matchId: details.match?.id,
    myTeamId: details.myTeamId,
    canManage: details.canManage,
    userId: details.userId,
    sendProposal: details.sendProposal,
    updateMatchDetails: details.updateMatchDetails,
    submitResult: details.submitResult,
    claimWalkover: details.claimWalkover,
    submitTeamCheckin: async (matchId, isTeamA) => {
      const result = await matchesService.submitTeamCheckin(matchId, isTeamA)
      if (!result.success) throw new Error(result.error || 'Error en check-in')
    },
    setEvidencePreviewUri: state.setEvidencePreviewUri,
    setShowEvidencePreviewModal: state.setShowEvidencePreviewModal,
    setIsUploadingEvidence: state.setIsUploadingEvidence,
  })

  const handleSendProposal = async () => {
    const success = await actions.sendProposalFlow(
      state.propDate,
      state.propTime,
      state.propModality,
      state.propDuration,
      state.propIsFriendly,
      state.propVenue,
    )
    if (success) state.setShowProposalModal(false)
  }

  const handleSaveDetails = async () => {
    const success = await actions.updateMatchDetailsFlow(
      state.propDate,
      state.propTime,
      state.propVenue,
      state.propIsFriendly,
    )
    if (success) state.setShowEditModal(false)
  }

  const preMatchProps: React.ComponentProps<typeof PreMatchView> | null =
    details.match && details.myTeam && details.rivalTeam
      ? {
          match: details.match,
          myTeam: details.myTeam,
          myTeamId: details.myTeamId,
          rivalTeam: details.rivalTeam,
          activeTab: state.activeTab,
          onTabPress: state.setActiveTab,
          formatTime: derived.formatTime,
          messages: details.messages,
          flatListRef,
          canManage: details.canManage,
          inputText: state.inputText,
          setInputText: state.setInputText,
          insets,
          citedPlayers: details.citedPlayers,
          canCancelMatch: derived.canCancelMatch,
          onEditMatch: () => state.setShowEditModal(true),
          onCancelMatch: details.cancelMatch,
          onSendText: () => actions.sendText(state.inputText, state.setInputText),
          onAcceptProposal: details.acceptProposal,
          onRejectProposal: details.rejectProposal,
          onCancelProposal: details.cancelProposal,
          onShowProposalModal: () => state.setShowProposalModal(true),
        }
      : null

  const checkinProps: React.ComponentProps<typeof CheckinMatchView> | null =
    details.match
      ? {
          match: details.match,
          isTeamA: details.myTeamId === details.match.team_a?.id,
          canManage: details.canManage,
          setMatchState: derived.setMatchState,
          setShowWOModal: state.setShowWOModal,
          submitCheckinFlow: actions.submitCheckinFlow,
        }
      : null

  const postMatchProps: React.ComponentProps<typeof PostMatchView> | null =
    details.myTeam && details.rivalTeam
      ? {
          myTeam: details.myTeam,
          rivalTeam: details.rivalTeam,
          teamMembers: details.teamMembers,
          homeScore: state.homeScore,
          setHomeScore: state.setHomeScore,
          awayScore: state.awayScore,
          setAwayScore: state.setAwayScore,
          selectedMVP: state.selectedMVP,
          setSelectedMVP: state.setSelectedMVP,
          playerGoals: state.playerGoals,
          setPlayerGoals: state.setPlayerGoals,
          onSubmitResult: () =>
            actions.submitResultFlow(
              state.homeScore,
              state.awayScore,
              state.playerGoals,
              state.selectedMVP,
            ),
          insets,
        }
      : null

  const modalProps: React.ComponentProps<typeof MatchFlowModals> = {
    insets,
    showProposalModal: state.showProposalModal,
    setShowProposalModal: state.setShowProposalModal,
    showEditModal: state.showEditModal,
    setShowEditModal: state.setShowEditModal,
    showWOModal: state.showWOModal,
    setShowWOModal: state.setShowWOModal,
    showEvidencePreviewModal: state.showEvidencePreviewModal,
    setShowEvidencePreviewModal: state.setShowEvidencePreviewModal,
    evidencePreviewUri: state.evidencePreviewUri,
    isUploadingEvidence: state.isUploadingEvidence,
    propDate: state.propDate,
    setPropDate: state.setPropDate,
    propTime: state.propTime,
    setPropTime: state.setPropTime,
    showDatePicker: state.showDatePicker,
    setShowDatePicker: state.setShowDatePicker,
    showTimePicker: state.showTimePicker,
    setShowTimePicker: state.setShowTimePicker,
    propModality: state.propModality,
    setPropModality: state.setPropModality,
    propDuration: state.propDuration,
    setPropDuration: state.setPropDuration,
    propIsFriendly: state.propIsFriendly,
    setPropIsFriendly: state.setPropIsFriendly,
    propVenue: state.propVenue,
    setPropVenue: state.setPropVenue,
    onSendProposal: handleSendProposal,
    onSaveDetails: handleSaveDetails,
    onTakeEvidence: actions.takeEvidenceAndClaimWalkoverFlow,
    onRetakeEvidence: actions.takeEvidenceAndClaimWalkoverFlow,
    onConfirmEvidence: (evidenceUri: string) =>
      actions.confirmAndUploadWalkoverEvidence(evidenceUri, () =>
        state.setShowWOModal(false),
      ),
  }

  return {
    loading: details.loading,
    match: details.match,
    myTeam: details.myTeam,
    rivalTeam: details.rivalTeam,
    matchState: derived.matchState,
    preMatchProps,
    checkinProps,
    postMatchProps,
    modalProps,
  }
}
