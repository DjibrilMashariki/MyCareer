/**
 * Shared in-memory data store for demo mode.
 * All route modules import from here to ensure a single source of truth.
 */

export interface InMemoryResume {
    resumeId: string;
    studentId: string;
    status: "draft" | "submitted" | "changes_required" | "approved";
    assignedStaffId?: string;
    currentVersionId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface InMemoryVersion {
    versionId: string;
    resumeId: string;
    filePath: string;
    originalFilename: string;
    fileSizeBytes: number;
    versionNumber: number;
    submittedAt: string;
}

export interface InMemoryFeedback {
    feedbackId: string;
    resumeId: string;
    versionId?: string;
    staffId: string;
    staffName?: string;
    content: string;
    createdAt: string;
}

export interface InMemoryAnnotation {
    id: string;
    resumeId: string;
    versionId?: string;
    staffId: string;
    staffName?: string;
    pageNumber: number;
    xPosition: number;
    yPosition: number;
    content: string;
    createdAt: string;
}

export interface InMemoryTemplate {
    id: string;
    name: string;
    description: string;
    filePath: string;
    originalFilename: string;
    fileSizeBytes: number;
    uploadedBy: string;
    createdAt: string;
}

// Shared stores
export const inMemoryResumes = new Map<string, InMemoryResume>();
export const inMemoryVersions: InMemoryVersion[] = [];
export const inMemoryFeedback: InMemoryFeedback[] = [];
export const inMemoryAnnotations: InMemoryAnnotation[] = [];
export const inMemoryTemplates: InMemoryTemplate[] = [];

// Demo staff
export const demoStaffIds = ["staff_1", "staff_2", "staff_3"];
export const demoStaffNames: Record<string, string> = {
    staff_1: "Dr. Smith",
    staff_2: "Prof. Johnson",
    staff_3: "Ms. Williams",
};

// DB → camelCase mappers
export function mapResumeFromDb(row: any) {
    return {
        resumeId: row.resume_id,
        studentId: row.student_id,
        status: row.status,
        assignedStaffId: row.assigned_staff_id,
        currentVersionId: row.current_version_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapVersionFromDb(row: any) {
    return {
        versionId: row.version_id,
        resumeId: row.resume_id,
        filePath: row.file_path,
        originalFilename: row.original_filename,
        fileSizeBytes: row.file_size_bytes,
        versionNumber: row.version_number,
        submittedAt: row.submitted_at,
    };
}

// Seed demo data
export function seedDemoData() {
    const demoResumes: InMemoryResume[] = [
        {
            resumeId: "res-001-abc",
            studentId: "demo-student-1",
            status: "approved",
            assignedStaffId: "staff_1",
            createdAt: "2024-01-15T00:00:00Z",
            updatedAt: "2024-01-20T00:00:00Z",
        },
        {
            resumeId: "res-002-def",
            studentId: "demo-student-2",
            status: "submitted",
            assignedStaffId: "staff_2",
            createdAt: "2024-01-18T00:00:00Z",
            updatedAt: "2024-01-18T00:00:00Z",
        },
        {
            resumeId: "res-003-ghi",
            studentId: "demo-student-1",
            status: "changes_required",
            assignedStaffId: "staff_1",
            createdAt: "2024-01-19T00:00:00Z",
            updatedAt: "2024-01-21T00:00:00Z",
        },
        {
            resumeId: "res-004-jkl",
            studentId: "demo-student-3",
            status: "draft",
            createdAt: "2024-01-22T00:00:00Z",
            updatedAt: "2024-01-22T00:00:00Z",
        },
        {
            resumeId: "res-005-mno",
            studentId: "demo-student-2",
            status: "submitted",
            assignedStaffId: "staff_3",
            createdAt: "2024-01-23T00:00:00Z",
            updatedAt: "2024-01-23T00:00:00Z",
        },
        {
            resumeId: "res-006-pqr",
            studentId: "demo-student-3",
            status: "approved",
            assignedStaffId: "staff_2",
            createdAt: "2024-01-10T00:00:00Z",
            updatedAt: "2024-01-14T00:00:00Z",
        },
    ];
    demoResumes.forEach((r) => inMemoryResumes.set(r.resumeId, r));
}
