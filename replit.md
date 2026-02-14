# FitCoach - Adaptive Fitness Coach

## Overview
FitCoach is a personalized digital fitness coaching mobile app built with Expo/React Native. Users define fitness goals and receive adaptive weekly workout and diet plans based on structured check-ins.

## Current State
MVP complete with:
- Onboarding flow (goal/focus/details/lifestyle)
- Personalized plan generation (workout + diet)
- Dashboard with calorie tracking progress
- Weekly workout schedule with detail view
- Manual calorie tracker with favorites
- Weekly check-in with adaptive plan updates
- Progress history with weight trend chart
- Profile management with reset option
- Supabase backend integration (auth, profiles, plans, check-ins, calorie logs)

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server (port 5000) with Supabase integration
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth with JWT tokens, Express middleware validation
- **State**: AsyncStorage for local persistence, React Context for shared state
- **Fonts**: Rubik (Google Fonts)
- **Theme**: Dark mode with black background, light green (#4ADE80) primary, white text

## Backend API Routes
All data routes require `Authorization: Bearer <token>` header.

- `POST /api/auth/signup` - Register new user (email, password)
- `POST /api/auth/login` - Login, returns JWT tokens
- `POST /api/auth/logout` - Logout current session
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh session token
- `POST /api/profile/create` - Create/update user profile
- `GET /api/profile` - Get user profile
- `POST /api/weekly-plan` - Create/update weekly plan
- `GET /api/weekly-plan` - Get all plans (optional ?week=N)
- `GET /api/weekly-plan/current` - Get latest plan
- `POST /api/weekly-checkin` - Submit weekly check-in
- `GET /api/weekly-checkin` - Get all check-ins
- `GET /api/weekly-checkin/latest` - Get latest check-in
- `POST /api/calorie-log` - Add calorie log entry
- `GET /api/calorie-log/daily?date=YYYY-MM-DD` - Get daily logs with total
- `DELETE /api/calorie-log/:id` - Delete a calorie log entry
- `GET /api/health` - Server health check

## Backend File Structure
- `server/config/supabase.ts` - Supabase client initialization
- `server/middleware/auth.ts` - JWT auth middleware
- `server/routes/auth.ts` - Auth endpoints (signup, login, logout, refresh)
- `server/routes/profile.ts` - User profile CRUD
- `server/routes/weekly-plan.ts` - Weekly plan management
- `server/routes/checkin.ts` - Weekly check-in endpoints
- `server/routes/calorie-log.ts` - Calorie logging endpoints
- `server/routes.ts` - Route registration
- `supabase/migration.sql` - Database schema + RLS policies

## Key Frontend Files
- `lib/context.tsx` - FitCoachProvider with all state management
- `lib/fitness-engine.ts` - Plan generation and adaptation logic
- `lib/storage.ts` - AsyncStorage data layer with types
- `app/onboarding.tsx` - 4-step onboarding flow
- `app/(tabs)/index.tsx` - Dashboard/home screen
- `app/(tabs)/workouts.tsx` - Weekly workout list
- `app/(tabs)/tracker.tsx` - Calorie tracker with food logging
- `app/(tabs)/progress.tsx` - Progress history and profile
- `app/workout-detail.tsx` - Exercise detail view
- `app/check-in.tsx` - Weekly check-in form

## Environment Variables
- `SUPABASE_URL` - Supabase project URL (env var)
- `SUPABASE_ANON_KEY` - Supabase anon/public key (secret)
- `SESSION_SECRET` - Session secret (secret)

## User Preferences
- Dark theme with black background and light green (#4ADE80) accents
- Rubik font family for energetic fitness aesthetic
