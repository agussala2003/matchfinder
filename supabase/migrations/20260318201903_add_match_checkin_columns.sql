-- Add check-in tracking columns to matches table
ALTER TABLE public.matches
ADD COLUMN checkin_team_a boolean DEFAULT false,
ADD COLUMN checkin_team_b boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.matches.checkin_team_a IS 'Whether team A has checked in for the match';
COMMENT ON COLUMN public.matches.checkin_team_b IS 'Whether team B has checked in for the match';
