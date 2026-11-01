-- CreateTable
CREATE TABLE "ChunkLanguageGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DocPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocPage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DocPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageRevision_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PageRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageRevisionChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageRevisionId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "PageRevisionChunk_pageRevisionId_fkey" FOREIGN KEY ("pageRevisionId") REFERENCES "PageRevision" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageRevisionChunk_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishedPage" (
    "pageId" TEXT NOT NULL PRIMARY KEY,
    "revisionId" TEXT NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublishedPage_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DocPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishedPage_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "PageRevision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PublishedPage_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "languageGroupId" TEXT,
    CONSTRAINT "Chunk_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Chunk_languageGroupId_fkey" FOREIGN KEY ("languageGroupId") REFERENCES "ChunkLanguageGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Chunk" ("createdAt", "createdBy", "id") SELECT "createdAt", "createdBy", "id" FROM "Chunk";
DROP TABLE "Chunk";
ALTER TABLE "new_Chunk" RENAME TO "Chunk";
CREATE INDEX "Chunk_createdBy_idx" ON "Chunk"("createdBy");
CREATE INDEX "Chunk_languageGroupId_idx" ON "Chunk"("languageGroupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ChunkLanguageGroup_stableKey_key" ON "ChunkLanguageGroup"("stableKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocPage_slug_key" ON "DocPage"("slug");

-- CreateIndex
CREATE INDEX "PageRevision_reviewerId_reviewStatus_idx" ON "PageRevision"("reviewerId", "reviewStatus");

-- CreateIndex
CREATE INDEX "PageRevision_createdBy_reviewStatus_idx" ON "PageRevision"("createdBy", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PageRevision_pageId_revision_key" ON "PageRevision"("pageId", "revision");

-- CreateIndex
CREATE INDEX "PageRevisionChunk_chunkId_idx" ON "PageRevisionChunk"("chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "PageRevisionChunk_pageRevisionId_position_key" ON "PageRevisionChunk"("pageRevisionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PageRevisionChunk_pageRevisionId_chunkId_key" ON "PageRevisionChunk"("pageRevisionId", "chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPage_revisionId_key" ON "PublishedPage"("revisionId");
