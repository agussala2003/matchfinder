-- Add UNIQUE constraint on (match_id, user_id) to ensure one stat per player per match
ALTER TABLE public.player_stats
ADD CONSTRAINT player_stats_match_id_user_id_unique UNIQUE (match_id, user_id);

-- Create a unique index to ensure only one MVP per match
CREATE UNIQUE INDEX one_mvp_per_match ON public.player_stats (match_id) 
WHERE is_mvp = true;
