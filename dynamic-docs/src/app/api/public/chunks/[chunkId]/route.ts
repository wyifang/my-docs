import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeRevision } from "@/lib/content";

type RouteContext = { params: Promise<{ chunkId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { chunkId } = await context.params;
  const publication = await db.publishedChunk.findUnique({
    where: { chunkId },
    include: { revision: true },
  });
  if (!publication || publication.revision.accessPolicy !== "PUBLIC") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ chunk: serializeRevision(publication.revision) });
}
