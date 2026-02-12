import { supabase } from '@/lib/supabase'
import { ServiceResponse } from '@/types/core'
import { MarketPost, MarketPostType } from '@/types/market'

class MarketService {
    async getPosts(filterType?: MarketPostType): Promise<ServiceResponse<MarketPost[]>> {
        try {
            let query = supabase
                .from('market_posts')
                .select(`
          *,
          team:teams (id, name, logo_url, home_zone),
          profile:profiles (id, full_name, avatar_url, position)
        `)
                .eq('status', 'OPEN')
                .order('created_at', { ascending: false })

            if (filterType) {
                query = query.eq('type', filterType)
            }

            const { data, error } = await query

            if (error) throw error

            return { success: true, data: data as MarketPost[] }
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
            const { data, error } = await supabase
                .from('market_posts')
                .insert(post)
                .select()
                .single()

            if (error) throw error
            return { success: true, data }
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
