export type RevisionChange = {
  path: string;
  before: unknown;
  after: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function compareRevisionValues(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): RevisionChange[] {
  const changes: RevisionChange[] = [];

  function compare(path: string, previous: unknown, current: unknown) {
    if (isRecord(previous) && isRecord(current)) {
      const keys = [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort();
      for (const key of keys) {
        compare(path ? `${path}.${key}` : key, previous[key], current[key]);
      }
      return;
    }

    if (JSON.stringify(previous) !== JSON.stringify(current)) {
      changes.push({ path, before: previous, after: current });
    }
  }

  compare("", before, after);
  return changes;
}

export function canRestoreRevision(input: {
  role: string;
  ownsChunk: boolean;
  latestStatus: string;
  latestIsPublished: boolean;
}): boolean {
  if (input.role !== "ADMIN" && (input.role !== "AUTHOR" || !input.ownsChunk)) return false;
  if (input.latestStatus === "IN_REVIEW") return false;
  if (input.latestStatus === "APPROVED" && !input.latestIsPublished) return false;
  return true;
}

export function getReviewerVisibleRevisions<T extends {
  id: string;
  reviewerId: string | null;
  reviewStatus: string;
}>(
  revisions: T[],
  reviewerId: string,
  publishedRevisionId: string | null,
): T[] {
  const hasAssignedReview = revisions.some(
    (revision) => revision.reviewerId === reviewerId && revision.reviewStatus === "IN_REVIEW",
  );
  if (!hasAssignedReview) return [];
  return revisions.filter(
    (revision) =>
      (revision.reviewerId === reviewerId && revision.reviewStatus === "IN_REVIEW") ||
      revision.id === publishedRevisionId,
  );
}
