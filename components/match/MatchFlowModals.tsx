import { TeamMemberDetail } from '@/services/teams.service'
import React from 'react'
import { EdgeInsets } from 'react-native-safe-area-context'
import { EvidencePreviewModal } from './modals/EvidencePreviewModal'
import { LoadMatchStatsModal } from './modals/LoadMatchStatsModal'
import { MatchDateTimePickerSheet } from './modals/MatchDateTimePickerSheet'
import { MatchEditFlowModal } from './modals/MatchEditFlowModal'
import { MatchProposalFlowModal } from './modals/MatchProposalFlowModal'
import { MatchWalkoverModal } from './modals/MatchWalkoverModal'

interface MatchFlowModalsProps {
  insets: EdgeInsets
  showProposalModal: boolean
  setShowProposalModal: (value: boolean) => void
  showEditModal: boolean
  setShowEditModal: (value: boolean) => void
  showWOModal: boolean
  setShowWOModal: (value: boolean) => void
  showEvidencePreviewModal: boolean
  setShowEvidencePreviewModal: (value: boolean) => void
  evidencePreviewUri: string | null
  isUploadingEvidence: boolean
  propDate: Date
  setPropDate: (value: Date) => void
  propTime: Date
  setPropTime: (value: Date) => void
  showDatePicker: boolean
  setShowDatePicker: (value: boolean) => void
  showTimePicker: boolean
  setShowTimePicker: (value: boolean) => void
  propModality: string
  setPropModality: React.Dispatch<React.SetStateAction<string>>
  propDuration: string
  setPropDuration: React.Dispatch<React.SetStateAction<string>>
  propIsFriendly: boolean
  setPropIsFriendly: React.Dispatch<React.SetStateAction<boolean>>
  propVenue: string
  setPropVenue: (value: string) => void
  onSendProposal: () => void
  onSaveDetails: () => void
  onTakeEvidence: () => void
  onRetakeEvidence: () => void
  onConfirmEvidence: (evidenceUri: string) => void
  showLoadStatsModal: boolean
  setShowLoadStatsModal: (value: boolean) => void
  matchId?: string
  teamMembers?: TeamMemberDetail[]
  myTeamId?: string
}

export function MatchFlowModals(props: MatchFlowModalsProps) {
  return (
    <>
      <MatchProposalFlowModal
        visible={props.showProposalModal}
        onClose={() => props.setShowProposalModal(false)}
        onSend={props.onSendProposal}
        propDate={props.propDate}
        propTime={props.propTime}
        propModality={props.propModality}
        setPropModality={props.setPropModality}
        propDuration={props.propDuration}
        setPropDuration={props.setPropDuration}
        propIsFriendly={props.propIsFriendly}
        setPropIsFriendly={props.setPropIsFriendly}
        onShowDatePicker={() => props.setShowDatePicker(true)}
        onShowTimePicker={() => props.setShowTimePicker(true)}
      />

      <MatchEditFlowModal
        visible={props.showEditModal}
        onClose={() => props.setShowEditModal(false)}
        onConfirm={props.onSaveDetails}
        propDate={props.propDate}
        propTime={props.propTime}
        propVenue={props.propVenue}
        setPropVenue={props.setPropVenue}
        onShowDatePicker={() => props.setShowDatePicker(true)}
        onShowTimePicker={() => props.setShowTimePicker(true)}
      />

      <MatchDateTimePickerSheet
        showDatePicker={props.showDatePicker}
        showTimePicker={props.showTimePicker}
        propDate={props.propDate}
        propTime={props.propTime}
        setPropDate={props.setPropDate}
        setPropTime={props.setPropTime}
        setShowDatePicker={props.setShowDatePicker}
        setShowTimePicker={props.setShowTimePicker}
      />

      <MatchWalkoverModal
        visible={props.showWOModal}
        insets={props.insets}
        onClose={() => props.setShowWOModal(false)}
        onTakeEvidence={props.onTakeEvidence}
      />

      <EvidencePreviewModal
        visible={props.showEvidencePreviewModal}
        evidenceUri={props.evidencePreviewUri}
        isLoading={props.isUploadingEvidence}
        onRetake={props.onRetakeEvidence}
        onConfirm={() => {
          if (props.evidencePreviewUri) {
            props.onConfirmEvidence(props.evidencePreviewUri)
          }
        }}
        onDismiss={() => props.setShowEvidencePreviewModal(false)}
      />

      {props.matchId && props.teamMembers && props.myTeamId && (
        <LoadMatchStatsModal
          visible={props.showLoadStatsModal}
          matchId={props.matchId}
          teamMembers={props.teamMembers}
          myTeamId={props.myTeamId}
          onClose={() => props.setShowLoadStatsModal(false)}
        />
      )}
    </>
  )
}
