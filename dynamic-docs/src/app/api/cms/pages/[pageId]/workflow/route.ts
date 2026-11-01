import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { workflowSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ pageId: string }> };

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
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  const { pageId } = await context.params;
  const page = await db.docPage.findUnique({
    where: { id: pageId },
    include: {
      revisions: { orderBy: { revision: "desc" } },
      published: { include: { revision: true } },
    },
  });
  if (!page) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { action } = parsed.data;
  const revision =
    action === "publish"
      ? page.revisions.find((candidate) => candidate.reviewStatus === "APPROVED")
      : action === "withdraw"
        ? page.published?.revision
        : page.revisions[0];
  if (!revision) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (action === "submit") {
    if (!hasRole(user, "ADMIN", "AUTHOR") || (user.role !== "ADMIN" && page.createdBy !== user.id)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(revision.reviewStatus)) {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }
    const reviewer = await db.user.findFirst({
      where: { role: "REVIEWER", active: true, id: { not: revision.createdBy } },
      orderBy: { createdAt: "asc" },
    });
    if (!reviewer) return NextResponse.json({ error: "NO_REVIEWER_AVAILABLE" }, { status: 409 });
    await db.$transaction([
      db.pageRevision.update({
        where: { id: revision.id },
        data: { reviewStatus: "IN_REVIEW", reviewerId: reviewer.id, reviewComment: null },
      }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: "PAGE_REVIEW_SUBMITTED",
          targetType: "PAGE_REVISION",
          targetId: revision.id,
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
    ) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (revision.reviewStatus !== "IN_REVIEW") {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }
    const status = action === "approve" ? "APPROVED" : "CHANGES_REQUESTED";
    const comment = action === "request_changes" ? parsed.data.comment : null;
    await db.$transaction([
      db.pageRevision.update({ where: { id: revision.id }, data: { reviewStatus: status, reviewComment: comment } }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: action === "approve" ? "PAGE_REVIEW_APPROVED" : "PAGE_CHANGES_REQUESTED",
          targetType: "PAGE_REVISION",
          targetId: revision.id,
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
    const items = await db.pageRevisionChunk.findMany({
      where: { pageRevisionId: revision.id },
      include: { chunk: { include: { published: { include: { revision: true } } } } },
    });
    if (items.length === 0 || items.some(({ chunk }) => {
      const current = chunk.published?.revision;
      return !current ||
        current.language !== revision.language ||
        current.product !== revision.product ||
        current.apiVersion !== revision.apiVersion;
    })) {
      return NextResponse.json({ error: "CHUNKS_UNPUBLISHED_OR_SCOPE_MISMATCH" }, { status: 409 });
    }
    await db.$transaction(async (transaction) => {
      await transaction.publishedPage.upsert({
        where: { pageId },
        create: { pageId, revisionId: revision.id, publishedBy: user.id },
        update: { revisionId: revision.id, publishedBy: user.id, publishedAt: new Date() },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: user.id,
          action: "PAGE_PUBLISHED",
          targetType: "PAGE_REVISION",
          targetId: revision.id,
        },
      });
    });
    return NextResponse.json({ status: "PUBLISHED" });
  }

  if (!hasRole(user, "ADMIN", "PUBLISHER")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const publication = await db.publishedPage.findUnique({ where: { pageId } });
  if (!publication || publication.revisionId !== revision.id) {
    return NextResponse.json({ error: "NOT_CURRENTLY_PUBLISHED" }, { status: 409 });
  }
  await db.$transaction([
    db.publishedPage.delete({ where: { pageId } }),
    db.auditEvent.create({
      data: {
        actorId: user.id,
        action: "PAGE_WITHDRAWN",
        targetType: "PAGE_REVISION",
        targetId: revision.id,
      },
    }),
  ]);
  return NextResponse.json({ status: "WITHDRAWN" });
}
