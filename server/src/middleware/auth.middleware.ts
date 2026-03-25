import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase.client";
import { isSupabaseConfigured } from "../lib/supabase.client";
import { demoTokenStore } from "../routes/auth.routes";

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: "student" | "staff" | "admin";
                fullName: string;
            };
        }
    }
}

/**
 * Middleware that authenticates requests using Supabase JWT.
 * Attaches user info to req.user if valid.
 * In demo mode (no Supabase configured), allows all requests through.
 */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    // Demo mode — skip auth if Supabase isn't configured
    if (!isSupabaseConfigured()) {
        // Try to resolve user from demo token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const storedUser = demoTokenStore.get(token);
            if (storedUser) {
                req.user = {
                    id: storedUser.id,
                    email: storedUser.email,
                    role: storedUser.role as "student" | "staff" | "admin",
                    fullName: storedUser.fullName,
                };
                return next();
            }
        }

        // Fallback: use x-demo-role header
        const demoRole = (req.headers["x-demo-role"] as string) || "student";
        const demoUserId = (req.headers["x-demo-user-id"] as string) || "demo-user";
        req.user = {
            id: demoUserId,
            email: `${demoRole}@demo.mycareer.app`,
            role: demoRole as "student" | "staff" | "admin",
            fullName: `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`,
        };
        return next();
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid authorization header" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        // Verify the JWT with Supabase
        const {
            data: { user: authUser },
            error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !authUser) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        // Get the user's profile from our users table
        const { data: userProfile, error: profileError } = await supabase
            .from("users")
            .select("id, email, full_name, role")
            .eq("id", authUser.id)
            .single();

        if (profileError || !userProfile) {
            res.status(401).json({ error: "User profile not found" });
            return;
        }

        // Attach user info to request
        req.user = {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            fullName: userProfile.full_name,
        };

        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({ error: "Authentication service error" });
    }
}

/**
 * Middleware factory that restricts access to specific roles.
 * Must be used after requireAuth.
 * 
 * @example
 *   router.get("/admin-only", requireAuth, requireRole("admin"), handler);
 *   router.get("/staff-or-admin", requireAuth, requireRole("staff", "admin"), handler);
 */
export function requireRole(...roles: Array<"student" | "staff" | "admin">) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: `Access denied. Required role: ${roles.join(" or ")}`,
            });
            return;
        }

        next();
    };
}
