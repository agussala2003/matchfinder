# 🚀 MATCHFINDER - IMPROVEMENTS & CODE AUDIT REPORT

This document outlines the findings from a deep static code analysis of the MatchFinder application. It highlights critical bugs, architectural improvements, and missing features that should be addressed during the migration or next development sprint.

---

## 🚨 CRITICAL ISSUES (Must Fix)

### 1. 🕒 Timezone & Date Handling
- **Location**: `app/match/[id].tsx` (Lines 256, 299)
- **Issue**: Dates are being parsed and formatted using manual string manipulation (`split`, `parseInt`, `getFullYear`). This is highly error-prone and will break across different devices/locales.
- **Recommendation**:
  - Install `date-fns` or `dayjs`.
  - Replace manual parsing with `parseISO` and `format`.
  - Ensure all dates sent to Supabase are UTC.

### 2. 🎭 Hardcoded Dashboard
- **Location**: `app/(tabs)/index.tsx`
- **Issue**: The entire dashboard (User name "Agustín", "Sede: Fútbol 5 Palermo", "HOY 20:00HS") is static JSX. It is not connected to `authService` or `matchesService`.
- **Recommendation**:
  - Fetch User Profile on mount.
  - Fetch "Next Match" using `matchesService.getNextMatch()`.
  - Implement dynamic rendering for the "Hero Section".

### 3. 📸 Unimplemented W.O. Logic
- **Location**: `app/match/[id].tsx` (Lines 776-781)
- **Issue**: The "TOMAR FOTO" button for Walkover evidence only shows a toast "Función no implementada".
- **Recommendation**:
  - Integrate `expo-camera` or `expo-image-picker`.
  - Upload evidence to Supabase Storage (`storage.service.ts`).
  - Update match status to `WO_A` or `WO_B` with evidence URL.

---

## 🏗️ ARCHITECTURAL IMPROVEMENTS

### 1. 🧩 Decompose "God Components"
- **Component**: `MatchScreen` (`app/match/[id].tsx`)
- **Size**: ~800 lines.
- **Problem**: Mixes data fetching, intricate state logic (previa/checkin/postmatch), form handling (proposals), and UI rendering.
- **Refactor Plan**:
  - Extract Proposal Modal to `components/match/modals/ProposalModal.tsx`.
  - Extract Logic to custom hook `useMatchLogic(matchId)`.
  - Extract Edit/Check-in logic to separate sub-components.

### 2. ⚡ State Management & Caching
- **Current State**: `useState` + `useEffect` in every screen.
- **Problem**: Navigating out and back causes re-fetching (loading spinners everywhere).
- **Recommendation**:
  - Integrate **TanStack Query (React Query)**.
  - Cache `matches`, `teams`, and `profile` data.
  - Enable background refreshing without UI flickering.

### 3. 🌍 Centralized Constants
- **Current State**: "Fútbol 5/7/11", "60/90 min" are hardcoded strings in `app/match/[id].tsx`.
- **Recommendation**:
  - Move these to `lib/constants.ts` (`GAME_MODALITIES`, `GAME_DURATIONS`).
  - Use these constants to populate the UI selectors.

---

## 💅 UX/UI ENHANCEMENTS

### 1. 🚦 Login Flow Feedback
- **Location**: `app/login.tsx`
- **Issue**: The "Success" toast appears before `checkProfileAndRedirect` finishes. Users might see "Welcome" but wait 2-3 seconds on the login screen without feedback.
- **Fix**: Show a loading spinner text "Verificando perfil..." instead of keeping the generic loading state.

### 2. 📱 List Performance
- **Location**: `app/(tabs)/match.tsx`, `app/(tabs)/rivals.tsx`
- **Recommendation**: Replace `ScrollView` + `map` (or standard `FlatList`) with **FlashList** (Shopify) for smoother scrolling, especially for the "Rivals" list which could grow large.

### 3. 💬 Chat Experience
- **Location**: `components/match/ChatSection.tsx` (Inferred)
- **Improvement**: Implement "Optimistic UI" for sending messages. Currently, it waits for Supabase to confirm before showing the message, which can feel laggy on mobile networks.

---

## 🛡️ SECURITY & RULES

### 1. RLS Verification
- **Recommendation**: Ensure Supabase Row Level Security policies enforce that:
  - Only `team_members` with `role='ADMIN'` can update match status.
  - Profiles are only editable by the owning user.
  - (This involves checking SQL policies, not just TS code).

---

## 📝 SUMMARY

The app has a solid foundation with a clear structure (`services/`, `components/`, `app/`). However, the **Dashboard is fake**, the **Match Detail screen is too complex**, and **Date handling is brittle**. Prioritize fixing the Date issues and connecting the Dashboard to real data before adding new features.
