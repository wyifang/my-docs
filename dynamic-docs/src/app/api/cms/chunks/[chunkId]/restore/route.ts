import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { canRestoreRevision } from "@/lib/revision-diff";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { restoreRevisionSchema } from "@/lib/schemas";
import { serializeRevision } from "@/lib/content";

type RouteContext = { params: Promise<{ chunkId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN", "AUTHOR")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: user ? 403 : 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  const parsed = restoreRevisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const { chunkId } = await context.params;
  const result = await db.$transaction(async (transaction) => {
    const chunk = await transaction.chunk.findUnique({
      where: { id: chunkId },
      include: {
        revisions: { orderBy: { revision: "desc" }, take: 1 },
        published: { select: { revisionId: true } },
      },
    });
    if (!chunk || (user.role !== "ADMIN" && chunk.createdBy !== user.id)) {
      return { error: "NOT_FOUND", status: 404 as const };
    }

    const latest = chunk.revisions[0];
    if (!latest || !canRestoreRevision({
      role: user.role,
      ownsChunk: chunk.createdBy === user.id,
      latestStatus: latest.reviewStatus,
      latestIsPublished: chunk.published?.revisionId === latest.id,
    })) {
      return { error: "REVISION_LOCKED_DURING_REVIEW_OR_APPROVAL", status: 409 as const };
    }

    const source = await transaction.chunkRevision.findFirst({
      where: { id: parsed.data.sourceRevisionId, chunkId },
    });
    if (!source) return { error: "NOT_FOUND", status: 404 as const };
    if (source.id === latest.id) {
      return { error: "SOURCE_IS_CURRENT_REVISION", status: 409 as const };
    }

    const newRevision = await transaction.chunkRevision.create({
      data: {
        chunkId,
        revision: latest.revision + 1,
        title: source.title,
        contentType: source.contentType,
        language: source.language,
        product: source.product,
        apiVersion: source.apiVersion,
        accessPolicy: source.accessPolicy,
        allowedOrganizationIds: source.allowedOrganizationIds,
        tags: source.tags,
        allowedAgentScope: source.allowedAgentScope,
        lastVerified: source.lastVerified,
        deprecationStatus: source.deprecationStatus,
        bodyJson: source.bodyJson,
        reviewStatus: "DRAFT",
        createdBy: user.id,
        restoredFromRevisionId: source.id,
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "CHUNK_REVISION_RESTORED",
        targetType: "CHUNK_REVISION",
        targetId: newRevision.id,
        detailsJson: JSON.stringify({
          chunkId,
          restoredFromRevisionId: source.id,
          revision: newRevision.revision,
        }),
      },
    });
    return { revision: newRevision };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ revision: serializeRevision(result.revision) }, { status: 201 });
}
