-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChunkRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chunkId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL,
    "accessPolicy" TEXT NOT NULL,
    "allowedOrganizationIds" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "allowedAgentScope" TEXT NOT NULL,
    "lastVerified" DATETIME,
    "deprecationStatus" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredFromRevisionId" TEXT,
    CONSTRAINT "ChunkRevision_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChunkRevision_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChunkRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChunkRevision_restoredFromRevisionId_fkey" FOREIGN KEY ("restoredFromRevisionId") REFERENCES "ChunkRevision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChunkRevision" ("accessPolicy", "allowedAgentScope", "allowedOrganizationIds", "apiVersion", "bodyJson", "chunkId", "contentType", "createdAt", "createdBy", "deprecationStatus", "id", "language", "lastVerified", "product", "reviewComment", "reviewStatus", "reviewerId", "revision", "tags", "title") SELECT "accessPolicy", "allowedAgentScope", "allowedOrganizationIds", "apiVersion", "bodyJson", "chunkId", "contentType", "createdAt", "createdBy", "deprecationStatus", "id", "language", "lastVerified", "product", "reviewComment", "reviewStatus", "reviewerId", "revision", "tags", "title" FROM "ChunkRevision";
DROP TABLE "ChunkRevision";
ALTER TABLE "new_ChunkRevision" RENAME TO "ChunkRevision";
CREATE INDEX "ChunkRevision_createdBy_reviewStatus_idx" ON "ChunkRevision"("createdBy", "reviewStatus");
CREATE INDEX "ChunkRevision_reviewerId_reviewStatus_idx" ON "ChunkRevision"("reviewerId", "reviewStatus");
CREATE INDEX "ChunkRevision_language_product_apiVersion_idx" ON "ChunkRevision"("language", "product", "apiVersion");
CREATE INDEX "ChunkRevision_restoredFromRevisionId_idx" ON "ChunkRevision"("restoredFromRevisionId");
CREATE UNIQUE INDEX "ChunkRevision_chunkId_revision_key" ON "ChunkRevision"("chunkId", "revision");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
