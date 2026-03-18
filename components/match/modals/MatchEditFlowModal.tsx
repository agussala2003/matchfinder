import React from 'react'
import { EditMatchModal } from './EditMatchModal'

interface MatchEditFlowModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  propDate: Date
  propTime: Date
  propVenue: string
  setPropVenue: (value: string) => void
  onShowDatePicker: () => void
  onShowTimePicker: () => void
}

export function MatchEditFlowModal({
  visible,
  onClose,
  onConfirm,
  propDate,
  propTime,
  propVenue,
  setPropVenue,
  onShowDatePicker,
  onShowTimePicker,
}: MatchEditFlowModalProps) {
  return (
    <EditMatchModal
      visible={visible}
      onClose={onClose}
      onConfirm={onConfirm}
      propDate={propDate}
      propTime={propTime}
      propVenue={propVenue}
      setPropVenue={setPropVenue}
      onShowDatePicker={onShowDatePicker}
      onShowTimePicker={onShowTimePicker}
    />
  )
}
