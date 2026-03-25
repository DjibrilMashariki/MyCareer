export type ResumeStatus = "draft" | "submitted" | "changes_required" | "approved";

export interface Resume {
  resumeId: string;
  studentId: string;
  status: ResumeStatus;
  assignedStaffId?: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data - in a real app this would come from a database
const initialResumes: Resume[] = [
  {
    resumeId: "res-001-abc",
    studentId: "STU001",
    status: "approved",
    assignedStaffId: "staff_1",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20"
  },
  {
    resumeId: "res-002-def",
    studentId: "STU002",
    status: "submitted",
    assignedStaffId: "staff_2",
    createdAt: "2024-01-18",
    updatedAt: "2024-01-18"
  },
  {
    resumeId: "res-003-ghi",
    studentId: "STU003",
    status: "changes_required",
    assignedStaffId: "staff_1",
    createdAt: "2024-01-19",
    updatedAt: "2024-01-21"
  },
  {
    resumeId: "res-004-jkl",
    studentId: "STU001",
    status: "draft",
    createdAt: "2024-01-22",
    updatedAt: "2024-01-22"
  },
  {
    resumeId: "res-005-mno",
    studentId: "STU004",
    status: "submitted",
    assignedStaffId: "staff_3",
    createdAt: "2024-01-23",
    updatedAt: "2024-01-23"
  },
  {
    resumeId: "res-006-pqr",
    studentId: "STU005",
    status: "approved",
    assignedStaffId: "staff_2",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-14"
  }
];

// Using localStorage for persistence
const STORAGE_KEY = "mycareer_resumes";

export function getResumes(): Resume[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with mock data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialResumes));
  return initialResumes;
}

export function saveResumes(resumes: Resume[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

export function addResume(studentId: string): Resume {
  const resumes = getResumes();
  const newResume: Resume = {
    resumeId: `res-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
    studentId,
    status: "draft",
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0]
  };
  resumes.push(newResume);
  saveResumes(resumes);
  return newResume;
}

export function updateResumeStatus(
  resumeId: string,
  status: ResumeStatus,
  assignedStaffId?: string
): Resume | null {
  const resumes = getResumes();
  const index = resumes.findIndex(r => r.resumeId === resumeId);
  if (index === -1) return null;

  resumes[index] = {
    ...resumes[index],
    status,
    assignedStaffId: assignedStaffId || resumes[index].assignedStaffId,
    updatedAt: new Date().toISOString().split("T")[0]
  };
  saveResumes(resumes);
  return resumes[index];
}

export function getResumesByStudent(studentId: string): Resume[] {
  return getResumes().filter(r => r.studentId.toLowerCase() === studentId.toLowerCase());
}

export function getResumesByStaff(staffId: string): Resume[] {
  return getResumes().filter(r => r.assignedStaffId === staffId);
}

export function getStats() {
  const resumes = getResumes();
  return {
    total: resumes.length,
    draft: resumes.filter(r => r.status === "draft").length,
    submitted: resumes.filter(r => r.status === "submitted").length,
    changesRequired: resumes.filter(r => r.status === "changes_required").length,
    approved: resumes.filter(r => r.status === "approved").length
  };
}

export function getStaffWorkload() {
  const resumes = getResumes();
  const staffIds = ["staff_1", "staff_2", "staff_3"];
  return staffIds.map(id => ({
    staffId: id,
    assigned: resumes.filter(r => r.assignedStaffId === id).length,
    pending: resumes.filter(r => r.assignedStaffId === id && r.status === "submitted").length
  }));
}
