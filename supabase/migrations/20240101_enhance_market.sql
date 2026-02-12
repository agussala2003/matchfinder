-- Add columns to support Free Agents and better descriptions
ALTER TABLE public.market_posts 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'TEAM_SEEKING_PLAYER', -- 'TEAM_SEEKING_PLAYER' | 'PLAYER_SEEKING_TEAM'
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS description text;

-- Make position_needed nullable if we want general "looking for team" without specific position (optional, but good for flexibility)
-- ALTER TABLE public.market_posts ALTER COLUMN position_needed DROP NOT NULL;

-- Policy to allow users to delete their own posts (if not already exists)
-- CREATE POLICY "Users can delete own market posts" ON public.market_posts FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (SELECT captain_id FROM public.teams WHERE id = team_id));
