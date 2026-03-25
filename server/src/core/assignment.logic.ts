export function assignStaff(
  staffIds: string[],
  currentAssignments: Record<string, number>
): string {
  if (staffIds.length === 0) {
    throw new Error("No staff available for assignment");
  }

  return staffIds.reduce((leastLoaded, staffId) => {
    return currentAssignments[staffId] <
      (currentAssignments[leastLoaded] ?? Infinity)
      ? staffId
      : leastLoaded;
  }, staffIds[0]);
}
