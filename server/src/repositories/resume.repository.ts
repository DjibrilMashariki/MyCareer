import { supabase } from "../lib/supabase.client";
import { Resume } from "../core/resume.model";

export async function getResumeById(resumeId: string): Promise<Resume> {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("resume_id", resumeId)
    .single();

  if (error) throw error;
  return data as Resume;
}

export async function updateResume(resume: Resume): Promise<void> {
  const { error } = await supabase
    .from("resumes")
    .update({
      status: resume.status,
      assigned_staff_id: resume.assignedStaffId,
      updated_at: new Date(),
    })
    .eq("resume_id", resume.resumeId);

  if (error) throw error;
}
