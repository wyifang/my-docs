-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    CONSTRAINT "ChunkRevision_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChunkRevision_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChunkRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChunkRevision" ("accessPolicy", "allowedAgentScope", "apiVersion", "bodyJson", "chunkId", "contentType", "createdAt", "createdBy", "deprecationStatus", "id", "language", "lastVerified", "product", "reviewComment", "reviewStatus", "reviewerId", "revision", "title") SELECT "accessPolicy", "allowedAgentScope", "apiVersion", "bodyJson", "chunkId", "contentType", "createdAt", "createdBy", "deprecationStatus", "id", "language", "lastVerified", "product", "reviewComment", "reviewStatus", "reviewerId", "revision", "title" FROM "ChunkRevision";
DROP TABLE "ChunkRevision";
ALTER TABLE "new_ChunkRevision" RENAME TO "ChunkRevision";
CREATE INDEX "ChunkRevision_createdBy_reviewStatus_idx" ON "ChunkRevision"("createdBy", "reviewStatus");
CREATE INDEX "ChunkRevision_reviewerId_reviewStatus_idx" ON "ChunkRevision"("reviewerId", "reviewStatus");
CREATE INDEX "ChunkRevision_language_product_apiVersion_idx" ON "ChunkRevision"("language", "product", "apiVersion");
CREATE UNIQUE INDEX "ChunkRevision_chunkId_revision_key" ON "ChunkRevision"("chunkId", "revision");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "name", "passwordHash", "role") SELECT "active", "createdAt", "email", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
