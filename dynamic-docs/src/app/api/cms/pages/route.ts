import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { pageDraftSchema } from "@/lib/schemas";
import { listCmsPages } from "@/lib/pages";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json({ pages: await listCmsPages(user) });
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
  const parsed = pageDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED", details: parsed.error.issues }, { status: 400 });
  }

  const id = randomUUID();
  const result = await db.$transaction(async (transaction) => {
    if (await transaction.docPage.findUnique({ where: { slug: parsed.data.slug } })) {
      return { error: "SLUG_TAKEN", status: 409 as const };
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

    await transaction.docPage.create({
      data: {
        id,
        slug: parsed.data.slug,
        createdBy: user.id,
        revisions: {
          create: {
            revision: 1,
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
        },
      },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "PAGE_DRAFT_CREATED",
        targetType: "DOC_PAGE",
        targetId: id,
        detailsJson: JSON.stringify({ slug: parsed.data.slug, chunkIds: parsed.data.chunkIds }),
      },
    });
    return { id };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ pageId: result.id, slug: parsed.data.slug }, { status: 201 });
}
