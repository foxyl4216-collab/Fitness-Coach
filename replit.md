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

## Architecture
- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server (port 5000) - currently serves landing page and API stubs
- **State**: AsyncStorage for local persistence, React Context for shared state
- **Fonts**: Rubik (Google Fonts)
- **Theme**: Dark mode with coral orange (#FF6B35) primary and teal (#0D9488) secondary

## Key Files
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

## User Preferences
- None recorded yet
