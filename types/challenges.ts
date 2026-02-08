import { Team } from './teams'

export type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export interface Challenge {
  id: string
  challenger_team_id: string
  target_team_id: string
  status: ChallengeStatus
  created_at: string
  challenger?: Team // Join
  target?: Team // Join
}
