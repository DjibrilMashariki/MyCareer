import { Router, Request, Response } from "express";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { inMemoryAnnotations, InMemoryAnnotation } from "../lib/data-store";

const router = Router();

/**
 * GET /api/resumes/:resumeId/annotations
 * Get all annotations for a resume.
 */
router.get("/:resumeId/annotations", requireAuth, async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;

        if (!isSupabaseConfigured()) {
            const annotations = inMemoryAnnotations
                .filter((a) => a.resumeId === resumeId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            res.json(annotations);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("annotations")
            .select(`
        id, resume_id, version_id, staff_id, page_number,
        x_position, y_position, content, created_at,
        staff:users!annotations_staff_id_fkey(full_name)
      `)
            .eq("resume_id", resumeId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((a: any) => ({
            id: a.id,
            resumeId: a.resume_id,
            versionId: a.version_id,
            staffId: a.staff_id,
            staffName: a.staff?.full_name || "Unknown",
            pageNumber: a.page_number,
            xPosition: a.x_position,
            yPosition: a.y_position,
            content: a.content,
            createdAt: a.created_at,
        }));

        res.json(mapped);
    } catch (error) {
        console.error("GET /api/resumes/:resumeId/annotations error:", error);
        res.status(500).json({ error: "Failed to fetch annotations" });
    }
});

/**
 * POST /api/resumes/:resumeId/annotations
 * Create an annotation (staff or admin only).
 */
router.post(
    "/:resumeId/annotations",
    requireAuth,
    requireRole("staff", "admin"),
    async (req: Request, res: Response) => {
        try {
            const { resumeId } = req.params;
            const { versionId, pageNumber, xPosition, yPosition, content } = req.body;

            if (!content || content.trim().length === 0) {
                res.status(400).json({ error: "Annotation content is required" });
                return;
            }

            if (pageNumber === undefined || xPosition === undefined || yPosition === undefined) {
                res.status(400).json({ error: "pageNumber, xPosition, and yPosition are required" });
                return;
            }

            if (!isSupabaseConfigured()) {
                const annotation: InMemoryAnnotation = {
                    id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    resumeId,
                    versionId,
                    staffId: req.user!.id,
                    staffName: req.user!.fullName,
                    pageNumber,
                    xPosition,
                    yPosition,
                    content: content.trim(),
                    createdAt: new Date().toISOString(),
                };
                inMemoryAnnotations.push(annotation);
                res.status(201).json(annotation);
                return;
            }

            const { data, error } = await supabaseAdmin
                .from("annotations")
                .insert({
                    resume_id: resumeId,
                    version_id: versionId || null,
                    staff_id: req.user!.id,
                    page_number: pageNumber,
                    x_position: xPosition,
                    y_position: yPosition,
                    content: content.trim(),
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                id: data.id,
                resumeId: data.resume_id,
                versionId: data.version_id,
                staffId: data.staff_id,
                staffName: req.user!.fullName,
                pageNumber: data.page_number,
                xPosition: data.x_position,
                yPosition: data.y_position,
                content: data.content,
                createdAt: data.created_at,
            });
        } catch (error) {
            console.error("POST /api/resumes/:resumeId/annotations error:", error);
            res.status(500).json({ error: "Failed to create annotation" });
        }
    }
);

/**
 * DELETE /api/resumes/:resumeId/annotations/:annotationId
 * Delete an annotation (owner or admin only).
 */
router.delete(
    "/:resumeId/annotations/:annotationId",
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const { annotationId } = req.params;

            if (!isSupabaseConfigured()) {
                const idx = inMemoryAnnotations.findIndex((a) => a.id === annotationId);
                if (idx === -1) {
                    res.status(404).json({ error: "Annotation not found" });
                    return;
                }
                const annotation = inMemoryAnnotations[idx];
                if (annotation.staffId !== req.user!.id && req.user!.role !== "admin") {
                    res.status(403).json({ error: "You can only delete your own annotations" });
                    return;
                }
                inMemoryAnnotations.splice(idx, 1);
                res.json({ success: true });
                return;
            }

            // Check ownership
            const { data: annotation, error: getError } = await supabaseAdmin
                .from("annotations")
                .select("staff_id")
                .eq("id", annotationId)
                .single();

            if (getError || !annotation) {
                res.status(404).json({ error: "Annotation not found" });
                return;
            }

            if (annotation.staff_id !== req.user!.id && req.user!.role !== "admin") {
                res.status(403).json({ error: "You can only delete your own annotations" });
                return;
            }

            const { error } = await supabaseAdmin
                .from("annotations")
                .delete()
                .eq("id", annotationId);

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            console.error("DELETE annotation error:", error);
            res.status(500).json({ error: "Failed to delete annotation" });
        }
    }
);

export default router;
