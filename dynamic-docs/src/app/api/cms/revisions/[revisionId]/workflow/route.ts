import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { workflowSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ revisionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  const parsed = workflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const { revisionId } = await context.params;
  const revision = await db.chunkRevision.findUnique({ where: { id: revisionId } });
  if (!revision) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { action } = parsed.data;
  if (action === "submit") {
    if (!hasRole(user, "AUTHOR", "ADMIN") || (user.role !== "ADMIN" && revision.createdBy !== user.id)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(revision.reviewStatus)) {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }
    const reviewer = await db.user.findFirst({
      where: { role: "REVIEWER", active: true, id: { not: revision.createdBy } },
      orderBy: { createdAt: "asc" },
    });
    if (!reviewer) {
      return NextResponse.json({ error: "NO_REVIEWER_AVAILABLE" }, { status: 409 });
    }
    await db.$transaction([
      db.chunkRevision.update({
        where: { id: revisionId },
        data: { reviewStatus: "IN_REVIEW", reviewerId: reviewer.id, reviewComment: null },
      }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: "REVIEW_SUBMITTED",
          targetType: "CHUNK_REVISION",
          targetId: revisionId,
          detailsJson: JSON.stringify({ reviewerId: reviewer.id }),
        },
      }),
    ]);
    return NextResponse.json({ status: "IN_REVIEW", reviewer: reviewer.email });
  }

  if (action === "approve" || action === "request_changes") {
    if (
      !hasRole(user, "REVIEWER", "ADMIN") ||
      (user.role !== "ADMIN" && revision.reviewerId !== user.id) ||
      revision.createdBy === user.id
    ) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (revision.reviewStatus !== "IN_REVIEW") {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }
    const status = action === "approve" ? "APPROVED" : "CHANGES_REQUESTED";
    const comment = action === "request_changes" ? parsed.data.comment : null;
    await db.$transaction([
      db.chunkRevision.update({
        where: { id: revisionId },
        data: { reviewStatus: status, reviewComment: comment },
      }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: action === "approve" ? "REVIEW_APPROVED" : "CHANGES_REQUESTED",
          targetType: "CHUNK_REVISION",
          targetId: revisionId,
          detailsJson: JSON.stringify({ comment }),
        },
      }),
    ]);
    return NextResponse.json({ status });
  }

  if (action === "publish") {
    if (!hasRole(user, "ADMIN", "PUBLISHER")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (revision.reviewStatus !== "APPROVED") {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }
    await db.$transaction(async (transaction) => {
      await transaction.publishedChunk.upsert({
        where: { chunkId: revision.chunkId },
        create: {
          chunkId: revision.chunkId,
          revisionId,
          publishedBy: user.id,
        },
        update: {
          revisionId,
          publishedBy: user.id,
          publishedAt: new Date(),
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: user.id,
          action: "CHUNK_PUBLISHED",
          targetType: "CHUNK_REVISION",
          targetId: revisionId,
        },
      });
    });
    return NextResponse.json({ status: "PUBLISHED" });
  }

  if (!hasRole(user, "ADMIN", "PUBLISHER")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const publication = await db.publishedChunk.findUnique({
    where: { chunkId: revision.chunkId },
  });
  if (!publication || publication.revisionId !== revisionId) {
    return NextResponse.json({ error: "NOT_CURRENTLY_PUBLISHED" }, { status: 409 });
  }
  await db.$transaction([
    db.publishedChunk.delete({ where: { chunkId: revision.chunkId } }),
    db.auditEvent.create({
      data: {
        actorId: user.id,
        action: "CHUNK_WITHDRAWN",
        targetType: "CHUNK_REVISION",
        targetId: revisionId,
      },
    }),
  ]);
  return NextResponse.json({ status: "WITHDRAWN" });
}
