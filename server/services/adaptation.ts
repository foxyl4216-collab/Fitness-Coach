import type { MacroTargets } from "../utils/dietCalculator";

export interface WeeklyProgress {
  previous_weight: number;
  current_weight: number;
  calories_consumed: number;
  calorie_target: number;
  goal: "fat_loss" | "muscle_gain";
}

export interface AdaptationResult {
  adjusted_macros: MacroTargets;
  adjustment_reason: string;
  calorie_change: number;
}

export function adaptWeeklyDiet(
  currentMacros: MacroTargets,
  progress: WeeklyProgress
): AdaptationResult {
  const weightChange = progress.current_weight - progress.previous_weight;
  const { goal } = progress;

  let newCalories = currentMacros.calories;
  let reason = "No adjustment needed";
  let calorieChange = 0;

  if (goal === "fat_loss") {
    if (weightChange >= 0) {
      const reduction = Math.round(currentMacros.calories * 0.05);
      newCalories = currentMacros.calories - reduction;
      calorieChange = -reduction;
      reason = "Weight not dropping — reduced calories by 5%";
    } else if (weightChange < -1.0) {
      const increase = Math.round(currentMacros.calories * 0.05);
      newCalories = currentMacros.calories + increase;
      calorieChange = increase;
      reason = "Weight dropping too fast — increased calories by 5%";
    } else {
      reason = "Healthy fat loss rate maintained";
    }
  } else {
    if (weightChange <= 0) {
      newCalories = currentMacros.calories + 150;
      calorieChange = 150;
      reason = "No weight gain — added 150 calories";
    } else if (weightChange > 0.75) {
      newCalories = currentMacros.calories - 100;
      calorieChange = -100;
      reason = "Gaining too fast — reduced 100 calories";
    } else {
      reason = "Healthy muscle gain rate maintained";
    }
  }

  const weight = progress.current_weight;
  const protein =
    goal === "fat_loss"
      ? Math.round(weight * 2.0)
      : Math.round(weight * 2.2);
  const fat =
    goal === "fat_loss"
      ? Math.round(weight * 0.8)
      : Math.round(weight * 1.0);

  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const remainingCals = Math.max(0, newCalories - proteinCals - fatCals);
  const carbs = Math.round(remainingCals / 4);

  return {
    adjusted_macros: {
      calories: newCalories,
      protein,
      carbs,
      fat,
    },
    adjustment_reason: reason,
    calorie_change: calorieChange,
  };
}
