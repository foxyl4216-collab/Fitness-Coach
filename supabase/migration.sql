-- FitCoach Database Migration
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- TABLE: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age int,
  height int,
  weight float,
  goal_type text CHECK (goal_type IN ('fat_loss', 'muscle_gain', 'reduce_belly_fat', 'glute_growth')),
  focus_track text,
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  diet_preference text CHECK (diet_preference IN ('standard', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean')),
  equipment_access text CHECK (equipment_access IN ('none', 'minimal', 'full_gym')),
  weekly_availability int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Fix FK to ensure it points to auth.users (not public.users)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove any check constraint on focus_track (values are unrestricted)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_focus_track_check;

-- TABLE: weekly_plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  calorie_target int,
  workout_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- TABLE: diet_plans
CREATE TABLE IF NOT EXISTS diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number int NOT NULL CHECK (week_number >= 1),
  calorie_target int CHECK (calorie_target >= 0),
  protein_target int CHECK (protein_target >= 0),
  diet_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLE: weekly_checkins
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  weight float,
  adherence_percent int CHECK (adherence_percent >= 0 AND adherence_percent <= 100),
  energy_level text CHECK (energy_level IN ('low', 'moderate', 'high')),
  waist_measurement float,
  created_at timestamptz DEFAULT now()
);

-- TABLE: calorie_logs
CREATE TABLE IF NOT EXISTS calorie_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  food_name text NOT NULL,
  calories int DEFAULT 0 CHECK (calories >= 0),
  source text DEFAULT 'manual',
  confidence numeric,
  analysis_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add missing columns to existing tables (safe to run multiple times)
ALTER TABLE calorie_logs ADD COLUMN IF NOT EXISTS confidence numeric;
ALTER TABLE calorie_logs ADD COLUMN IF NOT EXISTS analysis_json jsonb;

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own rows

-- user_profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- weekly_plans policies
CREATE POLICY "Users can view own plans"
  ON weekly_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON weekly_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- diet_plans policies
CREATE POLICY "Users can view own diet plans"
  ON diet_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diet plans"
  ON diet_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diet plans"
  ON diet_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- weekly_checkins policies
CREATE POLICY "Users can view own checkins"
  ON weekly_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON weekly_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- calorie_logs policies
CREATE POLICY "Users can view own calorie logs"
  ON calorie_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calorie logs"
  ON calorie_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calorie logs"
  ON calorie_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_week ON weekly_plans(user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_diet_plans_user_id ON diet_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_week ON diet_plans(user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user_id ON weekly_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week ON weekly_checkins(user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_id ON calorie_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_calorie_logs_date ON calorie_logs(user_id, date);

-- TABLE: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Auto-create user profile on signup via trigger (subscription created by backend)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
