import { useState } from 'react'

export type MatchState = 'previa' | 'checkin' | 'postmatch'
export type MatchTabState = 'details' | 'lineup' | 'chat'

export function useMatchScreenState() {
  const [activeTab, setActiveTab] = useState<MatchTabState>('chat')
  const [inputText, setInputText] = useState('')

  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showWOModal, setShowWOModal] = useState(false)

  const [propDate, setPropDate] = useState(new Date())
  const [propTime, setPropTime] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const [propModality, setPropModality] = useState('Fútbol 5')
  const [propDuration, setPropDuration] = useState('60 min')
  const [propIsFriendly, setPropIsFriendly] = useState(true)
  const [propVenue, setPropVenue] = useState('')

  const [gpsDistance, setGpsDistance] = useState(150)
  const [checkedIn, setCheckedIn] = useState(false)

  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [selectedMVP, setSelectedMVP] = useState<string | null>(null)
  const [playerGoals, setPlayerGoals] = useState<Record<string, number>>({})

  // Walkover evidence preview
  const [evidencePreviewUri, setEvidencePreviewUri] = useState<string | null>(null)
  const [showEvidencePreviewModal, setShowEvidencePreviewModal] = useState(false)
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false)

  return {
    activeTab,
    setActiveTab,
    inputText,
    setInputText,
    showProposalModal,
    setShowProposalModal,
    showEditModal,
    setShowEditModal,
    showWOModal,
    setShowWOModal,
    propDate,
    setPropDate,
    propTime,
    setPropTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    propModality,
    setPropModality,
    propDuration,
    setPropDuration,
    propIsFriendly,
    setPropIsFriendly,
    propVenue,
    setPropVenue,
    gpsDistance,
    setGpsDistance,
    checkedIn,
    setCheckedIn,
    homeScore,
    setHomeScore,
    awayScore,
    setAwayScore,
    selectedMVP,
    setSelectedMVP,
    playerGoals,
    setPlayerGoals,
    evidencePreviewUri,
    setEvidencePreviewUri,
    showEvidencePreviewModal,
    setShowEvidencePreviewModal,
    isUploadingEvidence,
    setIsUploadingEvidence,
  }
}
