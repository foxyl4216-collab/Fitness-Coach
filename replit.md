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
- Camera-based calorie logging (AI estimated)
- AI-powered diet plan generation (GPT-5-nano via OpenAI integration) with Diet tab UI
- Diet plan screen with expandable meal cards, macro targets, and tips
- Weekly diet adaptation based on check-in weight trends
- Weekly check-in with adaptive plan updates
- Progress history with weight trend chart
- Profile management with reset option
- Supabase backend integration (auth, profiles, plans, diet plans, check-ins, calorie logs)
- Supabase Auth with login/signup screens and session management

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server (port 5000) with Supabase integration
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth with JWT tokens, Express middleware validation, user-scoped Supabase clients
- **State**: AsyncStorage for local persistence, React Context for shared state
- **Fonts**: Rubik (Google Fonts)
- **Theme**: Dark mode with black background, light green (#4ADE80) primary, white text

## Backend API Routes
All data routes require `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/signup` - Register new user (email, password). Auto-creates user_profiles row via DB trigger.
- `POST /api/auth/login` - Login, returns JWT tokens (access_token, refresh_token, expires_at)
- `POST /api/auth/logout` - Logout current session (requires auth)
- `GET /api/auth/me` - Get current user info (requires auth)
- `GET /api/auth/session` - Check session status, returns authenticated flag + user info (requires auth)
- `POST /api/auth/refresh` - Refresh session token (refresh_token in body)

### Profile
- `POST /api/profile/create` - Create/update user profile (age, height, weight, goal_type, focus_track, experience_level, diet_preference, equipment_access, weekly_availability)
- `GET /api/profile` - Get user profile

### Weekly Workout Plans
- `POST /api/weekly-plan` - Create/update weekly plan (week_number, calorie_target, workout_json)
- `GET /api/weekly-plan` - Get all plans (optional ?week=N)
- `GET /api/weekly-plan/current` - Get latest plan

### Diet Plans
- `POST /api/diet-plan/generate` - AI-generates personalized diet plan from user profile (calculates macros + GPT meal plan)
- `POST /api/diet-plan/adapt-week` - Adapts diet plan based on weekly check-in weight trends
- `POST /api/diet-plan/create` - Create/update diet plan (week_number, calorie_target, protein_target, diet_json)
- `GET /api/diet-plan/current` - Get latest diet plan

### Calorie Tracking
- `POST /api/calorie-log` - Add calorie log entry (date, food_name, calories, source)
- `POST /api/calorie-log/manual` - Manual food entry (food_name required, calories >= 0, date optional defaults to today)
- `POST /api/calorie-log/camera` - Camera/AI estimated entry (food_name, calories, confidence, source auto-set to "camera")
- `POST /api/calorie-log/scan` - **AI food image scan** (multipart/form-data with `image` field). Runs GPT-4o Vision, validates confidence ≥60%, saves with analysis_json. Rate limited: 10 scans/day per user.
- `GET /api/calorie-log/daily?date=YYYY-MM-DD` - Get daily logs with total calories and entry count
- `DELETE /api/calorie-log/:id` - Delete a calorie log entry

### Check-ins
- `POST /api/weekly-checkin` - Submit weekly check-in (week_number, weight, adherence_percent, energy_level, waist_measurement)
- `GET /api/weekly-checkin` - Get all check-ins
- `GET /api/weekly-checkin/latest` - Get latest check-in

### System
- `GET /api/health` - Server health check

## Backend File Structure
- `server/config/supabase.ts` - Supabase client initialization + user-scoped client factory
- `server/middleware/auth.ts` - JWT auth middleware, attaches userId, userEmail, supabaseClient to request
- `server/routes/auth.ts` - Auth endpoints (signup, login, logout, session, refresh)
- `server/routes/profile.ts` - User profile CRUD
- `server/routes/weekly-plan.ts` - Weekly plan management
- `server/routes/diet.ts` - Diet plan endpoints (create, current)
- `server/routes/checkin.ts` - Weekly check-in endpoints
- `server/routes/calorie-log.ts` - Calorie logging endpoints (manual, camera, daily, delete)
- `server/routes.ts` - Route registration
- `supabase/migration.sql` - Database schema + RLS policies + auto-profile trigger

## Database Tables (Supabase)
- `user_profiles` - User fitness profile (UNIQUE per user, auto-created on signup via trigger)
- `weekly_plans` - Workout plans per week (calorie_target, workout_json)
- `diet_plans` - Diet plans per week (calorie_target, protein_target, diet_json)
- `weekly_checkins` - Check-in data per week (weight, adherence, energy, waist)
- `calorie_logs` - Food log entries (food_name, calories, source, confidence, date)

## Key Frontend Files
- `lib/auth-context.tsx` - AuthProvider with login/signup/logout, token management
- `lib/auth-token.ts` - Token storage singleton (avoids circular dependency)
- `lib/context.tsx` - FitCoachProvider with all state management + backend sync
- `lib/query-client.ts` - API client with auth headers injection
- `lib/fitness-engine.ts` - Plan generation and adaptation logic
- `lib/storage.ts` - AsyncStorage data layer with types
- `app/login.tsx` - Login screen
- `app/signup.tsx` - Signup screen
- `app/onboarding.tsx` - 4-step onboarding flow
- `app/(tabs)/index.tsx` - Dashboard/home screen
- `app/(tabs)/workouts.tsx` - Weekly workout list
- `app/(tabs)/diet.tsx` - AI diet plan with expandable meal cards and macro targets
- `app/(tabs)/tracker.tsx` - Calorie tracker with food logging, manual entry, camera photo library, and live camera capture
- `app/(tabs)/progress.tsx` - Profile screen with user info, fitness details, progress history, and logout
- `app/workout-detail.tsx` - Exercise detail view
- `app/check-in.tsx` - Weekly check-in form

## Environment Variables
- `SUPABASE_URL` - Supabase project URL (env var)
- `SUPABASE_ANON_KEY` - Supabase anon/public key (secret)
- `SESSION_SECRET` - Session secret (secret)

## User Preferences
- Dark theme with black background and light green (#4ADE80) accents
- Rubik font family for energetic fitness aesthetic
