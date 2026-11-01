import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { pageDraftSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ pageId: string }> };

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
  const parsed = pageDraftSchema.omit({ slug: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, { status: 400 });
  }
  const { pageId } = await context.params;

  const result = await db.$transaction(async (transaction) => {
    const page = await transaction.docPage.findUnique({
      where: { id: pageId },
      include: {
        revisions: { orderBy: { revision: "desc" }, take: 1 },
        published: { select: { revisionId: true } },
      },
    });
    if (!page || (user.role !== "ADMIN" && page.createdBy !== user.id)) {
      return { error: "NOT_FOUND", status: 404 as const };
    }
    const latest = page.revisions[0];
    if (
      latest?.reviewStatus === "IN_REVIEW" ||
      (latest?.reviewStatus === "APPROVED" && page.published?.revisionId !== latest.id)
    ) return { error: "REVISION_LOCKED", status: 409 as const };
    if (latest && latest.language !== parsed.data.language) {
      return { error: "LANGUAGE_MISMATCH", status: 409 as const };
    }
    const chunks = await transaction.chunk.findMany({
      where: { id: { in: parsed.data.chunkIds } },
      include: { revisions: { orderBy: { revision: "desc" }, take: 1 } },
    });
    if (
      chunks.length !== parsed.data.chunkIds.length ||
      chunks.some((chunk) => user.role !== "ADMIN" && chunk.createdBy !== user.id)
    ) return { error: "CHUNK_NOT_FOUND", status: 404 as const };
    if (chunks.some((chunk) => {
      const current = chunk.revisions[0];
      return !current ||
        current.language !== parsed.data.language ||
        current.product !== parsed.data.product ||
        current.apiVersion !== parsed.data.apiVersion;
    })) return { error: "CHUNK_SCOPE_MISMATCH", status: 409 as const };

    const revision = await transaction.pageRevision.create({
      data: {
        pageId,
        revision: (latest?.revision ?? 0) + 1,
        title: parsed.data.title,
        summary: parsed.data.summary,
        language: parsed.data.language,
        product: parsed.data.product,
        apiVersion: parsed.data.apiVersion,
        createdBy: user.id,
        items: {
          create: parsed.data.chunkIds.map((chunkId, position) => ({ chunkId, position })),
        },
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "PAGE_REVISION_CREATED",
        targetType: "DOC_PAGE",
        targetId: pageId,
        detailsJson: JSON.stringify({ revisionId: revision.id, chunkIds: parsed.data.chunkIds }),
      },
    });
    return { revisionId: revision.id, revision: revision.revision };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ revision: result }, { status: 201 });
}
