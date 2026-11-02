import { db } from "@/lib/db";
import type { ChunkDraftInput } from "@/lib/schemas";
import type { CurrentUser } from "@/lib/auth";
import { getReviewerVisibleRevisions } from "@/lib/revision-diff";
import { filterSearchCandidates } from "@/lib/search-filter";

type RevisionRow = {
  id: string;
  chunkId: string;
  revision: number;
  title: string;
  contentType: string;
  language: string;
  product: string;
  apiVersion: string;
  accessPolicy: string;
  allowedOrganizationIds: string;
  tags: string;
  allowedAgentScope: string;
  lastVerified: Date | null;
  deprecationStatus: string;
  bodyJson: string;
  reviewStatus: string;
  reviewComment: string | null;
  reviewer?: { name: string; email: string } | null;
  restoredFromRevision?: { revision: number } | null;
  createdAt: Date;
};

export function serializeRevision(revision: RevisionRow) {
  return {
    id: revision.id,
    chunkId: revision.chunkId,
    revision: revision.revision,
    title: revision.title,
    contentType: revision.contentType,
    language: revision.language,
    product: revision.product,
    apiVersion: revision.apiVersion,
    accessPolicy: revision.accessPolicy,
    allowedAgentScope: revision.allowedAgentScope.split(",").filter(Boolean),
    tags: JSON.parse(revision.tags) as string[],
    lastVerified: revision.lastVerified?.toISOString() ?? null,
    deprecationStatus: revision.deprecationStatus,
    body: JSON.parse(revision.bodyJson) as Record<string, unknown>,
    reviewStatus: revision.reviewStatus,
    reviewComment: revision.reviewComment,
    createdAt: revision.createdAt.toISOString(),
  };
}

function serializeCmsRevision(revision: RevisionRow) {
  return {
    ...serializeRevision(revision),
    allowedOrganizationIds: JSON.parse(revision.allowedOrganizationIds) as string[],
    reviewer: revision.reviewer ?? null,
    restoredFromRevision: revision.restoredFromRevision ?? null,
  };
}

export function revisionData(input: ChunkDraftInput) {
  return {
    title: input.title,
    contentType: input.contentType,
    language: input.language,
    product: input.product,
    apiVersion: input.apiVersion,
    accessPolicy: input.accessPolicy,
    allowedOrganizationIds: JSON.stringify(input.allowedOrganizationIds),
    tags: JSON.stringify(input.tags),
    allowedAgentScope: input.allowedAgentScope.join(","),
    lastVerified: input.lastVerified ? new Date(input.lastVerified) : null,
    deprecationStatus: input.deprecationStatus,
    bodyJson: JSON.stringify(input.body),
  };
}

export async function listCmsChunks(user: CurrentUser) {
  const chunks = await db.chunk.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : user.role === "AUTHOR"
          ? { createdBy: user.id }
          : user.role === "REVIEWER"
            ? { revisions: { some: { reviewerId: user.id, reviewStatus: "IN_REVIEW" } } }
            : user.role === "PUBLISHER"
              ? { revisions: { some: { reviewStatus: "APPROVED" } } }
              : { published: { is: { revision: { accessPolicy: "PUBLIC" } } } },
    include: {
      revisions: {
        orderBy: { revision: "desc" },
        take: 1,
        include: {
          reviewer: { select: { name: true, email: true } },
          restoredFromRevision: { select: { revision: true } },
        },
      },
      published: { include: { revision: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return chunks.map((chunk) => {
    const visibleRevision =
      user.role === "REVIEWER"
        ? chunk.revisions.find(
            (revision) => revision.reviewerId === user.id && revision.reviewStatus === "IN_REVIEW",
          )
        : user.role === "PUBLISHER"
          ? chunk.revisions.find((revision) => revision.reviewStatus === "APPROVED")
          : user.role === "VIEWER"
            ? chunk.published?.revision
            : chunk.revisions[0];
    return {
      id: chunk.id,
      latest: visibleRevision ? serializeCmsRevision(visibleRevision) : null,
      publishedRevision: chunk.published?.revision.revision ?? null,
    };
  });
}

export async function getCmsChunk(chunkId: string, user: CurrentUser) {
  const chunk = await db.chunk.findUnique({
    where: { id: chunkId },
    include: {
      revisions: {
        orderBy: { revision: "desc" },
        include: {
          reviewer: { select: { name: true, email: true } },
          restoredFromRevision: { select: { revision: true } },
        },
      },
      published: { include: { revision: true } },
    },
  });
  if (!chunk) return null;

  const visibleRevisions =
    user.role === "ADMIN"
      ? chunk.revisions
      : user.role === "AUTHOR"
        ? chunk.createdBy === user.id
          ? chunk.revisions
          : []
        : user.role === "REVIEWER"
            ? getReviewerVisibleRevisions(chunk.revisions, user.id, chunk.published?.revisionId ?? null)
          : user.role === "PUBLISHER"
            ? chunk.revisions.filter((revision) => revision.reviewStatus === "APPROVED")
            : [];
  if (visibleRevisions.length === 0) return null;
  const translations = chunk.languageGroupId
    ? await db.chunk.findMany({
        where: { languageGroupId: chunk.languageGroupId, id: { not: chunkId } },
        include: {
          revisions: {
            orderBy: { revision: "desc" },
            take: 1,
            select: { revision: true, title: true, language: true, reviewStatus: true },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return {
    id: chunk.id,
    revisions: visibleRevisions.map(serializeCmsRevision),
    publishedRevision: chunk.published?.revision.revision ?? null,
    translations: translations.flatMap((translation) => {
      const current = translation.revisions[0];
      return current
        ? [{
            id: translation.id,
            title: current.title,
            language: current.language,
            revision: current.revision,
            status: current.reviewStatus,
          }]
        : [];
    }),
  };
}

export async function listPublicChunks(filters: {
  language?: string;
  product?: string;
  apiVersion?: string;
}) {
  const chunks = await db.publishedChunk.findMany({
    where: {
      revision: {
        accessPolicy: "PUBLIC",
        ...(filters.language ? { language: filters.language } : {}),
        ...(filters.product ? { product: filters.product } : {}),
        ...(filters.apiVersion ? { apiVersion: filters.apiVersion } : {}),
      },
    },
    include: { revision: true },
    orderBy: { revision: { title: "asc" } },
  });

  return chunks.map(({ revision }) => serializeRevision(revision));
}

export function canAccessPublishedRevision(
  revision: {
    accessPolicy: string;
    product: string;
    apiVersion: string;
    language: string;
    allowedOrganizationIds: string;
  },
  user: CurrentUser | null,
  filters: { product?: string; apiVersion?: string; language?: string },
): boolean {
  if (filters.product && revision.product !== filters.product) return false;
  if (filters.apiVersion && revision.apiVersion !== filters.apiVersion) return false;
  if (filters.language && revision.language !== filters.language) return false;
  if (revision.accessPolicy === "PUBLIC") return true;
  if (!user || !filters.product || !filters.apiVersion || !filters.language) return false;
  if (revision.product !== filters.product || revision.apiVersion !== filters.apiVersion) return false;
  if (user.role === "ADMIN") return true;

  if (revision.accessPolicy === "INTERNAL") {
    return ["AUTHOR", "REVIEWER", "PUBLISHER"].includes(user.role);
  }
  if (revision.accessPolicy === "AUTHENTICATED" && user.organizationId) {
    const allowedOrganizations = JSON.parse(revision.allowedOrganizationIds) as string[];
    return allowedOrganizations.includes(user.organizationId);
  }
  return false;
}

export function allowsAgentScope(
  revision: { allowedAgentScope: string },
  scope: "search" | "read" | "cite",
): boolean {
  return revision.allowedAgentScope.split(",").includes(scope);
}

export async function searchPublishedChunks(input: {
  q: string;
  language?: string;
  product?: string;
  apiVersion?: string;
  page: number;
  user: CurrentUser | null;
  requiredAgentScope?: "search";
}) {
  const candidates = await db.publishedChunk.findMany({
    where: {
      revision: {
        ...(input.language ? { language: input.language } : {}),
        ...(input.product ? { product: input.product } : {}),
        ...(input.apiVersion ? { apiVersion: input.apiVersion } : {}),
      },
    },
    include: { revision: true },
    orderBy: { revision: { title: "asc" } },
  });

  const result = filterSearchCandidates({
    candidates,
    query: input.q,
    page: input.page,
    canAccess: ({ revision }) =>
      canAccessPublishedRevision(revision, input.user, input) &&
      (!input.requiredAgentScope ||
        allowsAgentScope(revision, input.requiredAgentScope)),
  });
  return {
    chunks: result.candidates.map(({ revision }) => serializeRevision(revision)),
    page: input.page,
    pageSize: result.pageSize,
    total: result.total,
  };
}

export async function getPublishedChunkForAgent(input: {
  chunkId: string;
  language?: string;
  product?: string;
  apiVersion?: string;
  user: CurrentUser;
  requiredAgentScope: "read";
}) {
  const publication = await db.publishedChunk.findUnique({
    where: { chunkId: input.chunkId },
    include: { revision: true },
  });
  if (
    !publication ||
    !canAccessPublishedRevision(publication.revision, input.user, input) ||
    !allowsAgentScope(publication.revision, input.requiredAgentScope)
  ) {
    return null;
  }
  return serializeRevision(publication.revision);
}
