-- 素材审核功能：素材表 + 素材-计划关联表（1:N 预留）
CREATE TABLE "creatives" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_comment" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "creative_campaigns" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creative_id" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "creative_campaigns_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "creatives_user_id_idx" ON "creatives"("user_id");
CREATE INDEX "creatives_channel_idx" ON "creatives"("channel");
CREATE INDEX "creatives_status_idx" ON "creatives"("status");
CREATE INDEX "creatives_created_at_idx" ON "creatives"("created_at");
CREATE UNIQUE INDEX "unique_creative_campaign" ON "creative_campaigns"("creative_id", "channel", "campaign_id");
CREATE INDEX "creative_campaigns_channel_campaign_id_idx" ON "creative_campaigns"("channel", "campaign_id");
