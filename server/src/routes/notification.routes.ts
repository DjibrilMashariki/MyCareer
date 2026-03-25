import { Router, Request, Response } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// In-memory notification store for demo mode
interface InMemoryNotification {
    id: string;
    userId: string;
    type: "status_change" | "new_assignment" | "new_feedback" | "submission";
    title: string;
    message: string;
    resumeId?: string;
    isRead: boolean;
    createdAt: string;
}

const demoNotifications: InMemoryNotification[] = [];

/**
 * Helper: Create a notification (called from other routes)
 */
export async function createNotification(
    userId: string,
    type: InMemoryNotification["type"],
    title: string,
    message: string,
    resumeId?: string
) {
    if (!isSupabaseConfigured()) {
        demoNotifications.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            userId,
            type,
            title,
            message,
            resumeId,
            isRead: false,
            createdAt: new Date().toISOString(),
        });
        return;
    }

    try {
        await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            type,
            title,
            message,
            resume_id: resumeId,
            is_read: false,
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
}

/**
 * GET /api/notifications
 * Get the current user's notifications (most recent first)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const unreadOnly = req.query.unread === "true";

        if (!isSupabaseConfigured()) {
            let results = demoNotifications
                .filter((n) => n.userId === userId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            if (unreadOnly) {
                results = results.filter((n) => !n.isRead);
            }

            res.json({
                notifications: results.slice(0, 50),
                unreadCount: demoNotifications.filter((n) => n.userId === userId && !n.isRead).length,
            });
            return;
        }

        let query = supabaseAdmin
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (unreadOnly) {
            query = query.eq("is_read", false);
        }

        const { data, error } = await query;

        if (error) {
            res.status(500).json({ error: "Failed to fetch notifications" });
            return;
        }

        const unreadCountResult = await supabaseAdmin
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false);

        res.json({
            notifications: (data || []).map((n: any) => ({
                id: n.id,
                userId: n.user_id,
                type: n.type,
                title: n.title,
                message: n.message,
                resumeId: n.resume_id,
                isRead: n.is_read,
                createdAt: n.created_at,
            })),
            unreadCount: unreadCountResult.count || 0,
        });
    } catch (error) {
        console.error("GET /api/notifications error:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch("/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        if (!isSupabaseConfigured()) {
            const notif = demoNotifications.find((n) => n.id === id && n.userId === userId);
            if (notif) {
                notif.isRead = true;
                res.json({ success: true });
            } else {
                res.status(404).json({ error: "Notification not found" });
            }
            return;
        }

        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            res.status(500).json({ error: "Failed to mark as read" });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/notifications/:id/read error:", error);
        res.status(500).json({ error: "Failed to mark as read" });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
router.patch("/read-all", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!isSupabaseConfigured()) {
            demoNotifications
                .filter((n) => n.userId === userId)
                .forEach((n) => (n.isRead = true));
            res.json({ success: true });
            return;
        }

        const { error } = await supabaseAdmin
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("is_read", false);

        if (error) {
            res.status(500).json({ error: "Failed to mark all as read" });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/notifications/read-all error:", error);
        res.status(500).json({ error: "Failed to mark all as read" });
    }
});

export default router;
