import { Resume } from "../core/resume.model";

// Mock database storage
const mockDatabase: { resumes: Resume[] } = {
  resumes: [],
};

// Mock Supabase client for demo purposes
export const mockSupabase = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        single: async () => {
          const resume = mockDatabase.resumes.find(
            (r) => r.resumeId === value
          );
          if (!resume) {
            return { data: null, error: new Error("Resume not found") };
          }
          return { data: resume, error: null };
        },
      }),
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          const newResume = {
            ...data,
            resumeId: data.resume_id || `resume_${Date.now()}`,
            studentId: data.student_id,
            assignedStaffId: data.assigned_staff_id,
            currentVersionId: data.current_version_id,
            status: data.status,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          };
          mockDatabase.resumes.push(newResume);
          return { data: newResume, error: null };
        },
      }),
    }),
    update: (updates: any) => ({
      eq: (column: string, value: string) => ({
        then: async (callback: any) => {
          const resume = mockDatabase.resumes.find(
            (r) => r.resumeId === value
          );
          if (resume) {
            if (updates.status) resume.status = updates.status;
            if (updates.assigned_staff_id)
              resume.assignedStaffId = updates.assigned_staff_id;
            resume.updatedAt = new Date();
          }
          return { error: null };
        },
      }),
    }),
  }),
};

// Helper to get all resumes for demo display
export function getAllMockResumes(): Resume[] {
  return mockDatabase.resumes;
}

// Helper to reset mock database
export function resetMockDatabase(): void {
  mockDatabase.resumes = [];
}
