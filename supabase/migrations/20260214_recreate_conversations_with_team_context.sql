-- Migration: Recreate conversations table with team context support
-- Date: 2026-02-14

-- Drop existing table and dependencies (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Create new conversations table with team context support
CREATE TABLE public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    participant_a uuid NOT NULL,
    participant_b uuid NOT NULL,
    
    -- New fields for team context
    team_context_id uuid NULL, -- References teams(id) when this is a team-player chat
    chat_type text NOT NULL DEFAULT 'DIRECT' CHECK (chat_type IN ('DIRECT', 'TEAM_PLAYER')),
    
    -- Existing timestamp fields
    last_message_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Primary key
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    
    -- Foreign key constraints
    CONSTRAINT conversations_participant_a_fkey FOREIGN KEY (participant_a) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT conversations_participant_b_fkey FOREIGN KEY (participant_b) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT conversations_team_context_fkey FOREIGN KEY (team_context_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    
    -- Business logic constraints
    CONSTRAINT conversations_team_context_check CHECK (
        (chat_type = 'DIRECT' AND team_context_id IS NULL) OR
        (chat_type = 'TEAM_PLAYER' AND team_context_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_participants ON public.conversations(participant_a, participant_b);
CREATE INDEX idx_conversations_team_context ON public.conversations(team_context_id) WHERE team_context_id IS NOT NULL;
CREATE INDEX idx_conversations_type ON public.conversations(chat_type);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Recreate RLS policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their conversations (both direct and team chats)
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT USING (
        (auth.uid() = participant_a) OR 
        (auth.uid() = participant_b) OR
        -- Team members can see team chats where they are involved
        (chat_type = 'TEAM_PLAYER' AND team_context_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = team_context_id 
            AND tm.user_id = auth.uid() 
            AND tm.status = 'ACTIVE'
        ))
    );

-- Users can insert conversations where they are participants
CREATE POLICY "Users can insert conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        (auth.uid() = participant_a) OR 
        (auth.uid() = participant_b) OR
        -- Team admins can create team chats
        (chat_type = 'TEAM_PLAYER' AND team_context_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = team_context_id 
            AND tm.user_id = auth.uid() 
            AND tm.role IN ('ADMIN', 'SUB_ADMIN')
            AND tm.status = 'ACTIVE'
        ))
    );

-- Users can delete their own conversations
CREATE POLICY "Users can delete their conversations" ON public.conversations
    FOR DELETE USING (
        (auth.uid() = participant_a) OR 
        (auth.uid() = participant_b) OR
        -- Team admins can delete team chats
        (chat_type = 'TEAM_PLAYER' AND team_context_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = team_context_id 
            AND tm.user_id = auth.uid() 
            AND tm.role IN ('ADMIN', 'SUB_ADMIN')
            AND tm.status = 'ACTIVE'
        ))
    );

-- Also need to recreate the direct_messages table foreign key constraint
-- since it was dropped with CASCADE
ALTER TABLE public.direct_messages 
    ADD CONSTRAINT direct_messages_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Update direct_messages policies to handle team context
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.direct_messages;

-- Recreate direct_messages policies with team context support
CREATE POLICY "Users can view messages in their conversations" ON public.direct_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = direct_messages.conversation_id 
            AND (
                (c.participant_a = auth.uid()) OR 
                (c.participant_b = auth.uid()) OR
                -- Team members can see messages in team chats
                (c.chat_type = 'TEAM_PLAYER' AND c.team_context_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.team_members tm 
                    WHERE tm.team_id = c.team_context_id 
                    AND tm.user_id = auth.uid() 
                    AND tm.status = 'ACTIVE'
                ))
            )
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON public.direct_messages
    FOR INSERT WITH CHECK (
        (auth.uid() = sender_id) AND 
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = direct_messages.conversation_id 
            AND (
                (c.participant_a = auth.uid()) OR 
                (c.participant_b = auth.uid()) OR
                -- Team members can send messages in team chats
                (c.chat_type = 'TEAM_PLAYER' AND c.team_context_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.team_members tm 
                    WHERE tm.team_id = c.team_context_id 
                    AND tm.user_id = auth.uid() 
                    AND tm.status = 'ACTIVE'
                ))
            )
        )
    );

-- Add comment for documentation
COMMENT ON TABLE public.conversations IS 'Conversations table supporting both direct messages and team-player chats';
COMMENT ON COLUMN public.conversations.chat_type IS 'Type of conversation: DIRECT for 1-on-1, TEAM_PLAYER for player-team communication';
COMMENT ON COLUMN public.conversations.team_context_id IS 'Team ID when chat_type is TEAM_PLAYER, null for direct chats';