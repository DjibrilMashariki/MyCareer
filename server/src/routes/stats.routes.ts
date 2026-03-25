import { Router, Request, Response } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";
import { requireAuth } from "../middleware/auth.middleware";
import { inMemoryResumes, demoStaffIds } from "../lib/data-store";

const router = Router();

/**
 * GET /api/staff/workload
 * Get assignment counts for all staff members.
 */
router.get("/workload", requireAuth, async (req: Request, res: Response) => {
    try {
        if (!isSupabaseConfigured()) {
            const allResumes = Array.from(inMemoryResumes.values());
            const workload: Record<string, number> = {};
            demoStaffIds.forEach((id) => {
                workload[id] = allResumes.filter((r) => r.assignedStaffId === id).length;
            });
            res.json(workload);
            return;
        }

        const { data: staffUsers } = await supabaseAdmin
            .from("users").select("id, full_name").eq("role", "staff");
        if (!staffUsers || staffUsers.length === 0) { res.json({}); return; }

        const workload: Record<string, number> = {};
        for (const staff of staffUsers) {
            const { count } = await supabaseAdmin
                .from("resumes").select("*", { count: "exact", head: true })
                .eq("assigned_staff_id", staff.id);
            workload[staff.id] = count || 0;
        }
        res.json(workload);
    } catch (error) {
        console.error("GET /api/staff/workload error:", error);
        res.status(500).json({ error: "Failed to fetch workload" });
    }
});

/**
 * GET /api/stats
 * Get resume statistics.
 */
router.get("/stats", requireAuth, async (req: Request, res: Response) => {
    try {
        if (!isSupabaseConfigured()) {
            const allResumes = Array.from(inMemoryResumes.values());
            res.json({
                total: allResumes.length,
                draft: allResumes.filter((r) => r.status === "draft").length,
                submitted: allResumes.filter((r) => r.status === "submitted").length,
                changesRequired: allResumes.filter((r) => r.status === "changes_required").length,
                approved: allResumes.filter((r) => r.status === "approved").length,
            });
            return;
        }

        const { data, error } = await supabaseAdmin.from("resumes").select("status");
        if (error) throw error;
        const statuses = data || [];
        res.json({
            total: statuses.length,
            draft: statuses.filter((r: any) => r.status === "draft").length,
            submitted: statuses.filter((r: any) => r.status === "submitted").length,
            changesRequired: statuses.filter((r: any) => r.status === "changes_required").length,
            approved: statuses.filter((r: any) => r.status === "approved").length,
        });
    } catch (error) {
        console.error("GET /api/stats error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

/**
 * GET /api/analytics
 * Get processing time analytics, revision counts, monthly volumes.
 */
router.get("/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
        if (!isSupabaseConfigured()) {
            const allResumes = Array.from(inMemoryResumes.values());

            // Calculate avg processing time (created → approved) in hours
            const approvedResumes = allResumes.filter((r) => r.status === "approved");
            let avgProcessingHours = 0;
            if (approvedResumes.length > 0) {
                const totalHours = approvedResumes.reduce((sum, r) => {
                    const created = new Date(r.createdAt).getTime();
                    const updated = new Date(r.updatedAt).getTime();
                    return sum + (updated - created) / (1000 * 60 * 60);
                }, 0);
                avgProcessingHours = Math.round((totalHours / approvedResumes.length) * 10) / 10;
            }

            // Monthly volumes (group by year-month of creation)
            const monthlyVolumes: Record<string, number> = {};
            allResumes.forEach((r) => {
                const month = r.createdAt.substring(0, 7); // "2024-01"
                monthlyVolumes[month] = (monthlyVolumes[month] || 0) + 1;
            });

            // Status distribution
            const statusDistribution = {
                draft: allResumes.filter((r) => r.status === "draft").length,
                submitted: allResumes.filter((r) => r.status === "submitted").length,
                changes_required: allResumes.filter((r) => r.status === "changes_required").length,
                approved: allResumes.filter((r) => r.status === "approved").length,
            };

            // Staff performance (resumes per staff)
            const staffPerformance: Record<string, { assigned: number; approved: number }> = {};
            allResumes.forEach((r) => {
                if (r.assignedStaffId) {
                    if (!staffPerformance[r.assignedStaffId]) {
                        staffPerformance[r.assignedStaffId] = { assigned: 0, approved: 0 };
                    }
                    staffPerformance[r.assignedStaffId].assigned++;
                    if (r.status === "approved") {
                        staffPerformance[r.assignedStaffId].approved++;
                    }
                }
            });

            res.json({
                totalResumes: allResumes.length,
                avgProcessingHours,
                approvalRate: allResumes.length > 0
                    ? Math.round((approvedResumes.length / allResumes.length) * 100) : 0,
                monthlyVolumes,
                statusDistribution,
                staffPerformance,
            });
            return;
        }

        // Supabase mode
        const { data, error } = await supabaseAdmin.from("resumes").select("*");
        if (error) throw error;
        const allResumes = data || [];

        const approvedResumes = allResumes.filter((r: any) => r.status === "approved");
        let avgProcessingHours = 0;
        if (approvedResumes.length > 0) {
            const totalHours = approvedResumes.reduce((sum: number, r: any) => {
                const created = new Date(r.created_at).getTime();
                const updated = new Date(r.updated_at).getTime();
                return sum + (updated - created) / (1000 * 60 * 60);
            }, 0);
            avgProcessingHours = Math.round((totalHours / approvedResumes.length) * 10) / 10;
        }

        const monthlyVolumes: Record<string, number> = {};
        allResumes.forEach((r: any) => {
            const month = r.created_at.substring(0, 7);
            monthlyVolumes[month] = (monthlyVolumes[month] || 0) + 1;
        });

        const statusDistribution = {
            draft: allResumes.filter((r: any) => r.status === "draft").length,
            submitted: allResumes.filter((r: any) => r.status === "submitted").length,
            changes_required: allResumes.filter((r: any) => r.status === "changes_required").length,
            approved: allResumes.filter((r: any) => r.status === "approved").length,
        };

        const staffPerformance: Record<string, { assigned: number; approved: number }> = {};
        allResumes.forEach((r: any) => {
            if (r.assigned_staff_id) {
                if (!staffPerformance[r.assigned_staff_id]) {
                    staffPerformance[r.assigned_staff_id] = { assigned: 0, approved: 0 };
                }
                staffPerformance[r.assigned_staff_id].assigned++;
                if (r.status === "approved") {
                    staffPerformance[r.assigned_staff_id].approved++;
                }
            }
        });

        res.json({
            totalResumes: allResumes.length,
            avgProcessingHours,
            approvalRate: allResumes.length > 0
                ? Math.round((approvedResumes.length / allResumes.length) * 100) : 0,
            monthlyVolumes,
            statusDistribution,
            staffPerformance,
        });
    } catch (error) {
        console.error("GET /api/analytics error:", error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

export default router;
