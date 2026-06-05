import { Resume, ResumeStatus } from "./resumeData";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

// API Error handling
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("mycareer_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, error.error || response.statusText);
  }

  return response.json();
}

// Resume API calls

export async function getAllResumes(): Promise<Resume[]> {
  return fetchApi<Resume[]>("/resumes");
}

export async function getResumesByStudent(studentId?: string): Promise<Resume[]> {
  if (studentId) {
    return fetchApi<Resume[]>(`/resumes/student/${studentId}`);
  }
  return fetchApi<Resume[]>("/resumes");
}

export async function getResumesByStaff(staffId?: string): Promise<Resume[]> {
  if (staffId) {
    return fetchApi<Resume[]>(`/resumes/staff/${staffId}`);
  }
  return fetchApi<Resume[]>("/resumes");
}

export async function createDraftResume(studentId?: string): Promise<Resume> {
  return fetchApi<Resume>("/resumes", {
    method: "POST",
    body: JSON.stringify({ studentId }),
  });
}

export async function submitResumeForReview(resumeId: string): Promise<Resume> {
  return fetchApi<Resume>(`/resumes/${resumeId}/submit`, {
    method: "POST",
  });
}

export async function updateResumeStatus(
  resumeId: string,
  status: ResumeStatus,
  role?: "student" | "staff" | "admin"
): Promise<Resume> {
  return fetchApi<Resume>(`/resumes/${resumeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, role }),
  });
}

export async function reassignStaff(
  resumeId: string,
  staffId: string
): Promise<Resume> {
  return fetchApi<Resume>(`/resumes/${resumeId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ staffId }),
  });
}

export async function getStaffWorkload(): Promise<Record<string, number>> {
  return fetchApi<Record<string, number>>("/staff/workload");
}

// File handling

export async function uploadResumeFile(
  resumeId: string,
  file: File
): Promise<any> {
  const token = localStorage.getItem("mycareer_token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new ApiError(response.status, error.error || "Upload failed");
  }

  return response.json();
}

export async function getResumeVersions(resumeId: string): Promise<any[]> {
  return fetchApi<any[]>(`/resumes/${resumeId}/versions`);
}

export async function getDownloadUrl(
  resumeId: string,
  versionId: string
): Promise<{ downloadUrl: string; filename: string }> {
  return fetchApi(`/resumes/${resumeId}/versions/${versionId}/download`);
}

// Feedback

export async function getResumeFeedback(resumeId: string): Promise<any[]> {
  return fetchApi<any[]>(`/resumes/${resumeId}/feedback`);
}

export async function addFeedback(
  resumeId: string,
  content: string,
  versionId?: string
): Promise<any> {
  return fetchApi(`/resumes/${resumeId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ content, versionId }),
  });
}

// Statistics helper
export async function getStats() {
  return fetchApi<{
    total: number;
    draft: number;
    submitted: number;
    changesRequired: number;
    approved: number;
  }>("/stats");
}

// Annotations API

export async function getAnnotations(resumeId: string): Promise<any[]> {
  return fetchApi<any[]>(`/resumes/${resumeId}/annotations`);
}

export async function createAnnotation(
  resumeId: string,
  data: { versionId?: string; pageNumber: number; xPosition: number; yPosition: number; content: string }
): Promise<any> {
  return fetchApi<any>(`/resumes/${resumeId}/annotations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAnnotation(resumeId: string, annotationId: string): Promise<void> {
  return fetchApi<void>(`/resumes/${resumeId}/annotations/${annotationId}`, { method: "DELETE" });
}

// Templates API

export async function getTemplates(): Promise<any[]> {
  return fetchApi<any[]>("/templates");
}

export async function uploadTemplate(name: string, description: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("description", description);
  const response = await fetch(`${API_BASE_URL}/templates`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, error.error || response.statusText);
  }
  return response.json();
}

export async function downloadTemplate(templateId: string): Promise<string> {
  // In demo mode this triggers a file download, in production returns a URL
  return `${API_BASE_URL}/templates/${templateId}/download`;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  return fetchApi<void>(`/templates/${templateId}`, { method: "DELETE" });
}

// Analytics API

export async function getAnalytics(): Promise<{
  totalResumes: number;
  avgProcessingHours: number;
  approvalRate: number;
  monthlyVolumes: Record<string, number>;
  statusDistribution: Record<string, number>;
  staffPerformance: Record<string, { assigned: number; approved: number }>;
}> {
  return fetchApi("/analytics");
}

export { ApiError };
