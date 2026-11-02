CREATE TABLE "LoginThrottle" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "windowStartedAt" DATETIME NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "LoginThrottle_windowStartedAt_idx" ON "LoginThrottle"("windowStartedAt");
