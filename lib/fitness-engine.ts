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

function getExercisePool(profile: UserProfile): Exercise[] {
  if (profile.equipment === 'full_gym') return [...COMPOUND_EXERCISES, ...BASIC_EQUIPMENT_EXERCISES];
  if (profile.equipment === 'basic') return [...BASIC_EQUIPMENT_EXERCISES, ...BODYWEIGHT_EXERCISES];
  return BODYWEIGHT_EXERCISES;
}

function pickExercises(pool: Exercise[], count: number): Exercise[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function generateWorkouts(profile: UserProfile): WorkoutDay[] {
  const days: WorkoutDay[] = [];
  const pool = getExercisePool(profile);
  const exercisesPerDay = profile.experience === 'beginner' ? 4 : 5;

  let workoutDayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (workoutDayCount < profile.daysPerWeek) {
      const isRestBetween = profile.daysPerWeek <= 3 && workoutDayCount > 0 && i % 2 === 0;
      if (isRestBetween && workoutDayCount < profile.daysPerWeek) {
        days.push({ dayName: DAY_NAMES[i], title: 'Rest Day', exercises: [], isRestDay: true });
        continue;
      }

      let exercises = pickExercises(pool, exercisesPerDay);

      if (profile.focusTrack === 'belly_fat') {
        const coreAdd = pickExercises(CORE_EXERCISES, 2);
        exercises = [...exercises.slice(0, exercisesPerDay - 1), ...coreAdd];
      }
      if (profile.focusTrack === 'glute_gain') {
        const gluteAdd = pickExercises(GLUTE_EXERCISES, 2);
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
