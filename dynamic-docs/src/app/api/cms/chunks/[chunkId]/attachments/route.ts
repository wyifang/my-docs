import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/http";
import { deleteAttachment, storeAttachment } from "@/lib/storage";

type RouteContext = { params: Promise<{ chunkId: string }> };
const maxUploadBytes = 4 * 1024 * 1024;
const mimeExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

function isValidFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  return false;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { chunkId } = await context.params;
  const chunk = await db.chunk.findUnique({
    where: { id: chunkId },
    include: { revisions: { where: { reviewerId: user.id }, select: { id: true } } },
  });
  if (
    !chunk ||
    (user.role !== "ADMIN" &&
      chunk.createdBy !== user.id &&
      !(user.role === "REVIEWER" && chunk.revisions.length > 0))
  ) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const attachments = await db.attachment.findMany({
    where: { chunkId },
    orderBy: { createdAt: "desc" },
    select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
  });
  return NextResponse.json({ attachments });
}

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM_DATA" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "INVALID_FILE_SIZE" }, { status: 400 });
  }
  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }
  const extension = mimeExtensions[file.type];
  if (!extension) return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 415 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isValidFileSignature(file.type, bytes)) {
    return NextResponse.json({ error: "FILE_CONTENT_MISMATCH" }, { status: 415 });
  }

  const storageKey = `${randomUUID()}${extension}`;
  await storeAttachment(storageKey, bytes, file.type);
  try {
    const attachment = await db.$transaction(async (transaction) => {
      const created = await transaction.attachment.create({
        data: {
          chunkId,
          uploadedById: user.id,
          storageKey,
          originalName: file.name.replace(/[\\/]/g, "_").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "attachment",
          mimeType: file.type,
          size: file.size,
        },
        select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: user.id,
          action: "ATTACHMENT_UPLOADED",
          targetType: "ATTACHMENT",
          targetId: created.id,
          detailsJson: JSON.stringify({ chunkId, size: file.size, mimeType: file.type }),
        },
      });
      return created;
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    try {
      await deleteAttachment(storageKey);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Failed to save attachment metadata and clean up its file.");
    }
    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!hasRole(user, "ADMIN", "AUTHOR")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: user ? 403 : 401 });
  }
  const { chunkId } = await context.params;
  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) return NextResponse.json({ error: "ATTACHMENT_ID_REQUIRED" }, { status: 400 });

  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      chunkId,
      ...(user.role === "ADMIN" ? {} : { uploadedById: user.id }),
    },
  });
  if (!attachment) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (await db.publishedChunk.findUnique({ where: { chunkId } })) {
    return NextResponse.json({ error: "UNPUBLISH_CHUNK_BEFORE_DELETING_ATTACHMENT" }, { status: 409 });
  }

  await db.$transaction([
    db.auditEvent.create({
      data: {
        actorId: user.id,
        action: "ATTACHMENT_DELETED",
        targetType: "ATTACHMENT",
        targetId: attachment.id,
        detailsJson: JSON.stringify({ chunkId }),
      },
    }),
    db.attachment.delete({ where: { id: attachment.id } }),
  ]);
  await deleteAttachment(attachment.storageKey);
  return NextResponse.json({ ok: true });
}
