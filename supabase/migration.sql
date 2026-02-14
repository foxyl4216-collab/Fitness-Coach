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
  confidence float,
  created_at timestamptz DEFAULT now()
);

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

-- Optional: Auto-create user profile on signup via trigger
-- This ensures a user_profiles row exists for every auth.users entry
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
