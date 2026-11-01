import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCmsChunk } from "@/lib/content";
import { isSameOrigin } from "@/lib/http";
import { deleteAttachment } from "@/lib/storage";

type RouteContext = { params: Promise<{ chunkId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { chunkId } = await context.params;
  const chunk = await getCmsChunk(chunkId, user);
  if (!chunk) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ chunk });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isSameOrigin(_request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN", "AUTHOR")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: user ? 403 : 401 });
  }
  const { chunkId } = await context.params;
  const chunk = await db.chunk.findUnique({
    where: { id: chunkId },
    include: { attachments: true, published: true, pageReferences: { select: { id: true } } },
  });
  if (!chunk || (user.role !== "ADMIN" && chunk.createdBy !== user.id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (
    chunk.pageReferences.length > 0 ||
    chunk.published ||
    (await db.chunkRevision.findFirst({
      where: { chunkId, reviewStatus: "IN_REVIEW" },
      select: { id: true },
    }))
  ) {
    return NextResponse.json(
      { error: chunk.pageReferences.length > 0 ? "CHUNK_REFERENCED_BY_PAGE" : "CHUNK_HAS_ACTIVE_RELEASE_OR_REVIEW" },
      { status: 409 },
    );
  }

  await db.$transaction([
    db.auditEvent.create({
      data: {
        actorId: user.id,
        action: "CHUNK_DELETED",
        targetType: "CHUNK",
        targetId: chunkId,
      },
    }),
    db.chunk.delete({ where: { id: chunkId } }),
  ]);
  const results = await Promise.allSettled(
    chunk.attachments.map((attachment) => deleteAttachment(attachment.storageKey)),
  );
  const failedCleanup = results.filter((result) => result.status === "rejected");
  if (failedCleanup.length > 0) {
    console.error(`Deleted chunk ${chunkId}, but failed to remove ${failedCleanup.length} attachment file(s).`);
    return NextResponse.json({ error: "CHUNK_DELETED_ATTACHMENT_CLEANUP_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
