import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getCmsPage } from "@/lib/pages";
import { db } from "@/lib/db";
import { isSameOrigin, invalidJson } from "@/lib/http";
import { linkTranslationSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ pageId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { pageId } = await context.params;
  const page = await getCmsPage(pageId, user);
  if (!page) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN", "AUTHOR")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: user ? 403 : 401 });
  }
  const { pageId } = await context.params;
  const page = await db.docPage.findUnique({
    where: { id: pageId },
    include: { published: true, revisions: { select: { reviewStatus: true } } },
  });
  if (!page || (user.role !== "ADMIN" && page.createdBy !== user.id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (page.published || page.revisions.some((revision) => revision.reviewStatus === "IN_REVIEW")) {
    return NextResponse.json({ error: "PAGE_HAS_ACTIVE_RELEASE_OR_REVIEW" }, { status: 409 });
  }
  await db.$transaction([
    db.auditEvent.create({
      data: {
        actorId: user.id,
        action: "PAGE_DELETED",
        targetType: "DOC_PAGE",
        targetId: pageId,
        detailsJson: JSON.stringify({ slug: page.slug }),
      },
    }),
    db.docPage.delete({ where: { id: pageId } }),
  ]);
  return NextResponse.json({ ok: true });
}

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
  const { pageId } = await context.params;

  const result = await db.$transaction(async (transaction) => {
    const pages = await transaction.docPage.findMany({
      where: { id: { in: [pageId, parsed.data.otherContentId] } },
      include: { revisions: { orderBy: { revision: "desc" }, take: 1 } },
    });
    if (pages.length !== 2) return { error: "PAGE_NOT_FOUND", status: 404 as const };
    const first = pages.find((page) => page.id === pageId);
    const second = pages.find((page) => page.id === parsed.data.otherContentId);
    if (!first || !second) return { error: "PAGE_NOT_FOUND", status: 404 as const };
    if (user.role !== "ADMIN" && (first.createdBy !== user.id || second.createdBy !== user.id)) {
      return { error: "FORBIDDEN", status: 403 as const };
    }
    const firstRevision = first.revisions[0];
    const secondRevision = second.revisions[0];
    if (!firstRevision || !secondRevision) return { error: "REVISION_NOT_FOUND", status: 409 as const };
    if (firstRevision.language === secondRevision.language) {
      return { error: "TRANSLATION_LANGUAGE_MUST_DIFFER", status: 409 as const };
    }
    const groupIds = [...new Set([first.languageGroupId, second.languageGroupId].filter((id): id is string => id !== null))];
    if (groupIds.length > 1) return { error: "TRANSLATION_GROUP_CONFLICT", status: 409 as const };
    const groupId = groupIds[0] ?? randomUUID();
    if (first.languageGroupId === groupId && second.languageGroupId === groupId) return { groupId };
    const members = groupIds.length > 0
      ? await transaction.docPage.findMany({
          where: { languageGroupId: groupId, id: { notIn: [pageId, parsed.data.otherContentId] } },
          include: { revisions: { orderBy: { revision: "desc" }, take: 1 } },
        })
      : [];
    const languages = members.map((page) => page.revisions[0]?.language).filter(Boolean);
    if (languages.includes(firstRevision.language) || languages.includes(secondRevision.language)) {
      return { error: "TRANSLATION_LANGUAGE_ALREADY_LINKED", status: 409 as const };
    }
    if (!first.languageGroupId && !second.languageGroupId) {
      await transaction.pageLanguageGroup.create({
        data: { id: groupId, stableKey: `page-translation-${randomUUID()}` },
      });
    }
    await transaction.docPage.updateMany({
      where: { id: { in: [pageId, parsed.data.otherContentId] } },
      data: { languageGroupId: groupId },
    });
    await transaction.auditEvent.create({
      data: {
        actorId: user.id,
        action: "PAGES_TRANSLATIONS_LINKED",
        targetType: "PAGE_LANGUAGE_GROUP",
        targetId: groupId,
        detailsJson: JSON.stringify({ pageIds: [pageId, parsed.data.otherContentId] }),
      },
    });
    return { groupId };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ languageGroupId: result.groupId });
}
