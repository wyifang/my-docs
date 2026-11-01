import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCmsChunks, revisionData, serializeRevision } from "@/lib/content";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { chunkDraftSchema } from "@/lib/schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN", "AUTHOR", "REVIEWER", "PUBLISHER", "VIEWER")) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  return NextResponse.json({ chunks: await listCmsChunks(user) });
}

export async function POST(request: Request) {
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
  const parsed = chunkDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const chunkId = randomUUID();
  const revision = await db.$transaction(async (transaction) => {
    await transaction.chunk.create({
      data: { id: chunkId, createdBy: user.id },
    });
    const newRevision = await transaction.chunkRevision.create({
      data: {
        chunkId,
        revision: 1,
        createdBy: user.id,
        ...revisionData(parsed.data),
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "CHUNK_DRAFT_CREATED",
        targetType: "CHUNK",
        targetId: chunkId,
        detailsJson: JSON.stringify({ revisionId: newRevision.id }),
      },
    });
    return newRevision;
  });

  return NextResponse.json({ revision: serializeRevision(revision) }, { status: 201 });
}
