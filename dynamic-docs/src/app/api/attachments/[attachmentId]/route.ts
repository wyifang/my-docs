import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessPublishedRevision } from "@/lib/content";
import { readAttachment } from "@/lib/storage";

type RouteContext = { params: Promise<{ attachmentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { attachmentId } = await context.params;
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      chunk: {
        include: {
          published: { include: { revision: true } },
          revisions: {
            select: {
              reviewerId: true,
              reviewStatus: true,
              accessPolicy: true,
              allowedOrganizationIds: true,
              product: true,
              apiVersion: true,
              language: true,
            },
          },
        },
      },
    },
  });
  if (!attachment) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const user = await getCurrentUser();
  const url = new URL(request.url);
  const filters = {
    product: url.searchParams.get("product") ?? undefined,
    apiVersion: url.searchParams.get("apiVersion") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
  };
  const publishedBody: unknown = attachment.chunk.published
    ? JSON.parse(attachment.chunk.published.revision.bodyJson)
    : null;
  const isReferenced = (value: unknown): boolean => {
    if (value === attachment.id) return true;
    if (Array.isArray(value)) return value.some(isReferenced);
    if (typeof value === "object" && value !== null) return Object.values(value).some(isReferenced);
    return false;
  };
  const publishedAccess =
    attachment.chunk.published !== null &&
    isReferenced(publishedBody) &&
    canAccessPublishedRevision(attachment.chunk.published.revision, user, filters);
  const privateAccess =
    user !== null &&
    (user.role === "ADMIN" ||
      attachment.uploadedById === user.id ||
      attachment.chunk.revisions.some(
        (revision) => revision.reviewerId === user.id && revision.reviewStatus === "IN_REVIEW",
    ) ||
    (user.role === "PUBLISHER" &&
      attachment.chunk.revisions.some(
        (revision) =>
          revision.reviewStatus === "APPROVED" &&
          canAccessPublishedRevision(revision, user, filters),
      )));
  if (!publishedAccess && !privateAccess) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const attachmentBody = await readAttachment(attachment.storageKey);
  if (!attachmentBody) return NextResponse.json({ error: "ATTACHMENT_FILE_MISSING" }, { status: 410 });
  return new NextResponse(attachmentBody, {
    headers: {
      "content-type": attachment.mimeType,
      "content-length": String(attachment.size),
      "content-disposition": `${attachment.mimeType === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
      "x-content-type-options": "nosniff",
      "cache-control": publishedAccess && attachment.chunk.published?.revision.accessPolicy === "PUBLIC"
        ? "public, max-age=60"
        : "private, no-store",
    },
  });
}
