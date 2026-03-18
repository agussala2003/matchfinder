import React from 'react'
import { ProposalModal } from './ProposalModal'

interface MatchProposalFlowModalProps {
  visible: boolean
  onClose: () => void
  onSend: () => void
  propDate: Date
  propTime: Date
  propModality: string
  setPropModality: React.Dispatch<React.SetStateAction<string>>
  propDuration: string
  setPropDuration: React.Dispatch<React.SetStateAction<string>>
  propIsFriendly: boolean
  setPropIsFriendly: React.Dispatch<React.SetStateAction<boolean>>
  onShowDatePicker: () => void
  onShowTimePicker: () => void
}

export function MatchProposalFlowModal({
  visible,
  onClose,
  onSend,
  propDate,
  propTime,
  propModality,
  setPropModality,
  propDuration,
  setPropDuration,
  propIsFriendly,
  setPropIsFriendly,
  onShowDatePicker,
  onShowTimePicker,
}: MatchProposalFlowModalProps) {
  return (
    <ProposalModal
      visible={visible}
      onClose={onClose}
      onSend={onSend}
      propDate={propDate}
      propTime={propTime}
      propModality={propModality}
      setPropModality={setPropModality}
      propDuration={propDuration}
      setPropDuration={setPropDuration}
      propIsFriendly={propIsFriendly}
      setPropIsFriendly={setPropIsFriendly}
      onShowDatePicker={onShowDatePicker}
      onShowTimePicker={onShowTimePicker}
    />
  )
}
