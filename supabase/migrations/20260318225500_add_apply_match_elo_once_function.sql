CREATE OR REPLACE FUNCTION public.apply_match_elo_once(
  p_match_id uuid,
  p_team_a_id uuid,
  p_team_b_id uuid,
  p_new_elo_a integer,
  p_new_elo_b integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status estado_partido_enum;
  v_can_manage boolean;
BEGIN
  SELECT m.status
  INTO v_status
  FROM matches m
  WHERE m.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM matches m
    JOIN team_members tm ON tm.team_id IN (m.team_a_id, m.team_b_id)
    WHERE m.id = p_match_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'ACTIVE'::estado_miembro_enum
      AND tm.role = ANY (ARRAY['ADMIN'::rol_enum, 'SUB_ADMIN'::rol_enum])
  )
  INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Not authorized to finalize this match';
  END IF;

  IF v_status = 'FINISHED' THEN
    RETURN false;
  END IF;

  UPDATE teams
  SET elo_rating = CASE
    WHEN id = p_team_a_id THEN GREATEST(0, p_new_elo_a)
    WHEN id = p_team_b_id THEN GREATEST(0, p_new_elo_b)
    ELSE elo_rating
  END
  WHERE id IN (p_team_a_id, p_team_b_id);

  UPDATE matches
  SET status = 'FINISHED'
  WHERE id = p_match_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_match_elo_once(uuid, uuid, uuid, integer, integer) TO authenticated;
