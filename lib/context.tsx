import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import * as Storage from './storage';
import { generateInitialPlan, adaptPlan } from './fitness-engine';

interface FitCoachContextValue {
  profile: Storage.UserProfile | null;
  plan: Storage.WeeklyPlan | null;
  checkIns: Storage.CheckIn[];
  foodLog: Storage.FoodEntry[];
  savedFoods: Storage.SavedFood[];
  isOnboarded: boolean;
  isLoading: boolean;
  weekNumber: number;
  setOnboarded: (profile: Storage.UserProfile) => Promise<void>;
  addFoodEntry: (entry: Omit<Storage.FoodEntry, 'id' | 'timestamp'>) => Promise<void>;
  removeFoodEntry: (id: string) => Promise<void>;
  saveFavoriteFood: (food: Storage.SavedFood) => Promise<void>;
  submitCheckIn: (checkIn: Omit<Storage.CheckIn, 'date'>) => Promise<void>;
  resetApp: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const FitCoachContext = createContext<FitCoachContextValue | null>(null);

export function FitCoachProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Storage.UserProfile | null>(null);
  const [plan, setPlan] = useState<Storage.WeeklyPlan | null>(null);
  const [checkIns, setCheckIns] = useState<Storage.CheckIn[]>([]);
  const [foodLog, setFoodLog] = useState<Storage.FoodEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<Storage.SavedFood[]>([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weekNumber, setWeekNumber] = useState(1);

  const loadData = async () => {
    try {
      const [onboarded, prof, pl, checks, foods, saved, week] = await Promise.all([
        Storage.isOnboarded(),
        Storage.getProfile(),
        Storage.getPlan(),
        Storage.getCheckIns(),
        Storage.getFoodLog(),
        Storage.getSavedFoods(),
        Storage.getWeekNumber(),
      ]);
      setIsOnboarded(onboarded);
      setProfile(prof);
      setPlan(pl);
      setCheckIns(checks);
      setFoodLog(foods);
      setSavedFoods(saved);
      setWeekNumber(week);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOnboarded = async (newProfile: Storage.UserProfile) => {
    await Storage.saveProfile(newProfile);
    const initialPlan = generateInitialPlan(newProfile);
    await Storage.savePlan(initialPlan);
    setProfile(newProfile);
    setPlan(initialPlan);
    setIsOnboarded(true);
    setWeekNumber(1);
  };

  const addFoodEntry = async (entry: Omit<Storage.FoodEntry, 'id' | 'timestamp'>) => {
    const fullEntry: Storage.FoodEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    await Storage.saveFoodEntry(fullEntry);
    setFoodLog(prev => [...prev, fullEntry]);
  };

  const removeFoodEntry = async (id: string) => {
    await Storage.deleteFoodEntry(id);
    setFoodLog(prev => prev.filter(e => e.id !== id));
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
    }
    setCheckIns(prev => [...prev, fullCheckIn]);
  };

  const resetApp = async () => {
    await Storage.clearAllData();
    setProfile(null);
    setPlan(null);
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
    checkIns,
    foodLog,
    savedFoods,
    isOnboarded,
    isLoading,
    weekNumber,
    setOnboarded: handleOnboarded,
    addFoodEntry,
    removeFoodEntry,
    saveFavoriteFood,
    submitCheckIn,
    resetApp,
    refreshData,
  }), [profile, plan, checkIns, foodLog, savedFoods, isOnboarded, isLoading, weekNumber]);

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
