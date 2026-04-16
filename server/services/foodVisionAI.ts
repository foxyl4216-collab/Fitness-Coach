import { createAIVisionResponse } from "./openRouter";

export interface FoodItem {
  name: string;
  estimated_quantity: string;
  estimated_calories: number;
}

export interface FoodAnalysisResult {
  items: FoodItem[];
  total_estimated_calories: number;
  confidence_score: number;
  low_confidence: boolean;
}

const SYSTEM_PROMPT = `You are a professional nutritionist with expert knowledge of food portions and calories. Analyze food images carefully and return ONLY valid JSON. Do not include markdown or any text outside the JSON.

Return this exact structure: {"items":[{"name":"","estimated_quantity":"","estimated_calories":0}],"total_estimated_calories":0,"confidence_score":0,"low_confidence":false}

Guidelines for estimation:
- Use standard USDA nutritional data for calorie estimates
- Be consistent: the same food at the same quantity should always have the same calorie estimate
- For vegetables like carrots: 1 medium carrot = ~25 calories, 1 cup raw = ~52 calories
- Always provide realistic estimates based on visible quantity
- Set confidence_score 0-100 based on image clarity (0=cannot identify, 100=crystal clear)
- Set low_confidence:true only if you cannot clearly identify the food`;

const USER_PROMPT = `Analyze this food image carefully. Identify each distinct food item, estimate the portion size (in standard units like 'medium', 'cups', 'pieces', 'grams'), and calculate calories based on that portion. Return total_estimated_calories as the sum of all items. Set confidence_score based on how clearly you can identify the food and estimate its quantity (0-100).`;

/**
 * Analyze a food image using GPT-4o-mini vision via OpenRouter.
 * createAIResponse("Analyze food image", "gemini")
 */
export async function analyzeFoodImage(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<FoodAnalysisResult> {
  console.log("[foodVisionAI] Buffer size:", imageBuffer.length, "bytes");

  const base64 = imageBuffer.toString("base64");

  const raw = await createAIVisionResponse(USER_PROMPT, base64, mimeType, "gpt", {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 500,
    temperature: 0,
    maxRetries: 2,
  });

  console.log("[foodVisionAI] Raw AI response:", raw);

  let result: FoodAnalysisResult;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as FoodAnalysisResult;
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  if (!result.items || !Array.isArray(result.items)) {
    throw new Error("Invalid AI response format: missing items array");
  }

  if (!result.total_estimated_calories || result.total_estimated_calories <= 0) {
    result.total_estimated_calories = result.items.reduce(
      (sum, item) => sum + (item.estimated_calories || 0),
      0
    );
  }

  if (result.total_estimated_calories < 10) result.low_confidence = true;
  if (result.total_estimated_calories > 5000) {
    result.total_estimated_calories = 5000;
    result.low_confidence = true;
  }

  result.confidence_score = Math.max(0, Math.min(100, result.confidence_score || 50));

  console.log("[foodVisionAI] Parsed result:", JSON.stringify(result, null, 2));
  return result;
}
