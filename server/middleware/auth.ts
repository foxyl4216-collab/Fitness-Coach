import type { Request, Response, NextFunction } from "express";
import { supabase, getSupabaseClient } from "../config/supabase";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  supabaseClient?: ReturnType<typeof getSupabaseClient>;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email;
    req.supabaseClient = getSupabaseClient(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}
