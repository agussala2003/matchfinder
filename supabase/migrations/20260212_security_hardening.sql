-- SECURITY HARDENING (RLS) - Updated
-- SAFE TO RUN: Uses DROP IF EXISTS to avoid conflicts.

-- 1. MATCHES: Reinforce update policy for Captains/Admins of BOTH teams
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Remove old/potential duplicate policies
DROP POLICY IF EXISTS "Captains can update their matches" ON public.matches;
DROP POLICY IF EXISTS "Allows captains to update matches" ON public.matches;

-- Create the robust policy
CREATE POLICY "Captains can update matches"
ON public.matches
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.team_members 
    WHERE team_id IN (team_a_id, team_b_id) 
    AND role IN ('CAPTAIN', 'ADMIN', 'SUB_ADMIN')
    AND status = 'ACTIVE'
  )
);

-- Note: SELECT policy already exists ("Public read access"), no need to touch.

-- 2. MARKET POSTS: Allow authenticated users to create posts (Missing in current list)
ALTER TABLE public.market_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can create posts" ON public.market_posts;

CREATE POLICY "Authenticated can create posts"
ON public.market_posts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Note: SELECT and DELETE policies already exist.

-- 3. TEAM MEMBERS: Existing policies seem sufficient for now.
-- "Admins and SubAdmins can manage members" (UPDATE) covers most logic.
-- "Enable insert for team members" (INSERT) covers joining.
-- "Team managers can delete members" (DELETE) covers kicking.
