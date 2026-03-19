-- Set default Elo for new teams
ALTER TABLE public.teams
ALTER COLUMN elo_rating SET DEFAULT 1000;

-- Backfill existing teams created with old default Elo
UPDATE public.teams
SET elo_rating = 1000
WHERE elo_rating = 1200;
