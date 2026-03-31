import { generateDiet, generateWorkout, generateAdaptation } from "./openaiService";
import { analyzeFoodImageGemini } from "./geminiService";
import type { MacroTargets } from "../utils/dietCalculator";
import type { GeneratedDietPlan } from "./dietAI";
import type { FoodAnalysisResult } from "./foodVisionAI";

export type AITaskType = "diet" | "workout" | "adaptation" | "camera_food";

export interface AIRouterPayload {
  macros?: MacroTargets;
  preference?: string;
  goal?: string;
  cuisine?: string;
  profile?: {
    goal: string;
    experience_level: string;
    equipment_access: string;
    weekly_availability: number;
  };
  progress?: {
    weight_change: number;
    goal: string;
    current_calories: number;
    adjusted_calories: number;
    reason: string;
  };
  imageBuffer?: Buffer;
  mimeType?: string;
}

export async function routeAI(
  taskType: AITaskType,
  payload: AIRouterPayload
): Promise<GeneratedDietPlan | FoodAnalysisResult | { summary: string; tips: string[] } | { explanation: string; motivation: string }> {
  switch (taskType) {
    case "diet": {
      if (!payload.macros || !payload.preference || !payload.goal) {
        throw new Error("diet task requires macros, preference, and goal");
      }
      return generateDiet(payload.macros, payload.preference, payload.goal, payload.cuisine);
    }

    case "workout": {
      if (!payload.profile) throw new Error("workout task requires profile");
      return generateWorkout(payload.profile);
    }

    case "adaptation": {
      if (!payload.progress) throw new Error("adaptation task requires progress");
      return generateAdaptation(payload.progress);
    }

    case "camera_food": {
      if (!payload.imageBuffer) throw new Error("camera_food task requires imageBuffer");

      try {
        return await analyzeFoodImageGemini(payload.imageBuffer, payload.mimeType);
      } catch (geminiErr: any) {
        console.error("[aiRouter] Gemini camera_food failed:", geminiErr.message);
        throw new Error(`Food image analysis unavailable: ${geminiErr.message}`);
      }
    }

    default:
      throw new Error(`Unknown AI task type: ${taskType}`);
  }
}
