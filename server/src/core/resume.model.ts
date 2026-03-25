export type ResumeStatus =
  | "draft"
  | "submitted"
  | "changes_required"
  | "approved";

export interface Resume {
  resumeId: string;
  studentId: string;
  assignedStaffId?: string;
  currentVersionId?: string;
  status: ResumeStatus;
  createdAt: Date;
  updatedAt: Date;
}
