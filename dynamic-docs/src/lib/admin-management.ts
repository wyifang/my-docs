export function canDeactivateOrDemoteAdmin(input: {
  activeAdminCount: number;
  targetIsActiveAdmin: boolean;
  nextRole: string;
  nextActive: boolean;
}): boolean {
  if (!input.targetIsActiveAdmin) return true;
  if (input.nextRole === "ADMIN" && input.nextActive) return true;
  return input.activeAdminCount > 1;
}
