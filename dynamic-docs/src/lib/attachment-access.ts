import type { CurrentUser } from "@/lib/auth";
import { canAccessPublishedRevision } from "@/lib/content";

type RevisionAccess = {
  reviewerId: string | null;
  reviewStatus: string;
  accessPolicy: string;
  allowedOrganizationIds: string;
  product: string;
  apiVersion: string;
  language: string;
};

type PublishedRevision = Omit<RevisionAccess, "reviewerId" | "reviewStatus"> & {
  bodyJson: string;
};

function referencesAttachment(value: unknown, attachmentId: string): boolean {
  if (value === attachmentId) return true;
  if (Array.isArray(value)) return value.some((entry) => referencesAttachment(entry, attachmentId));
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((entry) => referencesAttachment(entry, attachmentId));
  }
  return false;
}

export function getAttachmentAccess(input: {
  attachmentId: string;
  uploadedById: string;
  publishedRevision: PublishedRevision | null;
  revisions: RevisionAccess[];
  user: CurrentUser | null;
  filters: { product?: string; apiVersion?: string; language?: string };
}) {
  const publishedBody = input.publishedRevision
    ? JSON.parse(input.publishedRevision.bodyJson) as unknown
    : null;
  const publishedAccess =
    input.publishedRevision !== null &&
    referencesAttachment(publishedBody, input.attachmentId) &&
    canAccessPublishedRevision(input.publishedRevision, input.user, input.filters);
  const privateAccess =
    input.user !== null &&
    (input.user.role === "ADMIN" ||
      input.uploadedById === input.user.id ||
      input.revisions.some(
        (revision) => revision.reviewerId === input.user?.id && revision.reviewStatus === "IN_REVIEW",
      ) ||
      (input.user.role === "PUBLISHER" &&
        input.revisions.some(
          (revision) =>
            revision.reviewStatus === "APPROVED" &&
            canAccessPublishedRevision(revision, input.user, input.filters),
        )));

  return {
    allowed: publishedAccess || privateAccess,
    publishedAccess,
    isPublic: publishedAccess && input.publishedRevision?.accessPolicy === "PUBLIC",
  };
}
