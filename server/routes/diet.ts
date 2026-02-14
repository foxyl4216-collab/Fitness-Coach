import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { supabase, getSupabaseClient } from "../config/supabase";
import { calculateMacros, type UserMacroInput } from "../utils/dietCalculator";
import { generateDietPlan } from "../services/dietAI";
import { adaptWeeklyDiet, type WeeklyProgress } from "../services/adaptation";

const router = Router();

router.post("/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userDb = req.supabaseClient || getSupabaseClient();

    let profile: any = null;

    const { data: userProfile } = await userDb
      .from("user_profiles")
      .select("*")
      .eq("user_id", req.userId!)
      .single();

    if (userProfile) {
      profile = userProfile;
    } else {
      const { data: adminProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", req.userId!)
        .single();
      profile = adminProfile;
    }

    if (!profile && req.body.profile) {
      const p = req.body.profile;
      profile = {
        user_id: req.userId,
        weight: p.weight || 70,
        height: p.height || 170,
        age: p.age || 25,
        goal_type: p.goalType || p.goal_type || "fat_loss",
        diet_preference: p.dietPreference || p.diet_preference || "standard",
        focus_track: p.focusTrack || p.focus_track || "general",
        experience_level: p.experienceLevel || p.experience_level || "beginner",
      };
    }

    if (!profile) {
      return res.status(404).json({ error: "User profile not found. Complete onboarding first." });
    }

    const goalType = profile.goal_type === "muscle_gain" ? "muscle_gain" : "fat_loss";

    const macroInput: UserMacroInput = {
      weight: profile.weight || 70,
      height: profile.height || 170,
      age: profile.age || 25,
      gender: "male",
      goal_type: goalType,
    };

    const macros = calculateMacros(macroInput);

    const preference = profile.diet_preference || "standard";
    const dietPlan = await generateDietPlan(macros, preference, goalType);

    const validationErrors = validateDietPlan(dietPlan, macros, macroInput.weight);
    if (validationErrors.length > 0) {
      return res.status(422).json({
        error: "Generated diet plan failed validation",
        details: validationErrors,
      });
    }

    const { data: latestPlan } = await userDb
      .from("diet_plans")
      .select("week_number")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    const nextWeek = latestPlan ? latestPlan.week_number + 1 : 1;

    const { data: existing } = await userDb
      .from("diet_plans")
      .select("id")
      .eq("user_id", req.userId!)
      .eq("week_number", nextWeek)
      .single();

    let savedPlan;
    if (existing) {
      const { data, error } = await userDb
        .from("diet_plans")
        .update({
          calorie_target: macros.calories,
          protein_target: macros.protein,
          diet_json: dietPlan,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      savedPlan = data;
    } else {
      const { data, error } = await userDb
        .from("diet_plans")
        .insert({
          user_id: req.userId!,
          week_number: nextWeek,
          calorie_target: macros.calories,
          protein_target: macros.protein,
          diet_json: dietPlan,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      savedPlan = data;
    }

    return res.status(201).json({
      message: "Diet plan generated successfully",
      week_number: nextWeek,
      macros,
      diet_plan: savedPlan,
    });
  } catch (err: any) {
    console.error("Diet generation error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate diet plan" });
  }
});

router.post("/adapt-week", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userDb = req.supabaseClient || getSupabaseClient();

    let profile: any = null;
    const { data: userProfile } = await userDb
      .from("user_profiles")
      .select("*")
      .eq("user_id", req.userId!)
      .single();
    if (userProfile) {
      profile = userProfile;
    } else {
      const { data: adminProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", req.userId!)
        .single();
      profile = adminProfile;
    }

    if (!profile && req.body.profile) {
      const p = req.body.profile;
      profile = {
        user_id: req.userId,
        weight: p.weight || 70,
        height: p.height || 170,
        age: p.age || 25,
        goal_type: p.goalType || p.goal_type || "fat_loss",
        diet_preference: p.dietPreference || p.diet_preference || "standard",
      };
    }

    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const { data: currentPlan } = await userDb
      .from("diet_plans")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    if (!currentPlan) {
      return res.status(404).json({ error: "No existing diet plan found. Generate one first." });
    }

    const { data: checkins } = await userDb
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(2);

    const currentWeight = checkins?.[0]?.weight || profile.weight || 70;
    const previousWeight = checkins?.[1]?.weight || profile.weight || 70;

    const { data: logs } = await userDb
      .from("calorie_logs")
      .select("calories")
      .eq("user_id", req.userId!);

    const caloriesConsumed = (logs || []).reduce((sum, l) => sum + (l.calories || 0), 0);

    const goalType = profile.goal_type === "muscle_gain" ? "muscle_gain" : "fat_loss";

    const progress: WeeklyProgress = {
      previous_weight: previousWeight,
      current_weight: currentWeight,
      calories_consumed: caloriesConsumed,
      calorie_target: currentPlan.calorie_target || 2000,
      goal: goalType,
    };

    const currentMacros = {
      calories: currentPlan.calorie_target || 2000,
      protein: currentPlan.protein_target || 120,
      carbs: (currentPlan.diet_json as any)?.daily_totals?.carbs || 200,
      fat: (currentPlan.diet_json as any)?.daily_totals?.fat || 60,
    };

    const adaptation = adaptWeeklyDiet(currentMacros, progress);

    const preference = profile.diet_preference || "standard";
    const newDietPlan = await generateDietPlan(adaptation.adjusted_macros, preference, goalType);

    const validationErrors = validateDietPlan(newDietPlan, adaptation.adjusted_macros, currentWeight);
    if (validationErrors.length > 0) {
      return res.status(422).json({
        error: "Adapted diet plan failed validation",
        details: validationErrors,
      });
    }

    const newWeek = currentPlan.week_number + 1;

    const { data: savedPlan, error } = await userDb
      .from("diet_plans")
      .insert({
        user_id: req.userId!,
        week_number: newWeek,
        calorie_target: adaptation.adjusted_macros.calories,
        protein_target: adaptation.adjusted_macros.protein,
        diet_json: newDietPlan,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      message: "Diet plan adapted successfully",
      week_number: newWeek,
      adaptation: {
        reason: adaptation.adjustment_reason,
        calorie_change: adaptation.calorie_change,
        weight_change: progress.current_weight - progress.previous_weight,
      },
      macros: adaptation.adjusted_macros,
      diet_plan: savedPlan,
    });
  } catch (err: any) {
    console.error("Diet adaptation error:", err);
    return res.status(500).json({ error: err.message || "Failed to adapt diet plan" });
  }
});

router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { week_number, calorie_target, protein_target, diet_json } = req.body;

    if (!week_number || typeof week_number !== "number" || week_number < 1) {
      return res.status(400).json({ error: "week_number must be an integer >= 1" });
    }

    if (calorie_target !== undefined && (typeof calorie_target !== "number" || calorie_target < 0)) {
      return res.status(400).json({ error: "calorie_target must be a non-negative number" });
    }

    if (protein_target !== undefined && (typeof protein_target !== "number" || protein_target < 0)) {
      return res.status(400).json({ error: "protein_target must be a non-negative number" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data: existing } = await db
      .from("diet_plans")
      .select("id")
      .eq("user_id", req.userId!)
      .eq("week_number", week_number)
      .single();

    if (existing) {
      const { data, error } = await db
        .from("diet_plans")
        .update({
          calorie_target,
          protein_target,
          diet_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Diet plan updated", diet_plan: data });
    }

    const { data, error } = await db
      .from("diet_plans")
      .insert({
        user_id: req.userId!,
        week_number,
        calorie_target,
        protein_target,
        diet_json,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Diet plan created", diet_plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/current", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("diet_plans")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "No diet plan found" });
    }

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ diet_plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

function validateDietPlan(
  plan: any,
  targetMacros: { calories: number; protein: number },
  userWeight: number
): string[] {
  const errors: string[] = [];

  if (!plan.meals || !Array.isArray(plan.meals) || plan.meals.length === 0) {
    errors.push("Diet plan must contain meals");
    return errors;
  }

  const totalCalories = plan.meals.reduce(
    (sum: number, meal: any) => sum + (meal.total_calories || 0),
    0
  );

  if (totalCalories < 0) {
    errors.push("Total calories cannot be negative");
  }

  const minCalories = Math.round(targetMacros.calories * 0.9);
  const maxCalories = Math.round(targetMacros.calories * 1.1);
  if (totalCalories < minCalories || totalCalories > maxCalories) {
    errors.push(
      `Total calories (${totalCalories}) must be within 10% of target (${minCalories}-${maxCalories})`
    );
  }

  const totalProtein = plan.meals.reduce(
    (sum: number, meal: any) => sum + (meal.total_protein || 0),
    0
  );

  const minProtein = userWeight * 1.5;
  if (totalProtein < minProtein) {
    errors.push(
      `Total protein (${totalProtein}g) must be at least 1.5g/kg body weight (${Math.round(minProtein)}g)`
    );
  }

  for (const meal of plan.meals) {
    if (!meal.foods || !Array.isArray(meal.foods) || meal.foods.length === 0) {
      errors.push(`Meal "${meal.meal}" must contain food items`);
    }
  }

  return errors;
}

export default router;
