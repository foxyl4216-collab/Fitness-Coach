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
  const prompt = `You are a certified nutritionist creating a personalized daily meal plan.

Target macros:
- Calories: ${macros.calories} kcal
- Protein: ${macros.protein}g
- Carbs: ${macros.carbs}g
- Fat: ${macros.fat}g

Diet preference: ${preference || "standard"}
Fitness goal: ${goal === "fat_loss" ? "Fat Loss" : "Muscle Gain"}

Generate a realistic Indian meal plan with 5-6 meals (breakfast, mid-morning snack, lunch, evening snack, dinner, optional bedtime snack).

Use common Indian foods like dal, roti, rice, paneer, chicken, eggs, curd, fruits, oats, etc.
Keep portion sizes practical and realistic.
The total daily calories MUST be within 10% of the target (${Math.round(macros.calories * 0.9)}-${Math.round(macros.calories * 1.1)} kcal).
Protein total MUST be at least ${Math.round(macros.protein * 0.9)}g.

Return ONLY valid JSON in this exact format:
{
  "meals": [
    {
      "meal": "Breakfast",
      "time": "8:00 AM",
      "foods": [
        { "name": "Oats with milk", "quantity": "1 bowl (200g)", "calories": 250, "protein": 10 }
      ],
      "total_calories": 250,
      "total_protein": 10
    }
  ],
  "daily_totals": {
    "calories": ${macros.calories},
    "protein": ${macros.protein},
    "carbs": ${macros.carbs},
    "fat": ${macros.fat}
  },
  "notes": ["Drink 3-4 liters of water daily"]
}`;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: "You are a nutrition expert. Return ONLY valid JSON, no markdown, no extra text.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI");

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
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Failed to generate diet plan after ${maxRetries} attempts: ${lastError?.message}`);
}
