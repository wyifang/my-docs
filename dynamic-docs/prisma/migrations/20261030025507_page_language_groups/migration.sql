-- CreateTable
CREATE TABLE "PageLanguageGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "languageGroupId" TEXT,
    CONSTRAINT "DocPage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocPage_languageGroupId_fkey" FOREIGN KEY ("languageGroupId") REFERENCES "PageLanguageGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DocPage" ("createdAt", "createdBy", "id", "slug") SELECT "createdAt", "createdBy", "id", "slug" FROM "DocPage";
DROP TABLE "DocPage";
ALTER TABLE "new_DocPage" RENAME TO "DocPage";
CREATE UNIQUE INDEX "DocPage_slug_key" ON "DocPage"("slug");
CREATE INDEX "DocPage_languageGroupId_idx" ON "DocPage"("languageGroupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PageLanguageGroup_stableKey_key" ON "PageLanguageGroup"("stableKey");
