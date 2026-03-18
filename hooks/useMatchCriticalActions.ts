import { useGlobalLoading } from '@/context/GlobalLoadingContext'
import { useToast } from '@/context/ToastContext'
import { chatService } from '@/services/chat.service'
import { storageService } from '@/services/storage.service'
import * as ImagePicker from 'expo-image-picker'

interface MatchCriticalActionsParams {
  matchId?: string
  myTeamId: string
  canManage: boolean
  userId: string
  sendProposal: (
    propDate: Date,
    propTime: Date,
    propModality: string,
    propDuration: string,
    propIsFriendly: boolean,
    propVenue: string,
  ) => Promise<boolean>
  updateMatchDetails: (
    propDate: Date,
    propTime: Date,
    propVenue: string,
    propIsFriendly: boolean,
  ) => Promise<boolean>
  submitResult: (
    homeScore: number,
    awayScore: number,
    playerGoals: Record<string, number>,
    selectedMVP: string | null,
  ) => Promise<void>
  claimWalkover: (evidenceUrl: string) => Promise<boolean | undefined>
  submitTeamCheckin?: (matchId: string, isTeamA: boolean) => Promise<void>
  setEvidencePreviewUri?: (uri: string | null) => void
  setShowEvidencePreviewModal?: (show: boolean) => void
  setIsUploadingEvidence?: (loading: boolean) => void
}

export function useMatchCriticalActions({
  matchId,
  myTeamId,
  canManage,
  userId,
  sendProposal,
  updateMatchDetails,
  submitResult,
  claimWalkover,
  submitTeamCheckin,
  setEvidencePreviewUri,
  setShowEvidencePreviewModal,
  setIsUploadingEvidence,
}: MatchCriticalActionsParams) {
  const { showToast } = useToast()
  const { withGlobalLoading } = useGlobalLoading()

  async function sendText(inputText: string, setInputText: (value: string) => void) {
    if (!inputText.trim() || !myTeamId || !matchId) return

    if (!canManage) {
      showToast('Solo capitanes pueden enviar mensajes', 'error')
      return
    }

    const text = inputText.trim()
    setInputText('')

    const result = await chatService.sendText(matchId, myTeamId, text, userId)
    if (!result.success) {
      showToast('Error al enviar mensaje', 'error')
      setInputText(text)
    }
  }

  async function sendProposalFlow(
    propDate: Date,
    propTime: Date,
    propModality: string,
    propDuration: string,
    propIsFriendly: boolean,
    propVenue: string,
  ) {
    return withGlobalLoading(
      sendProposal(propDate, propTime, propModality, propDuration, propIsFriendly, propVenue),
      {
        message: 'Enviando propuesta de partido...',
        blocking: true,
      },
    )
  }

  async function updateMatchDetailsFlow(
    propDate: Date,
    propTime: Date,
    propVenue: string,
    propIsFriendly: boolean,
  ) {
    return withGlobalLoading(updateMatchDetails(propDate, propTime, propVenue, propIsFriendly), {
      message: 'Actualizando datos del partido...',
      blocking: true,
    })
  }

  async function submitResultFlow(
    homeScore: number,
    awayScore: number,
    playerGoals: Record<string, number>,
    selectedMVP: string | null,
  ) {
    return withGlobalLoading(submitResult(homeScore, awayScore, playerGoals, selectedMVP), {
      message: 'Confirmando resultado del partido...',
      blocking: true,
    })
  }

  async function takeEvidenceAndClaimWalkoverFlow() {
    if (!matchId || !myTeamId) return

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
      if (!permissionResult.granted) {
        showToast('Se requiere acceso a la cámara', 'error')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (result.canceled) return

      // Capturó foto exitosamente, guardar preview y mostrar modal
      const photoUri = result.assets[0].uri
      setEvidencePreviewUri?.(photoUri)
      setShowEvidencePreviewModal?.(true)
    } catch (error) {
      console.error('Error al capturar foto:', error)
      showToast('Error al capturar foto', 'error')
    }
  }

  async function confirmAndUploadWalkoverEvidence(evidenceUri: string, onSuccess?: () => void) {
    if (!matchId || !myTeamId) return

    try {
      setIsUploadingEvidence?.(true)

      const timestamp = new Date().getTime()
      const path = `${matchId}/${myTeamId}_${timestamp}.jpg`

      const publicUrl = await storageService.uploadImage(evidenceUri, 'match-evidence', path)

      if (!publicUrl) {
        showToast('Error al subir imagen', 'error')
        return
      }

      const success = await claimWalkover(publicUrl)
      if (success) {
        setEvidencePreviewUri?.(null)
        setShowEvidencePreviewModal?.(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error al confirmar W.O.:', error)
      showToast('Error al confirmar W.O.', 'error')
    } finally {
      setIsUploadingEvidence?.(false)
    }
  }

  async function submitCheckinFlow(isTeamA: boolean, onSuccess?: () => void) {
    if (!matchId || !submitTeamCheckin) return

    try {
      await withGlobalLoading(submitTeamCheckin(matchId, isTeamA), {
        message: 'Confirmando tu presencia...',
        blocking: true,
      })
      showToast('✅ Check-in confirmado', 'success')
      onSuccess?.()
    } catch (error) {
      console.error('Error en check-in:', error)
      showToast('Error al confirmar presencia', 'error')
    }
  }

  return {
    sendText,
    sendProposalFlow,
    updateMatchDetailsFlow,
    submitResultFlow,
    takeEvidenceAndClaimWalkoverFlow,
    confirmAndUploadWalkoverEvidence,
    submitCheckinFlow,
  }
}
