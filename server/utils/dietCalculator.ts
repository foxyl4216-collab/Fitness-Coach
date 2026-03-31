export interface UserMacroInput {
  weight: number;
  height: number;
  age: number;
  gender: string;
  goal_type: "fat_loss" | "muscle_gain" | "reduce_belly_fat" | "glute_growth";
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function calculateMacros(profile: UserMacroInput): MacroTargets {
  const { weight, goal_type } = profile;

  const maintenance = weight * 30;

  let calories: number;
  let protein: number;
  let fat: number;

  const isFatLoss = goal_type === "fat_loss" || goal_type === "reduce_belly_fat";

  if (isFatLoss) {
    calories = Math.round(maintenance * 0.8);
    protein = Math.round(weight * 2.0);
    fat = Math.round(weight * 0.8);
  } else {
    calories = Math.round(maintenance + 250);
    protein = Math.round(weight * 2.2);
    fat = Math.round(weight * 1.0);
  }

  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const remainingCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbs = Math.round(remainingCalories / 4);

  return { calories, protein, carbs, fat };
}
