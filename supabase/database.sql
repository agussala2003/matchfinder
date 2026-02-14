-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenger_team_id uuid NOT NULL,
  target_team_id uuid NOT NULL,
  status USER-DEFINED DEFAULT 'PENDING'::challenge_status,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_challenger_team_id_fkey FOREIGN KEY (challenger_team_id) REFERENCES public.teams(id),
  CONSTRAINT challenges_target_team_id_fkey FOREIGN KEY (target_team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_a uuid NOT NULL,
  participant_b uuid NOT NULL,
  last_message_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant_a_fkey FOREIGN KEY (participant_a) REFERENCES public.profiles(id),
  CONSTRAINT conversations_participant_b_fkey FOREIGN KEY (participant_b) REFERENCES public.profiles(id)
);
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT direct_messages_pkey PRIMARY KEY (id),
  CONSTRAINT direct_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.market_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  team_id uuid,
  position_needed USER-DEFINED,
  status USER-DEFINED DEFAULT 'OPEN'::estado_mercado_enum,
  created_at timestamp with time zone DEFAULT now(),
  type text DEFAULT 'TEAM_SEEKING_PLAYER'::text,
  user_id uuid,
  description text,
  CONSTRAINT market_posts_pkey PRIMARY KEY (id),
  CONSTRAINT market_posts_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT market_posts_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT market_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.match_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  sender_team_id uuid NOT NULL,
  content text,
  type text DEFAULT 'TEXT'::text,
  proposal_data jsonb,
  status text DEFAULT 'SENT'::text,
  created_at timestamp with time zone DEFAULT now(),
  sender_user_id uuid,
  CONSTRAINT match_messages_pkey PRIMARY KEY (id),
  CONSTRAINT match_messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT match_messages_sender_team_id_fkey FOREIGN KEY (sender_team_id) REFERENCES public.teams(id),
  CONSTRAINT match_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.match_results (
  match_id uuid NOT NULL,
  goals_a integer DEFAULT 0,
  goals_b integer DEFAULT 0,
  is_draw boolean DEFAULT false,
  confirmed_by_a boolean DEFAULT false,
  confirmed_by_b boolean DEFAULT false,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT match_results_pkey PRIMARY KEY (match_id),
  CONSTRAINT match_results_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  season_id uuid,
  team_a_id uuid,
  team_b_id uuid,
  venue_id uuid,
  scheduled_at timestamp with time zone,
  status USER-DEFINED DEFAULT 'PENDING'::estado_partido_enum,
  is_friendly boolean DEFAULT false,
  booking_confirmed boolean DEFAULT false,
  wo_evidence_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id),
  CONSTRAINT matches_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id),
  CONSTRAINT matches_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id),
  CONSTRAINT matches_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['TEAM_INVITE'::text, 'MATCH_ALERT'::text, 'Match_RESULT'::text, 'SYSTEM'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.player_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  user_id uuid,
  team_id uuid,
  goals integer DEFAULT 0,
  is_mvp boolean DEFAULT false,
  CONSTRAINT player_stats_pkey PRIMARY KEY (id),
  CONSTRAINT player_stats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT player_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT player_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  full_name text NOT NULL,
  position USER-DEFINED DEFAULT 'ANY'::posicion_enum,
  reputation double precision DEFAULT 5.0,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seasons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.team_members (
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'PLAYER'::rol_enum,
  status USER-DEFINED DEFAULT 'ACTIVE'::estado_miembro_enum,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  captain_id uuid,
  elo_rating integer DEFAULT 1200,
  home_zone text NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  category USER-DEFINED NOT NULL DEFAULT 'MALE'::team_category,
  share_code text UNIQUE,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.venues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT venues_pkey PRIMARY KEY (id)
);