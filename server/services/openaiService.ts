import OpenAI from "openai";
import { logAICall } from "../utils/aiLogger";
import type { MacroTargets } from "../utils/dietCalculator";
import type { GeneratedDietPlan } from "./dietAI";
import { generateDietPlan as generateDietPlanReplit } from "./dietAI";

const CUISINE_HINTS: Record<string, string> = {
  indian: "Use common Indian foods (dal, roti, rice, paneer, chicken curry, eggs, curd, idli, dosa, oats, chapati, sabzi).",
  american: "Use common American foods (grilled chicken, eggs, oatmeal, salad, turkey, brown rice, sweet potato, Greek yogurt, berries, nuts, steak, salmon).",
  mediterranean: "Use Mediterranean foods (hummus, falafel, grilled fish, olive oil, whole grain pita, quinoa, Greek salad, lentil soup, tzatziki, feta cheese).",
  asian: "Use common Asian foods (stir-fried tofu, rice, miso soup, edamame, steamed fish, noodles, bok choy, teriyaki chicken, sushi bowls, kimchi).",
  mexican: "Use common Mexican foods (beans, rice, grilled chicken, avocado, tortillas, salsa, enchiladas, burrito bowls, corn, pico de gallo).",
  global: "Use a diverse mix of global foods from various cuisines.",
};

function getUserOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

async function callOpenAIWithRetry(
  client: OpenAI,
  params: Parameters<OpenAI["chat"]["completions"]["create"]>[0],
  maxRetries = 2
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create(params as any);
      const content = (response as any).choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) throw new Error("Empty response from OpenAI");
      JSON.parse(content);
      return content;
    } catch (err: any) {
      lastError = err;
      console.warn(`[OpenAI] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

export async function generateDiet(
  macros: MacroTargets,
  preference: string,
  goal: string,
  cuisine?: string
): Promise<GeneratedDietPlan> {
  const start = Date.now();
  const cuisineKey = cuisine && CUISINE_HINTS[cuisine] ? cuisine : "indian";
  const cuisineHint = CUISINE_HINTS[cuisineKey];

  const prompt = `Daily meal plan: ${macros.calories}kcal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fat}g fat. Diet: ${preference}. Goal: ${goal}. ${cuisineHint} 4 meals. JSON: {"meals":[{"meal":"Name","time":"8am","foods":[{"name":"Food","quantity":"1 cup","calories":100,"protein":10}],"total_calories":100,"total_protein":10}],"daily_totals":{"calories":${macros.calories},"protein":${macros.protein},"carbs":${macros.carbs},"fat":${macros.fat}},"notes":[]}`;

  try {
    const client = getUserOpenAIClient();
    const content = await callOpenAIWithRetry(client, {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Expert nutritionist. Return JSON only, no markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
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

    const result: GeneratedDietPlan = {
      meals,
      daily_totals: raw.daily_totals || { calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
      notes: raw.notes || [],
    };

    if (result.meals.length === 0) throw new Error("AI response missing meals");

    logAICall({ service: "openai", task: "diet", durationMs: Date.now() - start, success: true });
    return result;
  } catch (err: any) {
    logAICall({ service: "openai", task: "diet", durationMs: Date.now() - start, success: false, error: err.message });
    console.warn("[OpenAI] Diet generation failed, falling back to Replit integration:", err.message);
    const fallbackStart = Date.now();
    try {
      const result = await generateDietPlanReplit(macros, preference, goal, cuisine);
      logAICall({ service: "openai-replit", task: "diet", durationMs: Date.now() - fallbackStart, success: true });
      return result;
    } catch (fallbackErr: any) {
      logAICall({ service: "openai-replit", task: "diet", durationMs: Date.now() - fallbackStart, success: false, error: fallbackErr.message });
      throw new Error(`Diet generation failed on all providers: ${fallbackErr.message}`);
    }
  }
}

export async function generateWorkout(profile: {
  goal: string;
  experience_level: string;
  equipment_access: string;
  weekly_availability: number;
}): Promise<{ summary: string; tips: string[] }> {
  const start = Date.now();
  const prompt = `Fitness coach. Give 3 workout tips and 1 summary sentence for: goal=${profile.goal}, experience=${profile.experience_level}, equipment=${profile.equipment_access}, days/week=${profile.weekly_availability}. JSON: {"summary":"","tips":["","",""]}`;

  try {
    const client = getUserOpenAIClient();
    const content = await callOpenAIWithRetry(client, {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Fitness expert. JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(content);
    logAICall({ service: "openai", task: "workout", durationMs: Date.now() - start, success: true });
    return { summary: result.summary || "", tips: result.tips || [] };
  } catch (err: any) {
    logAICall({ service: "openai", task: "workout", durationMs: Date.now() - start, success: false, error: err.message });
    throw new Error(`Workout generation failed: ${err.message}`);
  }
}

export async function generateAdaptation(progress: {
  weight_change: number;
  goal: string;
  current_calories: number;
  adjusted_calories: number;
  reason: string;
}): Promise<{ explanation: string; motivation: string }> {
  const start = Date.now();
  const prompt = `The user is ${progress.weight_change >= 0 ? "not losing" : "losing"} weight. Goal: ${progress.goal}. Calories adjusted from ${progress.current_calories} to ${progress.adjusted_calories}. Reason: ${progress.reason}. Write a short friendly 1-sentence explanation and 1 motivational sentence. JSON: {"explanation":"","motivation":""}`;

  try {
    const client = getUserOpenAIClient();
    const content = await callOpenAIWithRetry(client, {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Supportive fitness coach. JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(content);
    logAICall({ service: "openai", task: "adaptation", durationMs: Date.now() - start, success: true });
    return { explanation: result.explanation || progress.reason, motivation: result.motivation || "Keep going!" };
  } catch (err: any) {
    logAICall({ service: "openai", task: "adaptation", durationMs: Date.now() - start, success: false, error: err.message });
    return { explanation: progress.reason, motivation: "Keep going!" };
  }
}
