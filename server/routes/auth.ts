import { Router } from "express";
import { supabase, supabaseAdmin, getSupabaseClient } from "../config/supabase";
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

    let userId: string | undefined;
    let userEmail: string | undefined;

    // Use admin client if available — it bypasses the broken DB trigger
    // by creating the user without firing auth hooks in the same transaction
    if (supabaseAdmin) {
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm so user gets a session immediately
      });

      if (adminError) {
        // Admin create failed — fall back to regular signUp
        console.error("Admin createUser failed:", JSON.stringify({ message: adminError.message, status: (adminError as any).status, code: (adminError as any).code }));
      } else {
        userId = adminData.user?.id;
        userEmail = adminData.user?.email;
      }
    }

    // Fall back to regular signUp if admin client unavailable or failed
    let sessionData: { access_token: string; refresh_token: string; expires_at?: number } | null = null;

    if (userId) {
      // Admin created the user — now sign them in to get a session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return res.status(500).json({ error: "Account created but login failed: " + signInError.message });
      }

      sessionData = signInData.session
        ? {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            expires_at: signInData.session.expires_at,
          }
        : null;
      userId = signInData.user?.id || userId;
      userEmail = signInData.user?.email || userEmail;
    } else {
      // No admin client — use regular signUp
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error("signUp failed:", JSON.stringify({ message: error.message, status: (error as any).status, code: (error as any).code }));
        return res.status(400).json({ error: error.message });
      }

      userId = data.user?.id;
      userEmail = data.user?.email;
      sessionData = data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null;
    }

    // Ensure user_profiles row exists (trigger may or may not have created it)
    if (userId) {
      console.log("Creating profile for userId:", userId);
      const adminOrAnon = supabaseAdmin || supabase;
      const { error: profileError } = await adminOrAnon
        .from("user_profiles")
        .insert({ user_id: userId })
        .select()
        .single();
      if (profileError) {
        console.warn("Profile insert result:", profileError.message, profileError.code);
        // If FK violation, try verifying user exists via admin
        if (supabaseAdmin && profileError.code === "23503") {
          const { data: verifyUser } = await supabaseAdmin.auth.admin.getUserById(userId);
          console.log("User verification:", verifyUser?.user?.id, verifyUser?.user?.email);
        }
      }

      // Create free subscription using service role (bypasses RLS user_id check)
      console.log("Creating subscription for userId:", userId);
      if (supabaseAdmin) {
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .insert({ user_id: userId, plan_type: "free", status: "active" })
          .select()
          .single();
        if (subError && !subError.message.includes("duplicate") && !subError.message.includes("unique")) {
          console.warn("Subscription creation warning:", subError.message);
        }
      } else if (sessionData?.access_token) {
        try {
          const userClient = getSupabaseClient(sessionData.access_token);
          await userClient
            .from("subscriptions")
            .insert({ user_id: userId, plan_type: "free", status: "active" });
        } catch {
          // Non-critical
        }
      }
    }

    return res.status(201).json({
      message: "User created successfully",
      user: { id: userId, email: userEmail },
      session: sessionData,
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

    const adminClient = supabaseAdmin || supabase;
    const { data, error } = await (adminClient as any).auth.admin.updateUserById(req.userId!, { email });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({
      message: "Email updated successfully",
      user: { id: data.user.id, email: data.user.email },
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

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

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
