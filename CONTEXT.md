# 📋 PROJECT CONTEXT & MIGRATION GUIDE - MatchFinder

This document provides a complete overview of the **MatchFinder** project to facilitate migration to another AI agent or developer. It includes the technical stack, project structure, core features, database schema, and recommended improvements.

---

## 🎯 **OVERVIEW**
**MatchFinder** is a mobile application built with **React Native + Expo** designed for amateur sports team management. Ideally acting as a social platform for teams, it allows users to:
- Create and manage sports teams.
- Find rival teams and issue challenges.
- Organize matches with real-time chat.
- Track player attendance (check-in) and match results.

---

## 🏗️ **TECH STACK**

### **Frontend**
- **Framework**: React Native (`0.81.5`) with Expo (`~54.0.33`)
- **Routing**: Expo Router (`~6.0.23`) - File-based routing
- **Language**: TypeScript (Strict mode)
- **Styling**: NativeWind (`^4.2.1`) - Tailwind CSS for React Native
- **Icons**: Lucide React Native (`^0.563.0`)
- **State Management**:
    - Global UI: `zustand` (`^5.0.11`)
    - Toast Notifications: React Context (`ToastContext.tsx`)
    - Auth State: React Context / Hooks (`_layout.tsx`)

### **Backend & BaaS**
- **Supabase**: Authentication, Database (PostgreSQL), Storage.
- **Client**: `@supabase/supabase-js` (`^2.94.1`)
- **Real-time**: Supabase Realtime for chat and updates.

### **Key Libraries**
- **Navigation**: React Navigation v7 (via Expo Router)
- **Forms/Validation**: `zod` (`^4.3.6`)
- **Storage**: `@react-native-async-storage/async-storage`
- **Date Handling**: Native `Date` objects / formatting utils (consider `date-fns` if not present)

---

## 📁 **PROJECT STRUCTURE**

```
matchfinder/
├── 📱 app/                          # Expo Router Pages (Navigation)
│   ├── _layout.tsx                  # Root Layout + Auth Guard + Providers
│   ├── login.tsx                    # Auth Screen
│   ├── onboarding.tsx               # Initial Profile Setup
│   ├── (tabs)/                      # Main App Tabs
│   │   ├── _layout.tsx              # Tab Config (Home, Matches, Rivals, Market, Profile)
│   │   ├── index.tsx                # Dashboard
│   │   ├── match.tsx                # Match History/List
│   │   ├── rivals.tsx               # Rival Finder
│   │   ├── market.tsx               # Player Transfer Market
│   │   └── profile.tsx              # User Profile Settings
│   └── match/                       # Dynamic Routes
│       └── [id].tsx                 # Match Detail View
│
├── 🧩 components/                   # UI Components
│   ├── ui/                         # Base Primitives (Button, Input, Avatar, Toast)
│   ├── auth/                       # Auth Forms
│   ├── match/                      # Match Cards & Details
│   ├── teams/                      # Team Management Components
│   └── ...                         # Feature-specific components
│
├── 🛠️ services/                     # Business Logic Layer (Supabase interactions)
│   ├── auth.service.ts             # Authentication logic
│   ├── teams.service.ts            # Team CRUD & Member management
│   ├── matches.service.ts          # Match creation & status updates
│   ├── challenges.service.ts       # Challenge system logic
│   ├── chat.service.ts             # Real-time chat logic
│   └── storage.service.ts          # File upload (avatars, logos)
│
├── 📋 types/                        # TypeScript Definitions
│   ├── core.ts                     # Shared enums (UserRole, TeamMemberStatus) & interfaces
│   ├── auth.ts                     # User & Profile types
│   ├── teams.ts                    # Team & Member types
│   ├── matches.ts                  # Match types
│   └── ...                         # Other domain types
│
├── ⚙️ lib/                          # Configuration & Data Clients
│   ├── supabase.ts                 # Supabase client instantiation
│   ├── config.ts                   # App-wide constants & config
│   └── ...
│
└── 📦 Config Files
    ├── package.json                # Dependencies
    ├── app.json                    # Expo config
    ├── tailwind.config.js          # NativeWind theme config
    └── tsconfig.json               # TypeScript config
```

---

## 🗄️ **DATABASE SCHEMA (Inferred)**

Based on the TypeScript interfaces and service logic, the Supabase database likely contains the following tables:

1.  **`users` / `profiles`**:
    -   `id` (UUID, PK)
    -   `username`, `full_name`, `avatar_url`
    -   `position`, `zone`
    -   `matches_played`, `goals_scored`, `wins` (Added for stats)
2.  **`teams`**:
    -   `id` (UUID, PK)
    -   `name`, `logo_url`
    -   `home_zone`, `category`
    -   `captain_id` (FK to users)
    -   `elo_rating` (Integer)
    -   `share_code` (Unique string for invites)
3.  **`team_members`**:
    -   `team_id` (FK), `user_id` (FK)
    -   `role` (Enum: 'ADMIN', 'SUB_ADMIN', 'PLAYER')
    -   `status` (Enum: 'ACTIVE', 'INACTIVE', 'PENDING')
    -   `joined_at`
4.  **`matches`**:
    -   `id` (PK)
    -   `home_team_id`, `away_team_id`
    -   `date`, `location`, `status`
    -   `result_home`, `result_away`
    -   `walkover_evidence_url`
5.  **`match_players`** (Stats per match):
    -   `match_id`, `user_id`, `team_id`
    -   `goals`, `assists`, `rating`, `is_mvp`
6.  **`conversations`**:
    -   `id`, `participant_a`, `participant_b`
    -   `last_message_at`
7.  **`direct_messages`**:
    -   `id`, `conversation_id`, `sender_id`, `content`
    -   `created_at`, `is_read`
8.  **`market_posts`**:
    -   `id`, `user_id`, `team_id` (nullable)
    -   `type` ('PLAYER_LOOKING_TEAM', 'TEAM_SEEKING_PLAYER')
    -   `position_needed`, `zone`, `description`
9.  **`challenges`** (for proposing matches)
10. **`messages`** (for match chat)

---

## 🔑 **KEY FEATURES**

1.  **Authentication**: Secure login/signup via Supabase Auth.
2.  **Team Management**:
    -   Create teams with metadata (zone, category).
    -   Manage roster (Promote/Demote roles, Remove members).
    -   Invite via unique Share Codes.
3.  **Match Flow**:
    -   States: Pending -> Confirmed -> Live -> Finished.
    -   **Post-Match Analysis**: Track goals, MVP, and player ratings.
    -   **Walkover Evidence**: Upload photo proof for W.O.
4.  **Transfer Market**:
    -   Players and Teams can post ads.
    -   Filter by position (e.g., "Arquero", "Mediocampista").
    -   Direct "Contact" button starts a chat.
5.  **Real-time Chat**:
    -   1-on-1 private messaging.
    -   Real-time updates (Supabase Realtime).
    -   Inbox with unread indicators (visual).
6.  **Rivals & Challenges**: Search for teams by zone and issue challenges.

---

## 🚀 **RECOMMENDED IMPROVEMENTS & ROADMAP**

### **1. Architecture & State Management**
-   **TanStack Query (React Query)**: Currently, services call Supabase directly. Introducing React Query would handle caching, loading states, and re-fetching much more efficiently.
-   **Optimistic Updates**: Implement optimistic UI for actions like "Join Team" or "Send Message" to make the app feel instant.

### **2. Performance & UX**
-   **FlashList**: Replace standard `FlatList` with Shopify's `FlashList` for better performance on long lists (Matches, Rivals).
-   **Image Optimization**: Ensure `expo-image` is used effectively with caching policies.

### **3. Features**
-   **Push Notifications**: Integrate Expo Notifications for match invites and chat messages.
-   **Offline Mode**: Enhance `AsyncStorage` usage or WatermelonDB to allow viewing data offline.

### **4. DevOps & Code Quality**
-   **CI/CD**: Set up EAS Build for automated builds.
-   **Testing**: Add unit tests (Jest) for `services/` logic and integration tests (Maestro/Detox) for critical flows.

---

## 🛠️ **SETUP INSTRUCTIONS**

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Variables**:
    Create a `.env` file with:
    ```bash
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
    ```
3.  **Run Development Server**:
    ```bash
    npx expo start
    ```
    -   Press `a` for Android Emulator
    -   Press `i` for iOS Simulator
