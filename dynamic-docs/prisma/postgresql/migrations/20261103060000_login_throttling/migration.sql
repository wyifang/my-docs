CREATE TABLE "LoginThrottle" (
    "identifier" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("identifier")
);

CREATE INDEX "LoginThrottle_windowStartedAt_idx" ON "LoginThrottle"("windowStartedAt");
