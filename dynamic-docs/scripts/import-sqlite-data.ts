import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadProjectEnv } from "./load-env";

async function main() {
  loadProjectEnv();
  if (
    process.env.DATABASE_PROVIDER !== "postgresql" ||
    process.env.STORAGE_PROVIDER !== "vercel-blob" ||
    !process.env.DATABASE_URL
  ) {
    throw new Error(
      "Set DATABASE_PROVIDER=postgresql, DATABASE_URL, and STORAGE_PROVIDER=vercel-blob before importing.",
    );
  }

  const sqliteUrl = process.env.SQLITE_DATABASE_URL ?? "file:../dev.db";
  const [{ PrismaClient: SqliteClient }, { PrismaClient: PostgresClient }, { storeAttachment, deleteAttachment }] =
    await Promise.all([
      import("@prisma/client"),
      import("@docforge/prisma-postgres"),
      import("@/lib/storage"),
    ]);
  const source = new SqliteClient({ datasources: { db: { url: sqliteUrl } } });
  const target = new PostgresClient();
  const copiedBlobKeys: string[] = [];
  let databaseImported = false;

  try {
    const targetCounts = await Promise.all([
      target.organization.count(),
      target.user.count(),
      target.agentToken.count(),
      target.session.count(),
      target.chunkLanguageGroup.count(),
      target.chunk.count(),
      target.chunkRevision.count(),
      target.pageLanguageGroup.count(),
      target.docPage.count(),
      target.pageRevision.count(),
      target.pageRevisionChunk.count(),
      target.publishedChunk.count(),
      target.publishedPage.count(),
      target.attachment.count(),
      target.auditEvent.count(),
    ]);
    if (targetCounts.some((count) => count > 0)) {
      throw new Error("The PostgreSQL database is not empty. Import was aborted without changing it.");
    }

    const [
      organizations,
      users,
      agentTokens,
      sessions,
      chunkLanguageGroups,
      chunks,
      chunkRevisions,
      pageLanguageGroups,
      pages,
      pageRevisions,
      pageRevisionChunks,
      publishedChunks,
      publishedPages,
      attachments,
      auditEvents,
    ] = await Promise.all([
      source.organization.findMany(),
      source.user.findMany(),
      source.agentToken.findMany(),
      source.session.findMany(),
      source.chunkLanguageGroup.findMany(),
      source.chunk.findMany(),
      source.chunkRevision.findMany(),
      source.pageLanguageGroup.findMany(),
      source.docPage.findMany(),
      source.pageRevision.findMany(),
      source.pageRevisionChunk.findMany(),
      source.publishedChunk.findMany(),
      source.publishedPage.findMany(),
      source.attachment.findMany(),
      source.auditEvent.findMany(),
    ]);

    const uploadsDirectory = path.resolve(process.cwd(), ".data", "uploads");
    for (const attachment of attachments) {
      const localPath = path.resolve(uploadsDirectory, attachment.storageKey);
      if (!localPath.startsWith(`${uploadsDirectory}${path.sep}`)) {
        throw new Error(`Attachment ${attachment.id} has an invalid local storage key.`);
      }
      const bytes = await readFile(localPath);
      if (bytes.byteLength !== attachment.size) {
        throw new Error(`Attachment ${attachment.id} size does not match its database metadata.`);
      }
      await storeAttachment(attachment.storageKey, bytes, attachment.mimeType);
      copiedBlobKeys.push(attachment.storageKey);
    }

    await target.$transaction(
      async (transaction) => {
        if (organizations.length) await transaction.organization.createMany({ data: organizations });
        if (users.length) await transaction.user.createMany({ data: users });
        if (agentTokens.length) await transaction.agentToken.createMany({ data: agentTokens });
        if (sessions.length) await transaction.session.createMany({ data: sessions });
        if (chunkLanguageGroups.length) {
          await transaction.chunkLanguageGroup.createMany({ data: chunkLanguageGroups });
        }
        if (chunks.length) await transaction.chunk.createMany({ data: chunks });
        if (pageLanguageGroups.length) {
          await transaction.pageLanguageGroup.createMany({ data: pageLanguageGroups });
        }
        if (pages.length) await transaction.docPage.createMany({ data: pages });
        if (chunkRevisions.length) {
          await transaction.chunkRevision.createMany({
            data: chunkRevisions.map((revision) => ({
              ...revision,
              restoredFromRevisionId: null,
            })),
          });
          for (const revision of chunkRevisions) {
            if (revision.restoredFromRevisionId) {
              await transaction.chunkRevision.update({
                where: { id: revision.id },
                data: { restoredFromRevisionId: revision.restoredFromRevisionId },
              });
            }
          }
        }
        if (pageRevisions.length) await transaction.pageRevision.createMany({ data: pageRevisions });
        if (pageRevisionChunks.length) {
          await transaction.pageRevisionChunk.createMany({ data: pageRevisionChunks });
        }
        if (publishedChunks.length) await transaction.publishedChunk.createMany({ data: publishedChunks });
        if (publishedPages.length) await transaction.publishedPage.createMany({ data: publishedPages });
        if (attachments.length) await transaction.attachment.createMany({ data: attachments });
        if (auditEvents.length) await transaction.auditEvent.createMany({ data: auditEvents });
      },
      { timeout: 60_000 },
    );
    databaseImported = true;

    console.log(
      `Imported ${users.length} user(s), ${chunks.length} chunk(s), ${chunkRevisions.length} chunk revision(s), ${pages.length} page(s), ${pageRevisions.length} page revision(s), and ${attachments.length} attachment(s).`,
    );
  } catch (error) {
    if (databaseImported) throw error;
    const cleanupResults = await Promise.allSettled(copiedBlobKeys.map(deleteAttachment));
    const cleanupErrors = cleanupResults.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "SQLite import failed and some uploaded Blob objects could not be cleaned up.",
      );
    }
    throw error;
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
