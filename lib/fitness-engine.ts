import type { UserProfile, WeeklyPlan, WorkoutDay, Exercise, CheckIn } from './storage';

function calculateBMR(profile: UserProfile): number {
  if (profile.gender === 'male') {
    return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
  }
  return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
}

function getActivityMultiplier(daysPerWeek: number): number {
  if (daysPerWeek <= 2) return 1.375;
  if (daysPerWeek <= 4) return 1.55;
  return 1.725;
}

function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  return Math.round(bmr * getActivityMultiplier(profile.daysPerWeek));
}

function calculateCalories(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);
  if (profile.goal === 'fat_loss') {
    return Math.round(tdee * 0.82);
  }
  return tdee + 250;
}

function calculateProtein(profile: UserProfile): number {
  if (profile.goal === 'muscle_gain') {
    return Math.round(profile.weightKg * 2.0);
  }
  return Math.round(profile.weightKg * 1.8);
}

// ─── BEGINNER / INTERMEDIATE POOLS ───────────────────────────────────────────

const COMPOUND_EXERCISES: Exercise[] = [
  { name: 'Barbell Squat', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Deadlift', sets: 3, reps: '6-8', rest: '120s' },
  { name: 'Overhead Press', sets: 3, reps: '8-10', rest: '90s' },
  { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Pull-ups', sets: 3, reps: '6-10', rest: '90s' },
];

const BODYWEIGHT_EXERCISES: Exercise[] = [
  { name: 'Push-ups', sets: 3, reps: '12-15', rest: '60s' },
  { name: 'Bodyweight Squats', sets: 3, reps: '15-20', rest: '60s' },
  { name: 'Lunges', sets: 3, reps: '12 each', rest: '60s' },
  { name: 'Plank', sets: 3, reps: '30-45s', rest: '45s' },
  { name: 'Glute Bridge', sets: 3, reps: '15-20', rest: '60s' },
  { name: 'Mountain Climbers', sets: 3, reps: '20 each', rest: '45s' },
  { name: 'Burpees', sets: 3, reps: '8-12', rest: '60s' },
  { name: 'Tricep Dips (chair)', sets: 3, reps: '10-15', rest: '60s' },
  { name: 'Superman Hold', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'High Knees', sets: 3, reps: '30s', rest: '30s' },
];

const BASIC_EQUIPMENT_EXERCISES: Exercise[] = [
  { name: 'Dumbbell Goblet Squat', sets: 3, reps: '12-15', rest: '60s' },
  { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', rest: '60s' },
  { name: 'Dumbbell Row', sets: 3, reps: '10-12 each', rest: '60s' },
  { name: 'Dumbbell Curl', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'Dumbbell Lunges', sets: 3, reps: '10 each', rest: '60s' },
  { name: 'Dumbbell Floor Press', sets: 3, reps: '10-12', rest: '60s' },
  { name: 'Resistance Band Pull-aparts', sets: 3, reps: '15-20', rest: '45s' },
  { name: 'Dumbbell Romanian Deadlift', sets: 3, reps: '10-12', rest: '60s' },
];

const CORE_EXERCISES: Exercise[] = [
  { name: 'Bicycle Crunches', sets: 3, reps: '20 each', rest: '45s' },
  { name: 'Leg Raises', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'Russian Twists', sets: 3, reps: '15 each', rest: '45s' },
  { name: 'Dead Bug', sets: 3, reps: '10 each', rest: '45s' },
  { name: 'Plank', sets: 3, reps: '45-60s', rest: '45s' },
];

const GLUTE_EXERCISES: Exercise[] = [
  { name: 'Hip Thrust', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', rest: '60s' },
  { name: 'Sumo Squat', sets: 3, reps: '12-15', rest: '60s' },
  { name: 'Cable Kickback', sets: 3, reps: '12 each', rest: '45s' },
  { name: 'Glute Bridge Hold', sets: 3, reps: '30s', rest: '45s' },
  { name: 'Clamshells', sets: 3, reps: '15 each', rest: '45s' },
];

// ─── ADVANCED MUSCLE GROUP POOLS (full gym) ──────────────────────────────────

const ADV_CHEST: Exercise[] = [
  { name: 'Barbell Bench Press', sets: 5, reps: '5-6', rest: '120s' },
  { name: 'Incline DB Press', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Cable Fly', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Weighted Dips', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Decline Bench Press', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'DB Pullover', sets: 3, reps: '12-15', rest: '60s' },
  { name: 'Pec Deck Fly', sets: 3, reps: '12-15', rest: '60s' },
];

const ADV_BACK: Exercise[] = [
  { name: 'Deadlift', sets: 5, reps: '4-5', rest: '180s' },
  { name: 'Weighted Pull-ups', sets: 4, reps: '6-8', rest: '90s' },
  { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Lat Pulldown', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Seated Cable Row', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'T-Bar Row', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Face Pulls', sets: 3, reps: '15-20', rest: '45s' },
];

const ADV_SHOULDERS: Exercise[] = [
  { name: 'Overhead Barbell Press', sets: 5, reps: '5-6', rest: '120s' },
  { name: 'DB Lateral Raise', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Cable Lateral Raise', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Rear Delt Fly', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Arnold Press', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Upright Row', sets: 3, reps: '10-12', rest: '60s' },
  { name: 'DB Front Raise', sets: 3, reps: '12-15', rest: '60s' },
];

const ADV_LEGS: Exercise[] = [
  { name: 'Barbell Squat', sets: 5, reps: '5-6', rest: '180s' },
  { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Leg Press', sets: 4, reps: '10-12', rest: '90s' },
  { name: 'Leg Curl', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Leg Extension', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Walking Lunges', sets: 4, reps: '12 each', rest: '60s' },
  { name: 'Hack Squat', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Calf Raise', sets: 4, reps: '15-20', rest: '60s' },
];

const ADV_TRICEPS: Exercise[] = [
  { name: 'Close-Grip Bench Press', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Tricep Pushdown', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Skull Crushers', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Overhead Tricep Extension', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Rope Pushdown', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'Diamond Push-ups', sets: 4, reps: '12-15', rest: '60s' },
];

const ADV_BICEPS: Exercise[] = [
  { name: 'Barbell Curl', sets: 4, reps: '8-10', rest: '75s' },
  { name: 'DB Hammer Curl', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Incline DB Curl', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Preacher Curl', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Cable Curl', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'Concentration Curl', sets: 3, reps: '12-15', rest: '45s' },
];

const ADV_CORE: Exercise[] = [
  { name: 'Hanging Leg Raise', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Ab Wheel Rollout', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Cable Crunch', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Weighted Russian Twists', sets: 4, reps: '20 each', rest: '45s' },
  { name: 'Dragon Flag', sets: 3, reps: '6-8', rest: '75s' },
  { name: 'Plank (weighted)', sets: 4, reps: '60s', rest: '45s' },
];

const ADV_GLUTES: Exercise[] = [
  { name: 'Hip Thrust (barbell)', sets: 5, reps: '10-12', rest: '90s' },
  { name: 'Bulgarian Split Squat', sets: 4, reps: '10 each', rest: '75s' },
  { name: 'Sumo Deadlift', sets: 4, reps: '8-10', rest: '90s' },
  { name: 'Cable Kickback', sets: 4, reps: '15 each', rest: '45s' },
  { name: 'Abductor Machine', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Weighted Glute Bridge', sets: 4, reps: '12-15', rest: '60s' },
];

// ─── ADVANCED POOLS — basic equipment fallbacks ───────────────────────────────

const ADV_CHEST_BASIC: Exercise[] = [
  { name: 'DB Bench Press', sets: 5, reps: '8-10', rest: '90s' },
  { name: 'Incline DB Press', sets: 4, reps: '10-12', rest: '90s' },
  { name: 'Diamond Push-ups', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Decline Push-ups', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'DB Floor Press', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Push-up Variations', sets: 4, reps: '20-25', rest: '60s' },
];

const ADV_BACK_BASIC: Exercise[] = [
  { name: 'DB Row', sets: 5, reps: '10-12 each', rest: '75s' },
  { name: 'Pull-ups', sets: 4, reps: '8-12', rest: '90s' },
  { name: 'DB Romanian Deadlift', sets: 4, reps: '10-12', rest: '90s' },
  { name: 'Band Pull-aparts', sets: 4, reps: '20-25', rest: '45s' },
  { name: 'Inverted Row', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Superman Hold', sets: 4, reps: '15-20', rest: '45s' },
];

const ADV_SHOULDERS_BASIC: Exercise[] = [
  { name: 'DB Overhead Press', sets: 5, reps: '8-10', rest: '90s' },
  { name: 'DB Lateral Raise', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'DB Front Raise', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'DB Rear Delt Fly', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Arnold Press', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Band Upright Row', sets: 4, reps: '12-15', rest: '60s' },
];

const ADV_LEGS_BASIC: Exercise[] = [
  { name: 'DB Goblet Squat', sets: 5, reps: '10-12', rest: '90s' },
  { name: 'DB Romanian Deadlift', sets: 4, reps: '10-12', rest: '90s' },
  { name: 'Walking Lunges (DB)', sets: 4, reps: '12 each', rest: '75s' },
  { name: 'Bulgarian Split Squat', sets: 4, reps: '10 each', rest: '75s' },
  { name: 'Sumo Squat (DB)', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Jump Squat', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Calf Raise', sets: 4, reps: '20-25', rest: '45s' },
];

const ADV_TRICEPS_BASIC: Exercise[] = [
  { name: 'Diamond Push-ups', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Tricep Dips', sets: 4, reps: '12-15', rest: '75s' },
  { name: 'Overhead DB Extension', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'DB Kickback', sets: 4, reps: '12-15 each', rest: '45s' },
  { name: 'Skull Crushers (DB)', sets: 4, reps: '12-15', rest: '75s' },
  { name: 'Band Pushdown', sets: 4, reps: '15-20', rest: '45s' },
];

const ADV_BICEPS_BASIC: Exercise[] = [
  { name: 'DB Curl', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Hammer Curl', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Incline DB Curl', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Concentration Curl', sets: 4, reps: '12-15 each', rest: '45s' },
  { name: 'Band Curl', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Zottman Curl', sets: 3, reps: '10-12', rest: '60s' },
];

// ─── ADVANCED POOLS — bodyweight fallbacks ────────────────────────────────────

const ADV_CHEST_BW: Exercise[] = [
  { name: 'Push-ups', sets: 5, reps: '20-25', rest: '60s' },
  { name: 'Decline Push-ups', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Diamond Push-ups', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Plyometric Push-ups', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Incline Push-ups', sets: 4, reps: '20-25', rest: '60s' },
  { name: 'Archer Push-ups', sets: 3, reps: '8-10 each', rest: '75s' },
];

const ADV_BACK_BW: Exercise[] = [
  { name: 'Pull-ups', sets: 5, reps: '8-12', rest: '90s' },
  { name: 'Chin-ups', sets: 4, reps: '8-12', rest: '90s' },
  { name: 'Inverted Row', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Superman Hold', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Bodyweight Good Morning', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Prone Y-T-W', sets: 3, reps: '12-15', rest: '45s' },
];

const ADV_SHOULDERS_BW: Exercise[] = [
  { name: 'Pike Push-ups', sets: 5, reps: '12-15', rest: '60s' },
  { name: 'Handstand Push-ups', sets: 4, reps: '6-10', rest: '90s' },
  { name: 'Pike Hold', sets: 4, reps: '30-45s', rest: '60s' },
  { name: 'Lateral Raise (band)', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Wall Shoulder Press', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'Prone T-raise', sets: 3, reps: '15-20', rest: '45s' },
];

const ADV_LEGS_BW: Exercise[] = [
  { name: 'Pistol Squat', sets: 4, reps: '6-8 each', rest: '90s' },
  { name: 'Jump Squat', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Bulgarian Split Squat', sets: 4, reps: '12 each', rest: '75s' },
  { name: 'Step-up (elevated)', sets: 4, reps: '12 each', rest: '60s' },
  { name: 'Nordic Curl', sets: 3, reps: '6-8', rest: '90s' },
  { name: 'Box Jump', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Calf Raise (single leg)', sets: 4, reps: '15-20 each', rest: '45s' },
];

const ADV_TRICEPS_BW: Exercise[] = [
  { name: 'Diamond Push-ups', sets: 5, reps: '15-20', rest: '60s' },
  { name: 'Tricep Dips', sets: 4, reps: '15-20', rest: '75s' },
  { name: 'Close-Grip Push-ups', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Bench Dips', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'Pike Push-up Lockout', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'Overhead Tricep Extension (band)', sets: 3, reps: '15-20', rest: '45s' },
];

const ADV_BICEPS_BW: Exercise[] = [
  { name: 'Chin-ups', sets: 5, reps: '8-12', rest: '90s' },
  { name: 'Negative Chin-ups', sets: 4, reps: '5-6', rest: '90s' },
  { name: 'Inverted Underhand Row', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'Band Curl', sets: 4, reps: '15-20', rest: '45s' },
  { name: 'Isometric Bicep Hold', sets: 4, reps: '20-30s', rest: '45s' },
  { name: 'Towel Curl', sets: 3, reps: '12-15', rest: '60s' },
];

// ─── MUSCLE GROUP LOOKUP ──────────────────────────────────────────────────────

type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'triceps' | 'biceps' | 'core' | 'glutes';

function getMuscleGroupPool(mg: MuscleGroup, equipment: string): Exercise[] {
  if (equipment === 'full_gym') {
    const pools: Record<MuscleGroup, Exercise[]> = {
      chest: ADV_CHEST, back: ADV_BACK, shoulders: ADV_SHOULDERS,
      legs: ADV_LEGS, triceps: ADV_TRICEPS, biceps: ADV_BICEPS,
      core: ADV_CORE, glutes: ADV_GLUTES,
    };
    return pools[mg];
  }
  if (equipment === 'basic') {
    const pools: Record<MuscleGroup, Exercise[]> = {
      chest: ADV_CHEST_BASIC, back: ADV_BACK_BASIC, shoulders: ADV_SHOULDERS_BASIC,
      legs: ADV_LEGS_BASIC, triceps: ADV_TRICEPS_BASIC, biceps: ADV_BICEPS_BASIC,
      core: ADV_CORE, glutes: ADV_GLUTES,
    };
    return pools[mg];
  }
  const pools: Record<MuscleGroup, Exercise[]> = {
    chest: ADV_CHEST_BW, back: ADV_BACK_BW, shoulders: ADV_SHOULDERS_BW,
    legs: ADV_LEGS_BW, triceps: ADV_TRICEPS_BW, biceps: ADV_BICEPS_BW,
    core: ADV_CORE, glutes: ADV_GLUTES,
  };
  return pools[mg];
}

function pickFrom(pool: Exercise[], count: number): Exercise[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

// ─── ADVANCED SPLIT DEFINITIONS ───────────────────────────────────────────────

const BASE_SPLITS: Record<number, [MuscleGroup, MuscleGroup][]> = {
  1: [['chest', 'legs']],
  2: [['chest', 'back'], ['legs', 'shoulders']],
  3: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes']],
  4: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['shoulders', 'core']],
  5: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['shoulders', 'core'], ['legs', 'back']],
  6: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['shoulders', 'core'], ['chest', 'shoulders'], ['back', 'biceps']],
  7: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['shoulders', 'core'], ['chest', 'back'], ['legs', 'core'], ['shoulders', 'biceps']],
};

const SPLIT_BELLY_FAT: Record<number, [MuscleGroup, MuscleGroup][]> = {
  1: [['legs', 'core']],
  2: [['chest', 'core'], ['legs', 'core']],
  3: [['chest', 'core'], ['back', 'biceps'], ['legs', 'core']],
  4: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'core'], ['shoulders', 'core']],
  5: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'core'], ['shoulders', 'core'], ['legs', 'core']],
  6: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'core'], ['shoulders', 'core'], ['chest', 'core'], ['legs', 'back']],
  7: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'core'], ['shoulders', 'core'], ['chest', 'back'], ['legs', 'core'], ['shoulders', 'core']],
};

const SPLIT_GLUTE: Record<number, [MuscleGroup, MuscleGroup][]> = {
  1: [['legs', 'glutes']],
  2: [['legs', 'glutes'], ['chest', 'back']],
  3: [['legs', 'glutes'], ['back', 'biceps'], ['glutes', 'core']],
  4: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['glutes', 'core']],
  5: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['glutes', 'core'], ['shoulders', 'glutes']],
  6: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['glutes', 'core'], ['shoulders', 'core'], ['legs', 'glutes']],
  7: [['chest', 'triceps'], ['back', 'biceps'], ['legs', 'glutes'], ['glutes', 'core'], ['shoulders', 'core'], ['legs', 'glutes'], ['back', 'biceps']],
};

const SPLIT_TITLES: Partial<Record<string, string>> = {
  'chest-triceps': 'Push Day — Chest & Triceps',
  'back-biceps': 'Pull Day — Back & Biceps',
  'legs-glutes': 'Leg Day — Quads & Glutes',
  'shoulders-core': 'Shoulders & Core',
  'chest-back': 'Upper Body Power',
  'legs-core': 'Legs & Core Conditioning',
  'shoulders-biceps': 'Arms & Delts',
  'chest-core': 'Push & Core',
  'legs-back': 'Posterior Chain',
  'shoulders-glutes': 'Delts & Glutes',
  'glutes-core': 'Glute & Core Burn',
  'chest-shoulders': 'Upper Push — Chest & Shoulders',
  'chest-legs': 'Full Body Power',
  'legs-shoulders': 'Lower Body & Delts',
};

function getSplitTitle(mg1: MuscleGroup, mg2: MuscleGroup): string {
  return (
    SPLIT_TITLES[`${mg1}-${mg2}`] ||
    SPLIT_TITLES[`${mg2}-${mg1}`] ||
    `${mg1.charAt(0).toUpperCase() + mg1.slice(1)} & ${mg2.charAt(0).toUpperCase() + mg2.slice(1)}`
  );
}

// ─── WORKOUT GENERATORS ───────────────────────────────────────────────────────

function generateAdvancedWorkouts(profile: UserProfile): WorkoutDay[] {
  const days = profile.daysPerWeek;
  const clampedDays = Math.min(Math.max(days, 1), 7) as keyof typeof BASE_SPLITS;

  const splitMap =
    profile.focusTrack === 'belly_fat' ? SPLIT_BELLY_FAT :
    profile.focusTrack === 'glute_gain' ? SPLIT_GLUTE :
    BASE_SPLITS;

  const pairs = splitMap[clampedDays] || BASE_SPLITS[clampedDays];

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workoutDays: WorkoutDay[] = [];
  let workoutDayCount = 0;

  for (let i = 0; i < 7; i++) {
    if (workoutDayCount < days) {
      const [mg1, mg2] = pairs[workoutDayCount % pairs.length];
      const pool1 = getMuscleGroupPool(mg1, profile.equipment);
      const pool2 = getMuscleGroupPool(mg2, profile.equipment);
      const exercises = [
        ...pickFrom(pool1, 5),
        ...pickFrom(pool2, 5),
      ];
      const title = getSplitTitle(mg1, mg2);

      let cardio: string | undefined;
      if (profile.goal === 'fat_loss') {
        cardio = '20 min steady-state cardio or HIIT after workout';
      } else if (profile.focusTrack === 'belly_fat') {
        cardio = '15 min HIIT or brisk walk';
      }

      workoutDays.push({
        dayName: DAY_NAMES[i],
        title,
        exercises,
        isRestDay: false,
        cardio,
      });
      workoutDayCount++;
    } else {
      workoutDays.push({ dayName: DAY_NAMES[i], title: 'Rest Day', exercises: [], isRestDay: true });
    }
  }
  return workoutDays;
}

function getExercisePool(profile: UserProfile): Exercise[] {
  if (profile.equipment === 'full_gym') return [...COMPOUND_EXERCISES, ...BASIC_EQUIPMENT_EXERCISES];
  if (profile.equipment === 'basic') return [...BASIC_EQUIPMENT_EXERCISES, ...BODYWEIGHT_EXERCISES];
  return BODYWEIGHT_EXERCISES;
}

function generateStandardWorkouts(profile: UserProfile): WorkoutDay[] {
  const days: WorkoutDay[] = [];
  const pool = getExercisePool(profile);
  const exercisesPerDay = profile.experience === 'beginner' ? 4 : 5;
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  let workoutDayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (workoutDayCount < profile.daysPerWeek) {
      const isRestBetween = profile.daysPerWeek <= 3 && workoutDayCount > 0 && i % 2 === 0;
      if (isRestBetween && workoutDayCount < profile.daysPerWeek) {
        days.push({ dayName: DAY_NAMES[i], title: 'Rest Day', exercises: [], isRestDay: true });
        continue;
      }

      let exercises = pickFrom(pool, exercisesPerDay);

      if (profile.focusTrack === 'belly_fat') {
        const coreAdd = pickFrom(CORE_EXERCISES, 2);
        exercises = [...exercises.slice(0, exercisesPerDay - 1), ...coreAdd];
      }
      if (profile.focusTrack === 'glute_gain') {
        const gluteAdd = pickFrom(GLUTE_EXERCISES, 2);
        exercises = [...exercises.slice(0, exercisesPerDay - 1), ...gluteAdd];
      }

      let title = '';
      if (profile.goal === 'fat_loss') {
        const fatTitles = ['Full Body Circuit', 'Cardio & Core', 'Fat Burn HIIT', 'Strength & Cardio', 'Active Recovery'];
        title = fatTitles[workoutDayCount % fatTitles.length];
      } else {
        const gainTitles = ['Upper Body Power', 'Lower Body Strength', 'Push Day', 'Pull Day', 'Full Body Hypertrophy'];
        title = gainTitles[workoutDayCount % gainTitles.length];
      }

      let cardio: string | undefined;
      if (profile.goal === 'fat_loss') {
        cardio = '20 min brisk walk or light jog after workout';
      } else if (profile.focusTrack === 'belly_fat') {
        cardio = '15 min moderate cardio';
      }

      days.push({ dayName: DAY_NAMES[i], title, exercises, isRestDay: false, cardio });
      workoutDayCount++;
    } else {
      days.push({ dayName: DAY_NAMES[i], title: 'Rest Day', exercises: [], isRestDay: true });
    }
  }
  return days;
}

function generateWorkouts(profile: UserProfile): WorkoutDay[] {
  if (profile.experience === 'advanced') {
    return generateAdvancedWorkouts(profile);
  }
  return generateStandardWorkouts(profile);
}

// ─── DIET TIPS ────────────────────────────────────────────────────────────────

function getDietTips(profile: UserProfile): string[] {
  const tips: string[] = [];

  if (profile.goal === 'fat_loss') {
    tips.push('Eat protein with every meal to stay full longer');
    tips.push('Drink water before meals to reduce appetite');
    tips.push('Avoid sugary drinks - switch to water or green tea');
    tips.push('Fill half your plate with vegetables');
  } else {
    tips.push('Eat every 3-4 hours to maintain calorie surplus');
    tips.push('Have a protein shake after workouts');
    tips.push('Add healthy fats like nuts and ghee to meals');
    tips.push('Eat a large breakfast with eggs and oats');
  }

  if (profile.dietPreference === 'vegetarian') {
    tips.push('Great protein sources: paneer, dal, curd, soy chunks, eggs');
  } else if (profile.dietPreference === 'vegan') {
    tips.push('Great protein sources: tofu, tempeh, lentils, chickpeas, quinoa');
  } else {
    tips.push('Great protein sources: chicken, fish, eggs, paneer, dal');
  }

  return tips;
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

export function generateInitialPlan(profile: UserProfile): WeeklyPlan {
  const calories = calculateCalories(profile);
  const protein = calculateProtein(profile);
  const workouts = generateWorkouts(profile);
  const dietTips = getDietTips(profile);

  let explanation = '';
  if (profile.goal === 'fat_loss') {
    explanation = `Your plan starts with a moderate calorie deficit of ~18%. This is aggressive enough for visible results but sustainable for the long term. You'll train ${profile.daysPerWeek} days per week with a mix of strength and cardio.`;
  } else {
    explanation = `Your plan starts with a +250 calorie surplus to build lean muscle while minimizing fat gain. You'll focus on progressive overload with compound movements across ${profile.daysPerWeek} training days.`;
  }

  if (profile.experience === 'advanced') {
    explanation += ' As an advanced lifter, each session targets 2 muscle groups with 5 exercises each for maximum volume and specificity.';
  }

  if (profile.focusTrack === 'belly_fat') {
    explanation += ' Extra core work and cardio have been added to your plan. Note: spot fat reduction is not guaranteed - overall fat loss will naturally reduce belly fat.';
  } else if (profile.focusTrack === 'glute_gain') {
    explanation += ' Extra glute-focused exercises have been added for targeted growth. Recovery is important - listen to your body.';
  }

  return {
    weekNumber: 1,
    dailyCalories: calories,
    proteinGrams: protein,
    workouts,
    dietTips,
    explanation,
    createdAt: new Date().toISOString(),
  };
}

export function adaptPlan(
  profile: UserProfile,
  currentPlan: WeeklyPlan,
  checkIn: CheckIn,
  previousCheckIns: CheckIn[],
): WeeklyPlan {
  let newCalories = currentPlan.dailyCalories;
  let explanation = '';
  const newWeek = currentPlan.weekNumber + 1;

  const previousWeight = previousCheckIns.length > 0
    ? previousCheckIns[previousCheckIns.length - 1].weightKg
    : profile.weightKg;
  const weightChange = checkIn.weightKg - previousWeight;

  if (profile.goal === 'fat_loss') {
    if (weightChange >= 0) {
      newCalories -= 150;
      explanation = `You didn't lose weight this week (${weightChange >= 0 ? '+' : ''}${weightChange.toFixed(1)}kg). Reducing daily calories by 150 to accelerate progress.`;
    } else if (weightChange < -1) {
      explanation = `Great progress! You lost ${Math.abs(weightChange).toFixed(1)}kg. Keeping your plan steady for sustainable results.`;
    } else {
      explanation = `Good pace! You lost ${Math.abs(weightChange).toFixed(1)}kg. This is a healthy, sustainable rate. Maintaining current plan.`;
    }

    if (checkIn.energyLevel === 'low') {
      explanation += ' Your energy was low, so workout volume has been slightly reduced this week.';
    }
  } else {
    if (weightChange <= 0) {
      newCalories += 200;
      explanation = `You didn't gain weight this week. Adding 200 calories to ensure muscle growth.`;
    } else if (weightChange > 0.5) {
      newCalories -= 100;
      explanation = `You gained ${weightChange.toFixed(1)}kg which is faster than ideal. Slightly reducing surplus to minimize fat gain.`;
    } else {
      explanation = `Solid progress! You gained ${weightChange.toFixed(1)}kg at a clean pace. Keeping the plan steady.`;
    }
  }

  if (checkIn.adherencePercent < 60) {
    explanation += ' Your adherence was below 60% - try to stick closer to the plan this week for better results.';
  } else if (checkIn.adherencePercent >= 90) {
    explanation += ' Excellent adherence! Your consistency is paying off.';
  }

  newCalories = Math.max(newCalories, 1200);

  const workouts = generateWorkouts(profile);

  return {
    weekNumber: newWeek,
    dailyCalories: newCalories,
    proteinGrams: currentPlan.proteinGrams,
    workouts,
    dietTips: currentPlan.dietTips,
    explanation,
    createdAt: new Date().toISOString(),
  };
}
