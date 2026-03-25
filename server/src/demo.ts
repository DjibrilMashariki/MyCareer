import { Resume } from "./core/resume.model";
import { submitResume, updateStatus } from "./services/resume.service";
import { canUpdateStatus } from "./core/permissions.rules";
import { getAllMockResumes, resetMockDatabase } from "./mock/supabase.mock";

// Demo configuration
const students = ["alice", "bob", "charlie", "diana"];
const staffMembers = ["staff_1", "staff_2", "staff_3"];

// Track staff workload
const staffLoad: Record<string, number> = {
  staff_1: 2,
  staff_2: 1,
  staff_3: 3,
};

console.log("=".repeat(60));
console.log("MyCareer Resume Platform - Demo");
console.log("AUN Career Center Resume Review System");
console.log("=".repeat(60));
console.log();

// Reset database
resetMockDatabase();

// Helper to print resume status
function printResume(resume: Resume, label: string) {
  console.log(`\n${label}:`);
  console.log(`  Resume ID: ${resume.resumeId}`);
  console.log(`  Student: ${resume.studentId}`);
  console.log(`  Status: ${resume.status}`);
  console.log(`  Assigned Staff: ${resume.assignedStaffId || "Not assigned"}`);
  console.log(`  Updated: ${resume.updatedAt.toISOString()}`);
}

// Helper to print staff workload
function printStaffWorkload() {
  console.log("\n📊 Current Staff Workload:");
  Object.entries(staffLoad).forEach(([staffId, count]) => {
    console.log(`  ${staffId}: ${count} resumes`);
  });
}

console.log("Initial Setup:");
console.log(`  Students: ${students.join(", ")}`);
console.log(`  Staff: ${staffMembers.join(", ")}`);
printStaffWorkload();

console.log("\n" + "=".repeat(60));
console.log("SCENARIO 1: Student submits a resume");
console.log("=".repeat(60));

// Create a draft resume
let aliceResume: Resume = {
  resumeId: "resume_001",
  studentId: "alice",
  status: "draft",
  createdAt: new Date(),
  updatedAt: new Date(),
};

printResume(aliceResume, "1. Alice creates a draft resume");

// Student submits the resume
try {
  aliceResume = submitResume(aliceResume, staffMembers, staffLoad);
  staffLoad[aliceResume.assignedStaffId!] += 1;
  printResume(aliceResume, "2. Alice submits the resume");
  console.log(`   ✅ Auto-assigned to ${aliceResume.assignedStaffId} (least loaded)`);
  printStaffWorkload();
} catch (error) {
  console.log(`   ❌ Error: ${(error as Error).message}`);
}

console.log("\n" + "=".repeat(60));
console.log("SCENARIO 2: Staff reviews and requests changes");
console.log("=".repeat(60));

// Check permissions
const staffCanUpdate = canUpdateStatus("staff", "submitted");
console.log(`\nStaff permission check: ${staffCanUpdate ? "✅ Allowed" : "❌ Denied"}`);

if (staffCanUpdate) {
  aliceResume = updateStatus(aliceResume, "changes_required");
  printResume(aliceResume, "3. Staff requests changes");
}

console.log("\n" + "=".repeat(60));
console.log("SCENARIO 3: Student cannot change status back to draft");
console.log("=".repeat(60));

const studentCanRevert = canUpdateStatus("student", "changes_required");
console.log(`\nStudent permission check: ${studentCanRevert ? "✅ Allowed" : "❌ Denied"}`);
console.log("  Students can only create drafts and submit, not change review status");

console.log("\n" + "=".repeat(60));
console.log("SCENARIO 4: Multiple resume submissions");
console.log("=".repeat(60));

// Bob submits a resume
let bobResume: Resume = {
  resumeId: "resume_002",
  studentId: "bob",
  status: "draft",
  createdAt: new Date(),
  updatedAt: new Date(),
};

bobResume = submitResume(bobResume, staffMembers, staffLoad);
staffLoad[bobResume.assignedStaffId!] += 1;
printResume(bobResume, "4. Bob submits a resume");
console.log(`   ✅ Auto-assigned to ${bobResume.assignedStaffId} (least loaded)`);

// Charlie submits a resume
let charlieResume: Resume = {
  resumeId: "resume_003",
  studentId: "charlie",
  status: "draft",
  createdAt: new Date(),
  updatedAt: new Date(),
};

charlieResume = submitResume(charlieResume, staffMembers, staffLoad);
staffLoad[charlieResume.assignedStaffId!] += 1;
printResume(charlieResume, "5. Charlie submits a resume");
console.log(`   ✅ Auto-assigned to ${charlieResume.assignedStaffId} (least loaded)`);

printStaffWorkload();
console.log("\n  Notice: Work is distributed fairly using 'least-loaded' algorithm");

console.log("\n" + "=".repeat(60));
console.log("SCENARIO 5: Staff approves Bob's resume");
console.log("=".repeat(60));

bobResume = updateStatus(bobResume, "approved");
printResume(bobResume, "6. Staff approves Bob's resume");
console.log("   ✅ Bob's resume is complete!");

console.log("\n" + "=".repeat(60));
console.log("SCENARIO 6: Admin override");
console.log("=".repeat(60));

const adminCanUpdate = canUpdateStatus("admin", "approved");
console.log(`\nAdmin permission check: ${adminCanUpdate ? "✅ Allowed" : "❌ Denied"}`);
console.log("  Admins can perform any operation on any resume");

console.log("\n" + "=".repeat(60));
console.log("FINAL STATE SUMMARY");
console.log("=".repeat(60));

console.log("\n📋 All Resumes:");
const allResumes = [aliceResume, bobResume, charlieResume];
allResumes.forEach((resume, index) => {
  console.log(`\n  ${index + 1}. ${resume.studentId}'s Resume (${resume.resumeId})`);
  console.log(`     Status: ${resume.status}`);
  console.log(`     Assigned to: ${resume.assignedStaffId}`);
});

printStaffWorkload();

console.log("\n" + "=".repeat(60));
console.log("Key Features Demonstrated:");
console.log("=".repeat(60));
console.log("  ✅ Resume state transitions (draft → submitted → changes_required/approved)");
console.log("  ✅ Automatic staff assignment using 'least-loaded' algorithm");
console.log("  ✅ Role-based permissions (student, staff, admin)");
console.log("  ✅ Fair workload distribution across staff members");
console.log("  ✅ Business logic validation and error handling");
console.log("\n");
