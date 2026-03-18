import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'
import { MarketPost, MarketPostType } from '@/types/market'
import { Enums, Tables, TablesInsert } from '@/types/supabase'

type MarketPostRow = Tables<'market_posts'>
type TeamRow = Tables<'teams'>
type ProfileRow = Tables<'profiles'>
type PositionEnum = Enums<'posicion_enum'>

type MarketPostWithJoins = MarketPostRow & {
    team: Pick<TeamRow, 'id' | 'name' | 'logo_url' | 'home_zone' | 'category'> | null
    profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url' | 'position'> | null
}

function toMarketType(type: string | null): MarketPostType {
    return type === 'PLAYER_SEEKING_TEAM' ? 'PLAYER_SEEKING_TEAM' : 'TEAM_SEEKING_PLAYER'
}

function toMarketStatus(status: MarketPostRow['status']): 'OPEN' | 'CLOSED' {
    return status === 'OPEN' ? 'OPEN' : 'CLOSED'
}

function toPositionEnum(value: string | undefined): PositionEnum | undefined {
    if (value === 'GK' || value === 'DEF' || value === 'MID' || value === 'FWD' || value === 'ANY') {
        return value
    }
    return undefined
}

function toMarketPost(row: MarketPostWithJoins): MarketPost {
    return {
        id: row.id,
        type: toMarketType(row.type),
        user_id: row.user_id,
        team_id: row.team_id,
        match_id: row.match_id,
        position_needed: row.position_needed,
        description: row.description,
        status: toMarketStatus(row.status),
        created_at: row.created_at ?? '',
        team: row.team
            ? {
                    id: row.team.id,
                    name: row.team.name,
                    logo_url: row.team.logo_url ?? undefined,
                    home_zone: row.team.home_zone,
                    category: row.team.category,
                }
            : undefined,
        profile: row.profile
            ? {
                    id: row.profile.id,
                    full_name: row.profile.full_name,
                    avatar_url: row.profile.avatar_url ?? undefined,
                    position: row.profile.position ?? undefined,
                }
            : undefined,
    }
}

class MarketService {
    async getPosts(
        filterType?: MarketPostType,
        page = 0,
        limit = 10,
    ): Promise<ServiceResponse<MarketPost[]>> {
        try {
            const from = page * limit
            const to = from + limit - 1

            let query = supabase
                .from('market_posts')
                .select(`
          *,
          team:teams (id, name, logo_url, home_zone),
          profile:profiles (id, full_name, avatar_url, position)
        `)
                .eq('status', 'OPEN')
                .order('created_at', { ascending: false })
                .range(from, to)

            if (filterType) {
                query = query.eq('type', filterType)
            }

            const { data, error } = await query

            if (error) throw error

            const rows = (data ?? []) as MarketPostWithJoins[]
            return { success: true, data: rows.map(toMarketPost) }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }

    async createPost(post: {
        type: MarketPostType
        user_id?: string
        team_id?: string
        match_id?: string
        position_needed?: string
        description?: string
    }): Promise<ServiceResponse<MarketPost>> {
        try {
            const payload: TablesInsert<'market_posts'> = {
                type: post.type,
                user_id: post.user_id,
                team_id: post.team_id,
                match_id: post.match_id,
                position_needed: toPositionEnum(post.position_needed),
                description: post.description,
            }

            const { data, error } = await supabase
                .from('market_posts')
                .insert(payload)
                .select()
                .single()

            if (error) throw error

            return { success: true, data: toMarketPost({ ...data, team: null, profile: null }) }
        } catch (error) {
            console.error('Error creating market post:', error)
            return { success: false, error: (error as Error).message }
        }
    }

    async deletePost(postId: string): Promise<ServiceResponse> {
        try {
            const { error } = await supabase.from('market_posts').delete().eq('id', postId)
            if (error) throw error
            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    }
}

export const marketService = new MarketService()
