export interface MatchPreview {
  id: string
  scheduled_at: string | null
  status: 'PENDING' | 'CONFIRMED' | 'FINISHED' | 'CANCELLED'
  is_friendly: boolean
  rival: {
    id: string
    name: string
    logo_url?: string
  }
  my_role: 'HOME' | 'AWAY' // Si soy Local (A) o Visitante (B)
}