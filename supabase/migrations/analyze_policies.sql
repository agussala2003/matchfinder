-- Run this query to see all active RLS policies for our key tables
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd AS "operation", 
    permissive, 
    roles 
FROM pg_policies 
WHERE tablename IN ('matches', 'team_members', 'market_posts', 'notifications')
ORDER BY tablename, policyname;
