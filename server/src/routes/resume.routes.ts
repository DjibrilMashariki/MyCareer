import { Router, Request, Response } from "express";
import fs from "fs";
import { supabaseAdmin, isSupabaseConfigured } from "../lib/supabase.client";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { upload, cleanupTempFile } from "../middleware/upload.middleware";
import { uploadFile, getFileUrl, getLocalFilePath } from "../services/storage.service";
import { assignStaff } from "../core/assignment.logic";
import { canUpdateStatus, Role } from "../core/permissions.rules";
import { createNotification } from "./notification.routes";
import {
    inMemoryResumes,
    inMemoryVersions,
    inMemoryFeedback,
    demoStaffIds,
    mapResumeFromDb,
    mapVersionFromDb,
    InMemoryVersion,
    InMemoryFeedback,
} from "../lib/data-store";

const router = Router();

// ============================================================
// Resume CRUD
// ============================================================

/**
 * GET /
 * Get all resumes. Admin sees all, staff sees assigned, student sees own.
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        if (!isSupabaseConfigured()) {
            let allResumes = Array.from(inMemoryResumes.values());
            if (req.user!.role === "student") {
                allResumes = allResumes.filter((r) => r.studentId === req.user!.id);
            } else if (req.user!.role === "staff") {
                allResumes = allResumes.filter((r) => r.assignedStaffId === req.user!.id);
            }
            res.json(allResumes);
            return;
        }

        let query = supabaseAdmin.from("resumes").select("*");
        if (req.user!.role === "student") {
            query = query.eq("student_id", req.user!.id);
        } else if (req.user!.role === "staff") {
            query = query.eq("assigned_staff_id", req.user!.id);
        }

        const { data, error } = await query.order("updated_at", { ascending: false });
        if (error) throw error;
        res.json((data || []).map(mapResumeFromDb));
    } catch (error) {
        console.error("GET /api/resumes error:", error);
        res.status(500).json({ error: "Failed to fetch resumes" });
    }
});

/**
 * GET /student/:studentId
 */
router.get("/student/:studentId", requireAuth, async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        if (!isSupabaseConfigured()) {
            const filtered = Array.from(inMemoryResumes.values()).filter(
                (r) => r.studentId === studentId || r.studentId === req.user!.id
            );
            res.json(filtered);
            return;
        }
        const queryStudentId = req.user!.role === "student" ? req.user!.id : studentId;
        const { data, error } = await supabaseAdmin
            .from("resumes").select("*").eq("student_id", queryStudentId)
            .order("updated_at", { ascending: false });
        if (error) throw error;
        res.json((data || []).map(mapResumeFromDb));
    } catch (error) {
        console.error("GET /api/resumes/student error:", error);
        res.status(500).json({ error: "Failed to fetch student resumes" });
    }
});

/**
 * GET /staff/:staffId
 */
router.get("/staff/:staffId", requireAuth, async (req: Request, res: Response) => {
    try {
        const { staffId } = req.params;
        if (!isSupabaseConfigured()) {
            const filtered = Array.from(inMemoryResumes.values()).filter(
                (r) => r.assignedStaffId === staffId || r.assignedStaffId === req.user!.id
            );
            res.json(filtered);
            return;
        }
        const queryStaffId = req.user!.role === "staff" ? req.user!.id : staffId;
        const { data, error } = await supabaseAdmin
            .from("resumes").select("*").eq("assigned_staff_id", queryStaffId)
            .order("updated_at", { ascending: false });
        if (error) throw error;
        res.json((data || []).map(mapResumeFromDb));
    } catch (error) {
        console.error("GET /api/resumes/staff error:", error);
        res.status(500).json({ error: "Failed to fetch staff resumes" });
    }
});

/**
 * POST /
 * Create a new resume draft.
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const studentId = req.user!.id;
        if (!isSupabaseConfigured()) {
            const newResume = {
                resumeId: `res-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
                studentId,
                status: "draft" as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            inMemoryResumes.set(newResume.resumeId, newResume);
            res.status(201).json(newResume);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("resumes").insert({ student_id: studentId, status: "draft" }).select().single();
        if (error) throw error;
        res.status(201).json(mapResumeFromDb(data));
    } catch (error) {
        console.error("POST /api/resumes error:", error);
        res.status(500).json({ error: "Failed to create resume" });
    }
});

/**
 * POST /:resumeId/submit
 * Submit a draft resume for review (auto-assigns staff).
 */
router.post("/:resumeId/submit", requireAuth, async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;

        if (!isSupabaseConfigured()) {
            const resume = inMemoryResumes.get(resumeId);
            if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
            if (resume.status !== "draft" && resume.status !== "changes_required") {
                res.status(400).json({ error: "Only drafts or resumes needing changes can be submitted" }); return;
            }

            const staffLoad: Record<string, number> = {};
            demoStaffIds.forEach((id) => {
                staffLoad[id] = Array.from(inMemoryResumes.values()).filter(
                    (r) => r.assignedStaffId === id && r.status === "submitted"
                ).length;
            });

            const assignedStaffId = assignStaff(demoStaffIds, staffLoad);
            resume.status = "submitted";
            resume.assignedStaffId = assignedStaffId;
            resume.updatedAt = new Date().toISOString();
            inMemoryResumes.set(resumeId, resume);

            createNotification(assignedStaffId, "new_assignment", "New Resume Assigned",
                `A resume has been submitted and assigned to you for review.`, resumeId);

            res.json(resume);
            return;
        }

        const { data: resume, error: getError } = await supabaseAdmin
            .from("resumes").select("*").eq("resume_id", resumeId).single();
        if (getError || !resume) { res.status(404).json({ error: "Resume not found" }); return; }
        if (resume.status !== "draft" && resume.status !== "changes_required") {
            res.status(400).json({ error: "Only drafts or resumes needing changes can be submitted" }); return;
        }

        const { data: staffUsers } = await supabaseAdmin.from("users").select("id").eq("role", "staff");
        const staffIds = (staffUsers || []).map((s: any) => s.id);
        if (staffIds.length === 0) { res.status(500).json({ error: "No staff members available" }); return; }

        const staffLoad: Record<string, number> = {};
        for (const sid of staffIds) {
            const { count } = await supabaseAdmin
                .from("resumes").select("*", { count: "exact", head: true })
                .eq("assigned_staff_id", sid).eq("status", "submitted");
            staffLoad[sid] = count || 0;
        }

        const assignedStaffId = assignStaff(staffIds, staffLoad);
        const { data: updated, error: updateError } = await supabaseAdmin
            .from("resumes")
            .update({ status: "submitted", assigned_staff_id: assignedStaffId })
            .eq("resume_id", resumeId).select().single();
        if (updateError) throw updateError;
        res.json(mapResumeFromDb(updated));
    } catch (error) {
        console.error("POST /api/resumes/:resumeId/submit error:", error);
        res.status(500).json({ error: "Failed to submit resume" });
    }
});

/**
 * PATCH /:resumeId/status
 */
router.patch("/:resumeId/status", requireAuth, async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;
        const { status } = req.body;
        const role = req.user!.role as Role;

        if (!canUpdateStatus(role, status)) {
            res.status(403).json({ error: "You don't have permission to set this status" }); return;
        }

        if (!isSupabaseConfigured()) {
            const resume = inMemoryResumes.get(resumeId);
            if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }

            if (role === "staff" && resume.assignedStaffId !== req.user!.id) {
                res.status(403).json({ error: "You can only review resumes assigned to you" }); return;
            }
            if (role === "student" && resume.studentId !== req.user!.id) {
                res.status(403).json({ error: "You can only modify your own resumes" }); return;
            }

            resume.status = status;
            resume.updatedAt = new Date().toISOString();
            inMemoryResumes.set(resumeId, resume);

            const statusLabel = status === "approved" ? "Approved" : status === "changes_required" ? "Changes Requested" : status;
            createNotification(resume.studentId, "status_change", `Resume ${statusLabel}`,
                `Your resume has been ${statusLabel.toLowerCase()}.`, resumeId);

            res.json(resume);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("resumes").update({ status }).eq("resume_id", resumeId).select().single();
        if (error) throw error;
        res.json(mapResumeFromDb(data));
    } catch (error) {
        console.error("PATCH /api/resumes/:resumeId/status error:", error);
        res.status(500).json({ error: "Failed to update status" });
    }
});

/**
 * PATCH /:resumeId/assign
 * Admin: reassign staff.
 */
router.patch("/:resumeId/assign", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;
        const { staffId } = req.body;
        if (!staffId) { res.status(400).json({ error: "staffId is required" }); return; }

        if (!isSupabaseConfigured()) {
            const resume = inMemoryResumes.get(resumeId);
            if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }
            resume.assignedStaffId = staffId;
            resume.updatedAt = new Date().toISOString();
            inMemoryResumes.set(resumeId, resume);

            createNotification(staffId, "new_assignment", "Resume Reassigned to You",
                `An admin has assigned a resume to you for review.`, resumeId);

            res.json(resume);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("resumes").update({ assigned_staff_id: staffId })
            .eq("resume_id", resumeId).select().single();
        if (error) throw error;
        res.json(mapResumeFromDb(data));
    } catch (error) {
        console.error("PATCH /api/resumes/:resumeId/assign error:", error);
        res.status(500).json({ error: "Failed to reassign resume" });
    }
});


// ============================================================
// File Upload & Versions
// ============================================================

/**
 * POST /:resumeId/upload
 */
router.post("/:resumeId/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;
        const file = req.file;
        if (!file) { res.status(400).json({ error: "No file provided" }); return; }

        const userId = req.user!.id;
        const versionId = `ver-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        if (!isSupabaseConfigured()) {
            const resume = inMemoryResumes.get(resumeId);
            if (!resume) { cleanupTempFile(file.path); res.status(404).json({ error: "Resume not found" }); return; }

            const existingVersions = inMemoryVersions.filter((v) => v.resumeId === resumeId);
            const versionNumber = existingVersions.length + 1;
            const storagePath = await uploadFile(userId, resumeId, versionId, file.path, file.originalname);

            const version: InMemoryVersion = {
                versionId, resumeId, filePath: storagePath,
                originalFilename: file.originalname, fileSizeBytes: file.size,
                versionNumber, submittedAt: new Date().toISOString(),
            };
            inMemoryVersions.push(version);
            resume.currentVersionId = versionId;
            resume.updatedAt = new Date().toISOString();
            inMemoryResumes.set(resumeId, resume);

            cleanupTempFile(file.path);
            res.status(201).json(version);
            return;
        }

        const { data: resume, error: getError } = await supabaseAdmin
            .from("resumes").select("*").eq("resume_id", resumeId).single();
        if (getError || !resume) { cleanupTempFile(file.path); res.status(404).json({ error: "Resume not found" }); return; }

        const { count: versionCount } = await supabaseAdmin
            .from("resume_versions").select("*", { count: "exact", head: true }).eq("resume_id", resumeId);
        const versionNumber = (versionCount || 0) + 1;
        const storagePath = await uploadFile(userId, resumeId, versionId, file.path, file.originalname);

        const { data: versionData, error: versionError } = await supabaseAdmin
            .from("resume_versions").insert({
                version_id: versionId, resume_id: resumeId, file_path: storagePath,
                original_filename: file.originalname, file_size_bytes: file.size, version_number: versionNumber,
            }).select().single();
        if (versionError) throw versionError;

        await supabaseAdmin.from("resumes").update({ current_version_id: versionId }).eq("resume_id", resumeId);

        cleanupTempFile(file.path);
        res.status(201).json(mapVersionFromDb(versionData));
    } catch (error) {
        if (req.file) cleanupTempFile(req.file.path);
        console.error("POST /api/resumes/:resumeId/upload error:", error);
        res.status(500).json({ error: "Failed to upload file" });
    }
});

/**
 * GET /:resumeId/versions
 */
router.get("/:resumeId/versions", requireAuth, async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;
        if (!isSupabaseConfigured()) {
            const versions = inMemoryVersions
                .filter((v) => v.resumeId === resumeId)
                .sort((a, b) => b.versionNumber - a.versionNumber);
            res.json(versions);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("resume_versions").select("*").eq("resume_id", resumeId)
            .order("version_number", { ascending: false });
        if (error) throw error;
        res.json((data || []).map(mapVersionFromDb));
    } catch (error) {
        console.error("GET /api/resumes/:resumeId/versions error:", error);
        res.status(500).json({ error: "Failed to fetch versions" });
    }
});

/**
 * GET /:resumeId/versions/:versionId/download
 */
router.get("/:resumeId/versions/:versionId/download", requireAuth, async (req: Request, res: Response) => {
    try {
        const { resumeId, versionId } = req.params;
        if (!isSupabaseConfigured()) {
            const version = inMemoryVersions.find(
                (v) => v.resumeId === resumeId && v.versionId === versionId
            );
            if (!version) { res.status(404).json({ error: "Version not found" }); return; }
            const localPath = getLocalFilePath(version.filePath);
            if (fs.existsSync(localPath)) {
                res.download(localPath, version.originalFilename);
            } else {
                res.status(404).json({ error: "File not found on disk" });
            }
            return;
        }

        const { data: version, error } = await supabaseAdmin
            .from("resume_versions").select("file_path, original_filename")
            .eq("version_id", versionId).eq("resume_id", resumeId).single();
        if (error || !version) { res.status(404).json({ error: "Version not found" }); return; }
        const url = await getFileUrl(version.file_path);
        res.json({ downloadUrl: url, filename: version.original_filename });
    } catch (error) {
        console.error("GET download error:", error);
        res.status(500).json({ error: "Failed to get download URL" });
    }
});


// ============================================================
// Feedback
// ============================================================

/**
 * GET /:resumeId/feedback
 */
router.get("/:resumeId/feedback", requireAuth, async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;
        if (!isSupabaseConfigured()) {
            const feedback = inMemoryFeedback
                .filter((f) => f.resumeId === resumeId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            res.json(feedback);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("feedback")
            .select(`feedback_id, resume_id, version_id, staff_id, content, created_at,
        staff:users!feedback_staff_id_fkey(full_name)`)
            .eq("resume_id", resumeId)
            .order("created_at", { ascending: false });
        if (error) throw error;

        const mapped = (data || []).map((f: any) => ({
            feedbackId: f.feedback_id, resumeId: f.resume_id, versionId: f.version_id,
            staffId: f.staff_id, staffName: f.staff?.full_name || "Unknown",
            content: f.content, createdAt: f.created_at,
        }));
        res.json(mapped);
    } catch (error) {
        console.error("GET /api/resumes/:resumeId/feedback error:", error);
        res.status(500).json({ error: "Failed to fetch feedback" });
    }
});

/**
 * POST /:resumeId/feedback
 */
router.post("/:resumeId/feedback", requireAuth, requireRole("staff", "admin"), async (req: Request, res: Response) => {
    try {
        const { resumeId } = req.params;
        const { content, versionId } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({ error: "Feedback content is required" }); return;
        }

        if (!isSupabaseConfigured()) {
            const feedback: InMemoryFeedback = {
                feedbackId: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                resumeId, versionId, staffId: req.user!.id, staffName: req.user!.fullName,
                content: content.trim(), createdAt: new Date().toISOString(),
            };
            inMemoryFeedback.push(feedback);

            const resume = inMemoryResumes.get(resumeId);
            if (resume) {
                createNotification(resume.studentId, "new_feedback", "New Feedback Received",
                    `${req.user!.fullName} left feedback on your resume.`, resumeId);
            }

            res.status(201).json(feedback);
            return;
        }

        const { data, error } = await supabaseAdmin
            .from("feedback").insert({
                resume_id: resumeId, version_id: versionId || null,
                staff_id: req.user!.id, content: content.trim(),
            }).select().single();
        if (error) throw error;

        res.status(201).json({
            feedbackId: data.feedback_id, resumeId: data.resume_id,
            versionId: data.version_id, staffId: data.staff_id,
            staffName: req.user!.fullName, content: data.content, createdAt: data.created_at,
        });
    } catch (error) {
        console.error("POST /api/resumes/:resumeId/feedback error:", error);
        res.status(500).json({ error: "Failed to add feedback" });
    }
});

/**
 * Serve locally stored files in demo mode
 */
router.get("/files/:filePath(*)", requireAuth, (req: Request, res: Response) => {
    const filePath = decodeURIComponent(req.params.filePath);
    const localPath = getLocalFilePath(filePath);
    if (fs.existsSync(localPath)) {
        res.sendFile(localPath);
    } else {
        res.status(404).json({ error: "File not found" });
    }
});

export default router;
