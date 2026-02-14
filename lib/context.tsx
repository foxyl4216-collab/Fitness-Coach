import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import * as Storage from './storage';
import { generateInitialPlan, adaptPlan } from './fitness-engine';
import { useAuth } from './auth-context';
import { apiRequest } from './query-client';

interface FitCoachContextValue {
  profile: Storage.UserProfile | null;
  plan: Storage.WeeklyPlan | null;
  dietPlan: Storage.DietPlan | null;
  checkIns: Storage.CheckIn[];
  foodLog: Storage.FoodEntry[];
  savedFoods: Storage.SavedFood[];
  isOnboarded: boolean;
  isLoading: boolean;
  weekNumber: number;
  dietLoading: boolean;
  setOnboarded: (profile: Storage.UserProfile) => Promise<void>;
  addFoodEntry: (entry: Omit<Storage.FoodEntry, 'id' | 'timestamp'>) => Promise<void>;
  removeFoodEntry: (id: string) => Promise<void>;
  saveFavoriteFood: (food: Storage.SavedFood) => Promise<void>;
  submitCheckIn: (checkIn: Omit<Storage.CheckIn, 'date'>) => Promise<void>;
  generateDietPlan: () => Promise<void>;
  resetApp: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const FitCoachContext = createContext<FitCoachContextValue | null>(null);

export function FitCoachProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken, logout } = useAuth();
  const [profile, setProfile] = useState<Storage.UserProfile | null>(null);
  const [plan, setPlan] = useState<Storage.WeeklyPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<Storage.DietPlan | null>(null);
  const [checkIns, setCheckIns] = useState<Storage.CheckIn[]>([]);
  const [foodLog, setFoodLog] = useState<Storage.FoodEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<Storage.SavedFood[]>([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weekNumber, setWeekNumber] = useState(1);
  const [dietLoading, setDietLoading] = useState(false);

  const loadData = async () => {
    try {
      const [onboarded, prof, pl, dp, checks, foods, saved, week] = await Promise.all([
        Storage.isOnboarded(),
        Storage.getProfile(),
        Storage.getPlan(),
        Storage.getDietPlan(),
        Storage.getCheckIns(),
        Storage.getFoodLog(),
        Storage.getSavedFoods(),
        Storage.getWeekNumber(),
      ]);
      setIsOnboarded(onboarded);
      setProfile(prof);
      setPlan(pl);
      setDietPlan(dp);
      setCheckIns(checks);
      setFoodLog(foods);
      setSavedFoods(saved);
      setWeekNumber(week);

      if (isAuthenticated && !onboarded) {
        try {
          const res = await apiRequest('GET', '/api/profile');
          const data = await res.json();
          if (data.profile) {
            const backendProfile: Storage.UserProfile = {
              goal: data.profile.goal_type?.includes('muscle') ? 'muscle_gain' : 'fat_loss',
              focusTrack: data.profile.focus_track || 'none',
              age: data.profile.age || 25,
              heightCm: data.profile.height || 170,
              weightKg: data.profile.weight || 70,
              gender: 'male',
              experience: data.profile.experience_level || 'beginner',
              dietPreference: data.profile.diet_preference || 'anything',
              equipment: data.profile.equipment_access || 'basic',
              daysPerWeek: data.profile.weekly_availability || 4,
              injuries: '',
            };
            await Storage.saveProfile(backendProfile);
            setProfile(backendProfile);

            const planRes = await apiRequest('GET', '/api/weekly-plan/current');
            const planData = await planRes.json();
            if (planData.plan) {
              const backendPlan: Storage.WeeklyPlan = {
                weekNumber: planData.plan.week_number,
                dailyCalories: planData.plan.calorie_target || 2000,
                proteinGrams: planData.plan.workout_json?.proteinGrams || 120,
                workouts: planData.plan.workout_json?.workouts || [],
                dietTips: planData.plan.workout_json?.dietTips || [],
                explanation: planData.plan.workout_json?.explanation || '',
                createdAt: planData.plan.created_at,
              };
              await Storage.savePlan(backendPlan);
              setPlan(backendPlan);
              setWeekNumber(backendPlan.weekNumber);
              setIsOnboarded(true);
            }
          }
        } catch {
        }
      }

      if (isAuthenticated) {
        try {
          const dietRes = await apiRequest('GET', '/api/diet-plan/current');
          const dietData = await dietRes.json();
          if (dietData.diet_plan) {
            const backendDiet: Storage.DietPlan = {
              id: dietData.diet_plan.id,
              weekNumber: dietData.diet_plan.week_number,
              calorieTarget: dietData.diet_plan.calorie_target,
              proteinTarget: dietData.diet_plan.protein_target,
              meals: dietData.diet_plan.diet_json?.meals || [],
              dailyTotals: dietData.diet_plan.diet_json?.daily_totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
              notes: dietData.diet_plan.diet_json?.notes || [],
              createdAt: dietData.diet_plan.created_at,
            };
            await Storage.saveDietPlan(backendDiet);
            setDietPlan(backendDiet);
          }
        } catch {
        }
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const syncProfileToBackend = async (prof: Storage.UserProfile) => {
    if (!isAuthenticated) return;
    try {
      const goalMap: Record<string, string> = {
        fat_loss: 'fat_loss',
        muscle_gain: 'muscle_gain',
      };
      await apiRequest('POST', '/api/profile/create', {
        age: prof.age,
        height: prof.heightCm,
        weight: prof.weightKg,
        goal_type: goalMap[prof.goal] || 'fat_loss',
        focus_track: prof.focusTrack,
        experience_level: prof.experience,
        diet_preference: prof.dietPreference === 'anything' ? 'standard' : prof.dietPreference,
        equipment_access: prof.equipment === 'basic' ? 'minimal' : prof.equipment,
        weekly_availability: prof.daysPerWeek,
      });
    } catch (e) {
      console.warn('Failed to sync profile to backend:', e);
    }
  };

  const syncPlanToBackend = async (pl: Storage.WeeklyPlan) => {
    if (!isAuthenticated) return;
    try {
      await apiRequest('POST', '/api/weekly-plan', {
        week_number: pl.weekNumber,
        calorie_target: pl.dailyCalories,
        workout_json: {
          proteinGrams: pl.proteinGrams,
          workouts: pl.workouts,
          dietTips: pl.dietTips,
          explanation: pl.explanation,
        },
      });
    } catch (e) {
      console.warn('Failed to sync plan to backend:', e);
    }
  };

  const handleOnboarded = async (newProfile: Storage.UserProfile) => {
    await Storage.saveProfile(newProfile);
    const initialPlan = generateInitialPlan(newProfile);
    await Storage.savePlan(initialPlan);
    setProfile(newProfile);
    setPlan(initialPlan);
    setIsOnboarded(true);
    setWeekNumber(1);

    await syncProfileToBackend(newProfile);
    await syncPlanToBackend(initialPlan);
  };

  const addFoodEntry = async (entry: Omit<Storage.FoodEntry, 'id' | 'timestamp'>) => {
    const fullEntry: Storage.FoodEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    await Storage.saveFoodEntry(fullEntry);
    setFoodLog(prev => [...prev, fullEntry]);

    if (isAuthenticated) {
      try {
        await apiRequest('POST', '/api/calorie-log', {
          date: entry.date,
          food_name: entry.name,
          calories: entry.calories,
          source: 'manual',
        });
      } catch (e) {
        console.warn('Failed to sync food entry to backend:', e);
      }
    }
  };

  const removeFoodEntry = async (id: string) => {
    await Storage.deleteFoodEntry(id);
    setFoodLog(prev => prev.filter(e => e.id !== id));

    if (isAuthenticated) {
      try {
        await apiRequest('DELETE', `/api/calorie-log/${id}`);
      } catch {
      }
    }
  };

  const saveFavoriteFood = async (food: Storage.SavedFood) => {
    await Storage.addSavedFood(food);
    setSavedFoods(prev => {
      if (prev.some(f => f.name.toLowerCase() === food.name.toLowerCase())) return prev;
      return [...prev, food];
    });
  };

  const submitCheckIn = async (checkIn: Omit<Storage.CheckIn, 'date'>) => {
    const fullCheckIn: Storage.CheckIn = {
      ...checkIn,
      date: new Date().toISOString(),
    };
    await Storage.saveCheckIn(fullCheckIn);

    if (profile && plan) {
      const newPlan = adaptPlan(profile, plan, fullCheckIn, checkIns);
      await Storage.savePlan(newPlan);
      setPlan(newPlan);
      setWeekNumber(newPlan.weekNumber);

      syncPlanToBackend(newPlan);
    }
    setCheckIns(prev => [...prev, fullCheckIn]);

    if (isAuthenticated) {
      try {
        await apiRequest('POST', '/api/weekly-checkin', {
          week_number: checkIn.weekNumber,
          weight: checkIn.weightKg,
          adherence_percent: checkIn.adherencePercent,
          energy_level: checkIn.energyLevel === 'normal' ? 'moderate' : checkIn.energyLevel,
          waist_measurement: checkIn.waistCm,
        });
      } catch (e) {
        console.warn('Failed to sync check-in to backend:', e);
      }
    }
  };

  const handleGenerateDietPlan = async () => {
    if (!isAuthenticated) return;
    setDietLoading(true);
    try {
      const res = await apiRequest('POST', '/api/diet-plan/generate');
      const data = await res.json();
      if (data.diet_plan) {
        const newDiet: Storage.DietPlan = {
          id: data.diet_plan.id,
          weekNumber: data.diet_plan.week_number,
          calorieTarget: data.macros?.calories || data.diet_plan.calorie_target,
          proteinTarget: data.macros?.protein || data.diet_plan.protein_target,
          meals: data.diet_plan.diet_json?.meals || [],
          dailyTotals: data.diet_plan.diet_json?.daily_totals || data.macros || { calories: 0, protein: 0, carbs: 0, fat: 0 },
          notes: data.diet_plan.diet_json?.notes || [],
          createdAt: data.diet_plan.created_at,
        };
        await Storage.saveDietPlan(newDiet);
        setDietPlan(newDiet);
      }
    } catch (e: any) {
      console.error('Failed to generate diet plan:', e);
      throw e;
    } finally {
      setDietLoading(false);
    }
  };

  const resetApp = async () => {
    await Storage.clearAllData();
    setProfile(null);
    setPlan(null);
    setDietPlan(null);
    setCheckIns([]);
    setFoodLog([]);
    setSavedFoods([]);
    setIsOnboarded(false);
    setWeekNumber(1);
  };

  const refreshData = loadData;

  const value = useMemo(() => ({
    profile,
    plan,
    dietPlan,
    checkIns,
    foodLog,
    savedFoods,
    isOnboarded,
    isLoading,
    weekNumber,
    dietLoading,
    setOnboarded: handleOnboarded,
    addFoodEntry,
    removeFoodEntry,
    saveFavoriteFood,
    submitCheckIn,
    generateDietPlan: handleGenerateDietPlan,
    resetApp,
    refreshData,
  }), [profile, plan, dietPlan, checkIns, foodLog, savedFoods, isOnboarded, isLoading, weekNumber, dietLoading, isAuthenticated]);

  return (
    <FitCoachContext.Provider value={value}>
      {children}
    </FitCoachContext.Provider>
  );
}

export function useFitCoach() {
  const ctx = useContext(FitCoachContext);
  if (!ctx) throw new Error('useFitCoach must be used within FitCoachProvider');
  return ctx;
}
