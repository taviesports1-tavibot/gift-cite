CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

CREATE TABLE "StreamSession" (
  "id" TEXT NOT NULL,
  "tiktokUsername" TEXT,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "currentHp" INTEGER NOT NULL DEFAULT 10000,
  "totalLikes" INTEGER NOT NULL DEFAULT 0,
  "totalGifts" INTEGER NOT NULL DEFAULT 0,
  "totalCoins" INTEGER NOT NULL DEFAULT 0,
  "totalDamage" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StreamSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StreamSession_status_startedAt_idx" ON "StreamSession"("status", "startedAt");

CREATE TABLE "Viewer" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "avatar" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Viewer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GiftCatalog" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "image" TEXT,
  "coinValue" INTEGER NOT NULL DEFAULT 0,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GiftMapping" (
  "id" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  "effectType" TEXT NOT NULL,
  "damage" INTEGER NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "cooldownMs" INTEGER NOT NULL DEFAULT 0,
  "intensity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "particles" INTEGER NOT NULL DEFAULT 20,
  "screenShake" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "sound" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GiftMapping_giftId_key" ON "GiftMapping"("giftId");

CREATE TABLE "GiftEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "giftName" TEXT NOT NULL,
  "coinValue" INTEGER NOT NULL,
  "repeatCount" INTEGER NOT NULL DEFAULT 1,
  "streakId" TEXT,
  "damage" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GiftEvent_sessionId_occurredAt_idx" ON "GiftEvent"("sessionId", "occurredAt");
CREATE INDEX "GiftEvent_viewerId_sessionId_idx" ON "GiftEvent"("viewerId", "sessionId");

CREATE TABLE "Round" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endTime" TIMESTAMP(3),
  "damage" INTEGER NOT NULL DEFAULT 0,
  "giftEvents" INTEGER NOT NULL DEFAULT 0,
  "winnerId" TEXT,
  "winnerUsername" TEXT,
  CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Round_sessionId_number_key" ON "Round"("sessionId", "number");

CREATE TABLE "GameEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GameEvent_sessionId_occurredAt_idx" ON "GameEvent"("sessionId", "occurredAt");

CREATE TABLE "LeaderboardEntry" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "coins" INTEGER NOT NULL DEFAULT 0,
  "damage" INTEGER NOT NULL DEFAULT 0,
  "gifts" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeaderboardEntry_sessionId_viewerId_key" ON "LeaderboardEntry"("sessionId", "viewerId");
CREATE INDEX "LeaderboardEntry_sessionId_coins_idx" ON "LeaderboardEntry"("sessionId", "coins");

CREATE TABLE "GameSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Statistics" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Statistics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Statistics_sessionId_key" ON "Statistics"("sessionId");

CREATE TABLE "GameSnapshot" (
  "sessionId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameSnapshot_pkey" PRIMARY KEY ("sessionId")
);

ALTER TABLE "GiftMapping" ADD CONSTRAINT "GiftMapping_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "GiftCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftEvent" ADD CONSTRAINT "GiftEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftEvent" ADD CONSTRAINT "GiftEvent_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftEvent" ADD CONSTRAINT "GiftEvent_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "GiftCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Round" ADD CONSTRAINT "Round_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameSnapshot" ADD CONSTRAINT "GameSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
