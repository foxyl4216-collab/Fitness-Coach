import type { Express } from "express";
import { createServer, type Server } from "node:http";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import weeklyPlanRoutes from "./routes/weekly-plan";
import checkinRoutes from "./routes/checkin";
import calorieLogRoutes from "./routes/calorie-log";
import dietRoutes from "./routes/diet";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/weekly-plan", weeklyPlanRoutes);
  app.use("/api/weekly-checkin", checkinRoutes);
  app.use("/api/calorie-log", calorieLogRoutes);
  app.use("/api/diet-plan", dietRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
