export type MarketPostType = 'TEAM_SEEKING_PLAYER' | 'PLAYER_SEEKING_TEAM'
export type MarketPostStatus = 'OPEN' | 'CLOSED'

export interface MarketPost {
    id: string
    type: MarketPostType
    user_id: string | null // Owner of the post (if Player seeking team)
    team_id: string | null // Owner team (if Team seeking player)
    match_id: string | null // Optional: if seeking for a specific match
    position_needed: string | null // e.g. 'GOALKEEPER', 'DEFENDER', or null for 'ANY'
    description: string | null
    status: MarketPostStatus
    created_at: string
    // Joins
    team?: {
        id: string
        name: string
        logo_url?: string
        home_zone?: string
    }
    profile?: {
        id: string
        full_name: string
        avatar_url?: string
        position?: string
    }
}

export interface CreatePostDisplayData {
    // Helper to display in the feed
    title: string
    image_url: string | undefined
    subtitle: string
    badge: string
}
