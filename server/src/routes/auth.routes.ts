import { Router, Request, Response } from "express";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";

const router = Router();

// In-memory user store for demo mode
const demoUsers: Map<string, { id: string; email: string; fullName: string; role: string; password: string }> = new Map();

// Token → user mapping for demo-mode auth
export const demoTokenStore: Map<string, { id: string; email: string; fullName: string; role: string }> = new Map();

/**
 * POST /api/auth/signup
 * Create a new user account with role
 */
router.post("/signup", async (req: Request, res: Response) => {
    const { email, password, fullName, role } = req.body;

    // Validate input
    if (!email || !password || !fullName || !role) {
        res.status(400).json({
            error: "Missing required fields: email, password, fullName, role",
        });
        return;
    }

    if (!["student", "staff"].includes(role)) {
        res.status(400).json({
            error: "Role must be 'student' or 'staff'. Admin accounts are created separately.",
        });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
    }

    // Demo mode
    if (!isSupabaseConfigured()) {
        const userId = `demo-${Date.now()}`;
        demoUsers.set(email, { id: userId, email, fullName, role, password });
        res.json({
            user: {
                id: userId,
                email,
                fullName,
                role,
            },
            message: "Demo mode: User created (in-memory)",
        });
        return;
    }

    try {
        // 1. Create the auth user in Supabase
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email for now
        });

        if (authError) {
            res.status(400).json({ error: authError.message });
            return;
        }

        if (!authData.user) {
            res.status(500).json({ error: "Failed to create auth user" });
            return;
        }

        // 2. Create the user profile in our users table
        const { error: profileError } = await supabaseAdmin
            .from("users")
            .insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role,
            });

        if (profileError) {
            // Rollback: delete the auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            res.status(500).json({ error: "Failed to create user profile" });
            return;
        }

        res.status(201).json({
            user: {
                id: authData.user.id,
                email,
                fullName,
                role,
            },
            message: "Account created successfully. You can now log in.",
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "An unexpected error occurred during signup" });
    }
});

/**
 * POST /api/auth/login
 * Authenticate a user and return session token
 */
router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Missing required fields: email, password" });
        return;
    }

    // Demo mode
    if (!isSupabaseConfigured()) {
        const demoUser = demoUsers.get(email);
        if (demoUser && demoUser.password === password) {
            const token = "demo-token-" + Date.now();
            const userInfo = {
                id: demoUser.id,
                email: demoUser.email,
                fullName: demoUser.fullName,
                role: demoUser.role,
            };
            demoTokenStore.set(token, userInfo);
            res.json({
                session: {
                    access_token: token,
                    expires_in: 3600,
                },
                user: userInfo,
            });
        } else {
            // Fallback for users that weren't signed up first
            const token = "demo-token-" + Date.now();

            // Smart Demo Role Assignment
            let role = "student";
            if (email.includes("admin")) role = "admin";
            else if (email.includes("staff")) role = "staff";

            const userInfo = {
                id: `demo-${role}`,
                email,
                fullName: email.split("@")[0],
                role: role,
            };
            demoTokenStore.set(token, userInfo);
            res.json({
                session: {
                    access_token: token,
                    expires_in: 3600,
                },
                user: userInfo,
            });
        }
        return;
    }

    try {
        // Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        if (!data.session || !data.user) {
            res.status(401).json({ error: "Authentication failed" });
            return;
        }

        // Get user profile with role
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from("users")
            .select("id, email, full_name, role")
            .eq("id", data.user.id)
            .single();

        if (profileError || !userProfile) {
            res.status(500).json({ error: "User profile not found" });
            return;
        }

        res.json({
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
            },
            user: {
                id: userProfile.id,
                email: userProfile.email,
                fullName: userProfile.full_name,
                role: userProfile.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "An unexpected error occurred during login" });
    }
});

/**
 * POST /api/auth/logout
 * Sign out the current user
 */
router.post("/logout", async (req: Request, res: Response) => {
    if (!isSupabaseConfigured()) {
        res.json({ message: "Logged out (demo mode)" });
        return;
    }

    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            await supabase.auth.signOut();
        }
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ error: "Logout failed" });
    }
});

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile
 */
router.get("/me", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!isSupabaseConfigured()) {
        res.json({
            id: "demo-user",
            email: "demo@mycareer.app",
            fullName: "Demo User",
            role: "student",
        });
        return;
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const {
            data: { user: authUser },
            error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !authUser) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from("users")
            .select("id, email, full_name, role")
            .eq("id", authUser.id)
            .single();

        if (profileError || !userProfile) {
            res.status(404).json({ error: "User profile not found" });
            return;
        }

        res.json({
            id: userProfile.id,
            email: userProfile.email,
            fullName: userProfile.full_name,
            role: userProfile.role,
        });
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({ error: "Failed to get user profile" });
    }
});

export default router;
