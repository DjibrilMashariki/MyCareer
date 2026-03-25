import { Resume, ResumeStatus } from "../core/resume.model";
import { assignStaff } from "../core/assignment.logic";

export function submitResume(
  resume: Resume,
  staffIds: string[],
  staffLoad: Record<string, number>
): Resume {
  if (resume.status !== "draft") {
    throw new Error("Only drafts can be submitted");
  }

  const assignedStaffId = assignStaff(staffIds, staffLoad);

  return {
    ...resume,
    status: "submitted",
    assignedStaffId,
    updatedAt: new Date(),
  };
}

export function updateStatus(
  resume: Resume,
  newStatus: ResumeStatus
): Resume {
  return {
    ...resume,
    status: newStatus,
    updatedAt: new Date(),
  };
}
