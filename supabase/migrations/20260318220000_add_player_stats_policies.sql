-- Enable RLS on player_stats (if not already enabled)
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT - Only ADMIN or SUB_ADMIN of the team can create stats
CREATE POLICY "Admin or SubAdmin can insert player stats" ON public.player_stats
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM team_members
    WHERE (
      team_members.team_id = player_stats.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = ANY(ARRAY['ADMIN'::rol_enum, 'SUB_ADMIN'::rol_enum])
      AND team_members.status = 'ACTIVE'::estado_miembro_enum
    )
  )
);

-- Policy: UPDATE - Only ADMIN or SUB_ADMIN of the team can update stats
CREATE POLICY "Admin or SubAdmin can update player stats" ON public.player_stats
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM team_members
    WHERE (
      team_members.team_id = player_stats.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = ANY(ARRAY['ADMIN'::rol_enum, 'SUB_ADMIN'::rol_enum])
      AND team_members.status = 'ACTIVE'::estado_miembro_enum
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM team_members
    WHERE (
      team_members.team_id = player_stats.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = ANY(ARRAY['ADMIN'::rol_enum, 'SUB_ADMIN'::rol_enum])
      AND team_members.status = 'ACTIVE'::estado_miembro_enum
    )
  )
);

-- Policy: DELETE - Only ADMIN or SUB_ADMIN of the team can delete stats
CREATE POLICY "Admin or SubAdmin can delete player stats" ON public.player_stats
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM team_members
    WHERE (
      team_members.team_id = player_stats.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = ANY(ARRAY['ADMIN'::rol_enum, 'SUB_ADMIN'::rol_enum])
      AND team_members.status = 'ACTIVE'::estado_miembro_enum
    )
  )
);
