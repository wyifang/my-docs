import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { linkTranslationSchema } from "@/lib/schemas";

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
  const parsed = linkTranslationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  const { chunkId } = await context.params;

  const result = await db.$transaction(async (transaction) => {
    const chunks = await transaction.chunk.findMany({
      where: { id: { in: [chunkId, parsed.data.otherContentId] } },
      include: { revisions: { orderBy: { revision: "desc" }, take: 1 } },
    });
    if (chunks.length !== 2) return { error: "CHUNK_NOT_FOUND", status: 404 as const };
    const first = chunks.find((chunk) => chunk.id === chunkId);
    const second = chunks.find((chunk) => chunk.id === parsed.data.otherContentId);
    if (!first || !second) return { error: "CHUNK_NOT_FOUND", status: 404 as const };
    if (
      user.role !== "ADMIN" &&
      (first.createdBy !== user.id || second.createdBy !== user.id)
    ) return { error: "FORBIDDEN", status: 403 as const };

    const firstRevision = first.revisions[0];
    const secondRevision = second.revisions[0];
    if (!firstRevision || !secondRevision) return { error: "REVISION_NOT_FOUND", status: 409 as const };
    if (firstRevision.language === secondRevision.language) {
      return { error: "TRANSLATION_LANGUAGE_MUST_DIFFER", status: 409 as const };
    }

    const groupIds = [...new Set([first.languageGroupId, second.languageGroupId].filter((id): id is string => id !== null))];
    if (groupIds.length > 1) return { error: "TRANSLATION_GROUP_CONFLICT", status: 409 as const };
    const groupId = groupIds[0] ?? randomUUID();
    if (first.languageGroupId === groupId && second.languageGroupId === groupId) {
      return { groupId };
    }
    const members = groupIds.length > 0
      ? await transaction.chunk.findMany({
          where: { languageGroupId: groupId, id: { notIn: [chunkId, parsed.data.otherContentId] } },
          include: { revisions: { orderBy: { revision: "desc" }, take: 1 } },
        })
      : [];
    const languages = members.map((member) => member.revisions[0]?.language).filter(Boolean);
    if (languages.includes(firstRevision.language) || languages.includes(secondRevision.language)) {
      return { error: "TRANSLATION_LANGUAGE_ALREADY_LINKED", status: 409 as const };
    }

    if (!first.languageGroupId && !second.languageGroupId) {
      await transaction.chunkLanguageGroup.create({
        data: { id: groupId, stableKey: `translation-${randomUUID()}` },
      });
    }
    await transaction.chunk.updateMany({
      where: { id: { in: [chunkId, parsed.data.otherContentId] } },
      data: { languageGroupId: groupId },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "CHUNK_TRANSLATIONS_LINKED",
        targetType: "CHUNK_LANGUAGE_GROUP",
        targetId: groupId,
        detailsJson: JSON.stringify({ chunkIds: [chunkId, parsed.data.otherContentId] }),
      },
    });
    return { groupId };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ languageGroupId: result.groupId });
}
