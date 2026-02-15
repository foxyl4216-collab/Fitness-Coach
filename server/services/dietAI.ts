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

const CUISINE_HINTS: Record<string, string> = {
  indian: "Use common Indian foods (dal, roti, rice, paneer, chicken curry, eggs, curd, idli, dosa, oats, chapati, sabzi).",
  american: "Use common American foods (grilled chicken, eggs, oatmeal, salad, turkey, brown rice, sweet potato, Greek yogurt, berries, nuts, steak, salmon).",
  mediterranean: "Use Mediterranean foods (hummus, falafel, grilled fish, olive oil, whole grain pita, quinoa, Greek salad, lentil soup, tzatziki, feta cheese).",
  asian: "Use common Asian foods (stir-fried tofu, rice, miso soup, edamame, steamed fish, noodles, bok choy, teriyaki chicken, sushi bowls, kimchi).",
  mexican: "Use common Mexican foods (beans, rice, grilled chicken, avocado, tortillas, salsa, enchiladas, burrito bowls, corn, pico de gallo).",
  global: "Use a diverse mix of global foods from various cuisines. Include dishes from different cultures for variety.",
};

export async function generateDietPlan(
  macros: MacroTargets,
  preference: string,
  goal: string,
  cuisine?: string
): Promise<GeneratedDietPlan> {
  const cuisineKey = cuisine && CUISINE_HINTS[cuisine] ? cuisine : "indian";
  const cuisineHint = CUISINE_HINTS[cuisineKey];

  const prompt = `Create a daily meal plan. Target: ${macros.calories}kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fat}g fat. Diet: ${preference || "standard"}. Goal: ${goal === "fat_loss" ? "Fat Loss" : "Muscle Gain"}. ${cuisineHint} Include 5 meals. Return JSON: {"meals":[{"meal":"Name","time":"8:00 AM","foods":[{"name":"Food","quantity":"1 bowl","calories":250,"protein":10}],"total_calories":250,"total_protein":10}],"daily_totals":{"calories":${macros.calories},"protein":${macros.protein},"carbs":${macros.carbs},"fat":${macros.fat}},"notes":["tip1"]}`;

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
