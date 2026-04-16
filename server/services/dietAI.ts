import { createAIResponse } from "./openRouter";
import type { MacroTargets } from "../utils/dietCalculator";

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

/**
 * Generate a personalized diet plan via OpenRouter GPT.
 * createAIResponse("Give diet plan", "gpt")
 */
export async function generateDietPlan(
  macros: MacroTargets,
  preference: string,
  goal: string,
  cuisine?: string
): Promise<GeneratedDietPlan> {
  const cuisineKey = cuisine && CUISINE_HINTS[cuisine] ? cuisine : "indian";
  const cuisineHint = CUISINE_HINTS[cuisineKey];

  const prompt = `Daily meal plan: ${macros.calories}kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fat}g fat. Diet: ${preference}. Goal: ${goal}. ${cuisineHint} 4 meals. JSON: {"meals":[{"meal":"Name","time":"8am","foods":[{"name":"Food","qty":"1","cals":100,"prot":10}],"total_cals":100,"total_prot":10}],"daily_totals":{"calories":${macros.calories},"protein":${macros.protein},"carbs":${macros.carbs},"fat":${macros.fat}},"notes":[]}`;

  try {
    const content = await createAIResponse(prompt, "gpt", {
      systemPrompt: "Nutritionist. JSON only.",
      jsonMode: true,
      maxTokens: 1200,
      temperature: 0.5,
    });

    const raw = JSON.parse(content);
    const meals = (raw.meals || []).map((m: any) => ({
      meal: m.meal,
      time: m.time,
      foods: (m.foods || []).map((f: any) => ({
        name: f.name,
        quantity: f.qty || f.quantity,
        calories: f.cals || f.calories,
        protein: f.prot || f.protein,
      })),
      total_calories: m.total_cals || m.total_calories,
      total_protein: m.total_prot || m.total_protein,
    }));

    const parsed: GeneratedDietPlan = {
      meals,
      daily_totals: raw.daily_totals || {
        calories: meals.reduce((s: number, m: any) => s + (m.total_calories || 0), 0),
        protein: meals.reduce((s: number, m: any) => s + (m.total_protein || 0), 0),
        carbs: macros.carbs,
        fat: macros.fat,
      },
      notes: raw.notes || [],
    };

    if (parsed.meals.length === 0) throw new Error("AI response missing meals");
    return parsed;
  } catch (err: any) {
    console.error("[dietAI] Diet generation failed:", err.message);
    throw new Error(`Failed to generate diet plan: ${err.message}`);
  }
}
