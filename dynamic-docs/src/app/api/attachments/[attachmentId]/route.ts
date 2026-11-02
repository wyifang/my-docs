import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAttachmentAccess } from "@/lib/attachment-access";
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
  const access = getAttachmentAccess({
    attachmentId: attachment.id,
    uploadedById: attachment.uploadedById,
    publishedRevision: attachment.chunk.published?.revision ?? null,
    revisions: attachment.chunk.revisions,
    user,
    filters,
  });
  if (!access.allowed) {
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
      "cache-control": access.isPublic
        ? "public, max-age=60"
        : "private, no-store",
    },
  });
}
