import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROFILE: 'fitcoach_profile',
  CURRENT_PLAN: 'fitcoach_current_plan',
  DIET_PLAN: 'fitcoach_diet_plan',
  CHECKINS: 'fitcoach_checkins',
  FOOD_LOG: 'fitcoach_food_log',
  SAVED_FOODS: 'fitcoach_saved_foods',
  ONBOARDED: 'fitcoach_onboarded',
  WEEK_NUMBER: 'fitcoach_week_number',
};

export interface UserProfile {
  goal: 'fat_loss' | 'muscle_gain';
  focusTrack: 'none' | 'belly_fat' | 'glute_gain';
  age: number;
  heightCm: number;
  weightKg: number;
  gender: 'male' | 'female';
  experience: 'beginner' | 'some' | 'experienced';
  dietPreference: 'anything' | 'vegetarian' | 'vegan';
  cuisine: 'indian' | 'american' | 'mediterranean' | 'asian' | 'mexican' | 'global';
  equipment: 'none' | 'basic' | 'full_gym';
  daysPerWeek: number;
  injuries: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

export interface WorkoutDay {
  dayName: string;
  title: string;
  exercises: Exercise[];
  isRestDay: boolean;
  cardio?: string;
}

export interface WeeklyPlan {
  weekNumber: number;
  dailyCalories: number;
  proteinGrams: number;
  workouts: WorkoutDay[];
  dietTips: string[];
  explanation: string;
  createdAt: string;
}

export interface CheckIn {
  weekNumber: number;
  weightKg: number;
  adherencePercent: number;
  energyLevel: 'low' | 'normal' | 'high';
  waistCm?: number;
  date: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  date: string;
  timestamp: number;
  source?: string;
}

export interface SavedFood {
  name: string;
  calories: number;
  protein?: number;
}

export interface DietPlanFood {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
}

export interface DietPlanMeal {
  meal: string;
  time: string;
  foods: DietPlanFood[];
  total_calories: number;
  total_protein: number;
}

export interface DietPlan {
  id?: string;
  weekNumber: number;
  calorieTarget: number;
  proteinTarget: number;
  meals: DietPlanMeal[];
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes: string[];
  createdAt?: string;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
}

export async function getProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(KEYS.PROFILE);
  return data ? JSON.parse(data) : null;
}

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return val === 'true';
}

export async function savePlan(plan: WeeklyPlan): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_PLAN, JSON.stringify(plan));
  await AsyncStorage.setItem(KEYS.WEEK_NUMBER, String(plan.weekNumber));
}

export async function getPlan(): Promise<WeeklyPlan | null> {
  const data = await AsyncStorage.getItem(KEYS.CURRENT_PLAN);
  return data ? JSON.parse(data) : null;
}

export async function getWeekNumber(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.WEEK_NUMBER);
  return val ? parseInt(val, 10) : 1;
}

export async function saveCheckIn(checkIn: CheckIn): Promise<void> {
  const existing = await getCheckIns();
  existing.push(checkIn);
  await AsyncStorage.setItem(KEYS.CHECKINS, JSON.stringify(existing));
}

export async function getCheckIns(): Promise<CheckIn[]> {
  const data = await AsyncStorage.getItem(KEYS.CHECKINS);
  return data ? JSON.parse(data) : [];
}

export async function saveFoodEntry(entry: FoodEntry): Promise<void> {
  const existing = await getFoodLog();
  existing.push(entry);
  await AsyncStorage.setItem(KEYS.FOOD_LOG, JSON.stringify(existing));
}

export async function getFoodLog(): Promise<FoodEntry[]> {
  const data = await AsyncStorage.getItem(KEYS.FOOD_LOG);
  return data ? JSON.parse(data) : [];
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const existing = await getFoodLog();
  const filtered = existing.filter(e => e.id !== id);
  await AsyncStorage.setItem(KEYS.FOOD_LOG, JSON.stringify(filtered));
}

export async function getSavedFoods(): Promise<SavedFood[]> {
  const data = await AsyncStorage.getItem(KEYS.SAVED_FOODS);
  return data ? JSON.parse(data) : [];
}

export async function addSavedFood(food: SavedFood): Promise<void> {
  const existing = await getSavedFoods();
  const alreadyExists = existing.some(f => f.name.toLowerCase() === food.name.toLowerCase());
  if (!alreadyExists) {
    existing.push(food);
    await AsyncStorage.setItem(KEYS.SAVED_FOODS, JSON.stringify(existing));
  }
}

export async function saveDietPlan(plan: DietPlan): Promise<void> {
  await AsyncStorage.setItem(KEYS.DIET_PLAN, JSON.stringify(plan));
}

export async function getDietPlan(): Promise<DietPlan | null> {
  const data = await AsyncStorage.getItem(KEYS.DIET_PLAN);
  return data ? JSON.parse(data) : null;
}

export async function clearAllData(): Promise<void> {
  await Promise.all(Object.values(KEYS).map(k => AsyncStorage.removeItem(k)));
}
