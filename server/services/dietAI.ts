import OpenAI from "openai";
import type { MacroTargets } from "../utils/dietCalculator";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface DietPlanMeal {
  meal: string;
  time: string;
  foods: { name: string; quantity: string; calories: number; protein: number }[];
  total_calories: number;
  total_protein: number;
}

export interface GeneratedDietPlan {
  meals: DietPlanMeal[];
  daily_totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes: string[];
}

export async function generateDietPlan(
  macros: MacroTargets,
  preference: string,
  goal: string
): Promise<GeneratedDietPlan> {
  const prompt = `Create an Indian daily meal plan. Target: ${macros.calories}kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fat}g fat. Diet: ${preference || "standard"}. Goal: ${goal === "fat_loss" ? "Fat Loss" : "Muscle Gain"}. Include 5 meals using common Indian foods (dal, roti, rice, paneer, chicken, eggs, curd, oats). Return JSON: {"meals":[{"meal":"Name","time":"8:00 AM","foods":[{"name":"Food","quantity":"1 bowl","calories":250,"protein":10}],"total_calories":250,"total_protein":10}],"daily_totals":{"calories":${macros.calories},"protein":${macros.protein},"carbs":${macros.carbs},"fat":${macros.fat}},"notes":["tip1"]}`;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are a nutritionist. Return ONLY valid JSON, no markdown.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      const finishReason = response.choices[0]?.finish_reason;

      if (!content || content.trim().length === 0) {
        throw new Error(`Empty response from AI (finish_reason: ${finishReason})`);
      }

      const parsed = JSON.parse(content) as GeneratedDietPlan;

      if (!parsed.meals || !Array.isArray(parsed.meals) || parsed.meals.length === 0) {
        throw new Error("AI response missing meals array");
      }

      if (!parsed.daily_totals) {
        const totalCals = parsed.meals.reduce((s, m) => s + (m.total_calories || 0), 0);
        const totalProt = parsed.meals.reduce((s, m) => s + (m.total_protein || 0), 0);
        parsed.daily_totals = {
          calories: totalCals,
          protein: totalProt,
          carbs: macros.carbs,
          fat: macros.fat,
        };
      }

      return parsed;
    } catch (err: any) {
      console.error(`Diet AI attempt ${attempt + 1} failed:`, err.message);
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Failed to generate diet plan after ${maxRetries} attempts: ${lastError?.message}`);
}
