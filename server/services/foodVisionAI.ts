import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

export async function analyzeFoodImage(imageBuffer: Buffer, mimeType: string = "image/jpeg"): Promise<FoodAnalysisResult> {
  console.log("[foodVisionAI] Buffer size:", imageBuffer.length, "bytes");
  
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log("[foodVisionAI] Calling OpenAI GPT-4o Vision...");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0, // Deterministic responses for consistency
    messages: [
      {
        role: "system",
        content: `You are a professional nutritionist with expert knowledge of food portions and calories. Analyze food images carefully and return ONLY valid JSON. Do not include markdown or any text outside the JSON.

Return this exact structure: {"items":[{"name":"","estimated_quantity":"","estimated_calories":0}],"total_estimated_calories":0,"confidence_score":0,"low_confidence":false}

Guidelines for estimation:
- Use standard USDA nutritional data for calorie estimates
- Be consistent: the same food at the same quantity should always have the same calorie estimate
- For vegetables like carrots: 1 medium carrot = ~25 calories, 1 cup raw = ~52 calories
- Always provide realistic estimates based on visible quantity
- Set confidence_score 0-100 based on image clarity (0=cannot identify, 100=crystal clear)
- Set low_confidence:true only if you cannot clearly identify the food`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "low" },
          },
          {
            type: "text",
            text: "Analyze this food image carefully. Identify each distinct food item, estimate the portion size (in standard units like 'medium', 'cups', 'pieces', 'grams'), and calculate calories based on that portion. Return total_estimated_calories as the sum of all items. Set confidence_score based on how clearly you can identify the food and estimate its quantity (0-100).",
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content || content.trim().length === 0) {
    throw new Error("Empty response from AI vision service");
  }

  console.log("[foodVisionAI] Raw AI response:", content);

  let result: FoodAnalysisResult;
  try {
    result = JSON.parse(content) as FoodAnalysisResult;
  } catch (e) {
    console.error("[foodVisionAI] JSON parse error:", e);
    throw new Error("AI response was not valid JSON");
  }

  if (!result.items || !Array.isArray(result.items)) {
    throw new Error("Invalid AI response format: missing items array");
  }

  // Ensure total is calculated if missing
  if (!result.total_estimated_calories || result.total_estimated_calories <= 0) {
    result.total_estimated_calories = result.items.reduce(
      (sum, item) => sum + (item.estimated_calories || 0),
      0
    );
  }

  // Validate and normalize calorie estimates
  // Most single meals should be 50-2000 calories; flag outliers
  if (result.total_estimated_calories < 10) {
    console.warn("[foodVisionAI] Warning: Very low calorie estimate", result.total_estimated_calories);
    result.low_confidence = true;
  }
  if (result.total_estimated_calories > 5000) {
    console.warn("[foodVisionAI] Warning: Very high calorie estimate", result.total_estimated_calories);
    // Cap unreasonable estimates to 50% of flagged value as a safeguard
    result.total_estimated_calories = Math.min(result.total_estimated_calories, 5000);
    result.low_confidence = true;
  }

  // Ensure confidence score is in valid range
  result.confidence_score = Math.max(0, Math.min(100, result.confidence_score || 50));

  console.log("[foodVisionAI] Parsed result:", JSON.stringify(result, null, 2));
  return result;
}
