import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { revisionData, serializeRevision } from "@/lib/content";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { chunkDraftSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ chunkId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN", "AUTHOR")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: user ? 403 : 401 });
  }

  const { chunkId } = await context.params;
  const chunk = await db.chunk.findUnique({ where: { id: chunkId } });
  if (!chunk || (user.role !== "ADMIN" && chunk.createdBy !== user.id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const [latestRevision, publication] = await Promise.all([
    db.chunkRevision.findFirst({
      where: { chunkId },
      orderBy: { revision: "desc" },
    }),
    db.publishedChunk.findUnique({ where: { chunkId }, select: { revisionId: true } }),
  ]);
  if (
    latestRevision?.reviewStatus === "IN_REVIEW" ||
    (latestRevision?.reviewStatus === "APPROVED" && publication?.revisionId !== latestRevision.id)
  ) {
    return NextResponse.json({ error: "REVISION_LOCKED_DURING_REVIEW_OR_APPROVAL" }, { status: 409 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  const parsed = chunkDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", details: parsed.error.issues },
      { status: 400 },
    );
  }
  if (latestRevision && latestRevision.language !== parsed.data.language) {
    return NextResponse.json(
      { error: "LANGUAGE_MISMATCH", message: "Create a separate Chunk for another language variant." },
      { status: 409 },
    );
  }

  const revision = await db.$transaction(async (transaction) => {
    const latest = await transaction.chunkRevision.findFirst({
      where: { chunkId },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });
    const newRevision = await transaction.chunkRevision.create({
      data: {
        chunkId,
        revision: (latest?.revision ?? 0) + 1,
        createdBy: user.id,
        ...revisionData(parsed.data),
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "CHUNK_REVISION_CREATED",
        targetType: "CHUNK",
        targetId: chunkId,
        detailsJson: JSON.stringify({ revisionId: newRevision.id }),
      },
    });
    return newRevision;
  });

  return NextResponse.json({ revision: serializeRevision(revision) }, { status: 201 });
}
