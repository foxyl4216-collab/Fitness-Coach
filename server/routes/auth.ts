import { Router } from "express";
import { supabase, getSupabaseClient } from "../config/supabase";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });

    // Create free subscription using user's own token (satisfies RLS auth.uid() = user_id)
    if (data.user?.id && data.session?.access_token) {
      try {
        const userClient = getSupabaseClient(data.session.access_token);
        await userClient
          .from("subscriptions")
          .insert({
            user_id: data.user.id,
            plan_type: "free",
            status: "active",
          });
      } catch {
        // Non-critical — user signup succeeds regardless
      }
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ error: error.message });

    return res.json({
      message: "Login successful",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/logout", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Logged out successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  return res.json({
    user: {
      id: req.userId,
      email: req.userEmail,
    },
  });
});

router.get("/session", requireAuth, async (req: AuthenticatedRequest, res) => {
  return res.json({
    authenticated: true,
    user: {
      id: req.userId,
      email: req.userEmail,
    },
  });
});

router.post("/update-email", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { data, error } = await supabase.auth.admin.updateUserById(req.userId!, {
      email,
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({
      message: "Email updated successfully",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) return res.status(401).json({ error: error.message });

    return res.json({
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
