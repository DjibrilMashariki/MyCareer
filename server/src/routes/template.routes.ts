import { Router, Request, Response } from "express";
import fs from "fs";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { upload, cleanupTempFile } from "../middleware/upload.middleware";
import { uploadFile, getFileUrl, getLocalFilePath } from "../services/storage.service";
import { inMemoryTemplates, InMemoryTemplate } from "../lib/data-store";

const router = Router();

/**
 * GET /api/templates
 * List all available resume templates.
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        if (!isSupabaseConfigured()) {
            res.json(inMemoryTemplates);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("resume_templates")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            filePath: t.file_path,
            originalFilename: t.original_filename,
            fileSizeBytes: t.file_size_bytes,
            uploadedBy: t.uploaded_by,
            createdAt: t.created_at,
        }));

        res.json(mapped);
    } catch (error) {
        console.error("GET /api/templates error:", error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
});

/**
 * POST /api/templates
 * Upload a new resume template (admin only).
 */
router.post(
    "/",
    requireAuth,
    requireRole("admin"),
    upload.single("file"),
    async (req: Request, res: Response) => {
        try {
            const file = req.file;
            const { name, description } = req.body;

            if (!file) {
                res.status(400).json({ error: "No file provided" });
                return;
            }

            if (!name || name.trim().length === 0) {
                cleanupTempFile(file.path);
                res.status(400).json({ error: "Template name is required" });
                return;
            }

            const templateId = `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

            if (!isSupabaseConfigured()) {
                // Store file locally
                const storagePath = await uploadFile(
                    req.user!.id, "templates", templateId, file.path, file.originalname
                );

                const template: InMemoryTemplate = {
                    id: templateId,
                    name: name.trim(),
                    description: (description || "").trim(),
                    filePath: storagePath,
                    originalFilename: file.originalname,
                    fileSizeBytes: file.size,
                    uploadedBy: req.user!.id,
                    createdAt: new Date().toISOString(),
                };
                inMemoryTemplates.push(template);
                cleanupTempFile(file.path);
                res.status(201).json(template);
                return;
            }

            const storagePath = await uploadFile(
                req.user!.id, "templates", templateId, file.path, file.originalname
            );

            const { data, error } = await supabaseAdmin
                .from("resume_templates")
                .insert({
                    name: name.trim(),
                    description: (description || "").trim(),
                    file_path: storagePath,
                    original_filename: file.originalname,
                    file_size_bytes: file.size,
                    uploaded_by: req.user!.id,
                })
                .select()
                .single();

            if (error) throw error;
            cleanupTempFile(file.path);

            res.status(201).json({
                id: data.id,
                name: data.name,
                description: data.description,
                filePath: data.file_path,
                originalFilename: data.original_filename,
                fileSizeBytes: data.file_size_bytes,
                uploadedBy: data.uploaded_by,
                createdAt: data.created_at,
            });
        } catch (error) {
            if (req.file) cleanupTempFile(req.file.path);
            console.error("POST /api/templates error:", error);
            res.status(500).json({ error: "Failed to upload template" });
        }
    }
);

/**
 * GET /api/templates/:id/download
 * Download a template file.
 */
router.get("/:id/download", requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isSupabaseConfigured()) {
            const template = inMemoryTemplates.find((t) => t.id === id);
            if (!template) {
                res.status(404).json({ error: "Template not found" });
                return;
            }
            const localPath = getLocalFilePath(template.filePath);
            if (fs.existsSync(localPath)) {
                res.download(localPath, template.originalFilename);
            } else {
                res.status(404).json({ error: "File not found on disk" });
            }
            return;
        }

        const { data: template, error } = await supabaseAdmin
            .from("resume_templates")
            .select("file_path, original_filename")
            .eq("id", id)
            .single();

        if (error || !template) {
            res.status(404).json({ error: "Template not found" });
            return;
        }

        const url = await getFileUrl(template.file_path);
        res.json({ downloadUrl: url, filename: template.original_filename });
    } catch (error) {
        console.error("GET /api/templates/:id/download error:", error);
        res.status(500).json({ error: "Failed to get template download" });
    }
});

/**
 * DELETE /api/templates/:id
 * Delete a template (admin only).
 */
router.delete("/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isSupabaseConfigured()) {
            const idx = inMemoryTemplates.findIndex((t) => t.id === id);
            if (idx === -1) {
                res.status(404).json({ error: "Template not found" });
                return;
            }
            inMemoryTemplates.splice(idx, 1);
            res.json({ success: true });
            return;
        }

        const { error } = await supabaseAdmin
            .from("resume_templates")
            .delete()
            .eq("id", id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/templates/:id error:", error);
        res.status(500).json({ error: "Failed to delete template" });
    }
});

export default router;
