import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessPublishedRevision, serializeRevision } from "@/lib/content";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ chunkId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { chunkId } = await context.params;
  const url = new URL(request.url);
  const filters = {
    product: url.searchParams.get("product") ?? undefined,
    apiVersion: url.searchParams.get("apiVersion") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
  };
  if (
    (filters.language && !["zh-CN", "en-US"].includes(filters.language)) ||
    (filters.product && filters.product.length > 100) ||
    (filters.apiVersion && filters.apiVersion.length > 50)
  ) {
    return NextResponse.json({ error: "INVALID_FILTER" }, { status: 400 });
  }

  const publication = await db.publishedChunk.findUnique({
    where: { chunkId },
    include: { revision: true },
  });
  const user = await getCurrentUser();
  if (
    !publication ||
    !canAccessPublishedRevision(publication.revision, user, filters)
  ) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ chunk: serializeRevision(publication.revision) });
}
