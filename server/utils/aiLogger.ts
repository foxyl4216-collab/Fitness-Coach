export interface AILogEntry {
  service: "openai" | "gemini" | "openai-replit";
  task: "diet" | "workout" | "adaptation" | "camera_food";
  durationMs: number;
  success: boolean;
  error?: string;
  userId?: string;
}

export function logAICall(entry: AILogEntry): void {
  const status = entry.success ? "✓" : "✗";
  const color = entry.success ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  const timestamp = new Date().toISOString();

  console.log(
    `${color}[AI][${status}]${reset} ${timestamp} | ` +
    `service=${entry.service} task=${entry.task} ` +
    `duration=${entry.durationMs}ms` +
    (entry.userId ? ` userId=${entry.userId}` : "") +
    (entry.error ? ` error="${entry.error}"` : "")
  );
}
