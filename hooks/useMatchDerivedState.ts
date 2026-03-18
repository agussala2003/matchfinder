import { MatchDetail } from '@/services/matches.service'
import { differenceInHours, format } from 'date-fns'
import { useEffect, useState } from 'react'
import { MatchState } from './useMatchScreenState'

export function useMatchDerivedState(match: MatchDetail | null, canManage: boolean) {
  const [matchState, setMatchState] = useState<MatchState>('previa')

  useEffect(() => {
    if (!match) return

    if (match.status === 'FINISHED') {
      setMatchState('postmatch')
      return
    }

    if (match.status === 'CONFIRMED' && match.scheduled_at) {
      const matchDate = new Date(match.scheduled_at)
      const now = new Date()
      const diffHours = differenceInHours(matchDate, now)

      if (diffHours < 2 && diffHours > -4) {
        setMatchState('checkin')
      } else {
        setMatchState('previa')
      }
    } else {
      setMatchState('previa')
    }
  }, [match])

  const canCancelMatch = () => {
    if (!match?.scheduled_at || !canManage) return false
    const matchDate = new Date(match.scheduled_at)
    const now = new Date()
    const diffHours = differenceInHours(matchDate, now)
    return diffHours >= 24
  }

  const formatTime = (iso: string) => format(new Date(iso), 'HH:mm')

  return {
    matchState,
    setMatchState,
    canCancelMatch,
    formatTime,
  }
}
