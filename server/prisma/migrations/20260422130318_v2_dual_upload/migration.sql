/*
  Warnings:

  - You are about to drop the column `credits` on the `raw_data` table. All the data in the column will be lost.
  - You are about to drop the column `roi` on the `raw_data` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "channel_mappings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source_name" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_raw_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channel" TEXT NOT NULL,
    "record_date" DATETIME NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "campaign_name" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "activations" INTEGER NOT NULL DEFAULT 0,
    "formal_activations" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "accounts" INTEGER NOT NULL DEFAULT 0,
    "ctr" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_raw_data" ("accounts", "activations", "campaign_id", "campaign_name", "channel", "clicks", "cost", "created_at", "downloads", "id", "impressions", "record_date", "updated_at") SELECT "accounts", "activations", "campaign_id", "campaign_name", "channel", "clicks", "cost", "created_at", "downloads", "id", "impressions", "record_date", "updated_at" FROM "raw_data";
DROP TABLE "raw_data";
ALTER TABLE "new_raw_data" RENAME TO "raw_data";
CREATE INDEX "raw_data_channel_idx" ON "raw_data"("channel");
CREATE INDEX "raw_data_record_date_idx" ON "raw_data"("record_date");
CREATE INDEX "raw_data_campaign_id_idx" ON "raw_data"("campaign_id");
CREATE INDEX "raw_data_channel_record_date_idx" ON "raw_data"("channel", "record_date");
CREATE UNIQUE INDEX "raw_data_channel_record_date_campaign_id_key" ON "raw_data"("channel", "record_date", "campaign_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "channel_mappings_source_name_key" ON "channel_mappings"("source_name");
