export type Role = "student" | "staff" | "admin";

export function canUpdateStatus(
  role: Role,
  targetStatus: string
): boolean {
  if (role === "admin") return true;
  if (role === "staff" && targetStatus !== "draft") return true;
  return false;
}
