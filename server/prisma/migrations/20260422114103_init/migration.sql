-- CreateTable
CREATE TABLE "raw_data" (
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
    "credits" INTEGER NOT NULL DEFAULT 0,
    "accounts" INTEGER NOT NULL DEFAULT 0,
    "roi" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "upload_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_details" TEXT,
    "uploaded_by" TEXT,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "raw_data_channel_idx" ON "raw_data"("channel");

-- CreateIndex
CREATE INDEX "raw_data_record_date_idx" ON "raw_data"("record_date");

-- CreateIndex
CREATE INDEX "raw_data_campaign_id_idx" ON "raw_data"("campaign_id");

-- CreateIndex
CREATE INDEX "raw_data_channel_record_date_idx" ON "raw_data"("channel", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "raw_data_channel_record_date_campaign_id_key" ON "raw_data"("channel", "record_date", "campaign_id");

-- CreateIndex
CREATE INDEX "upload_logs_uploaded_at_idx" ON "upload_logs"("uploaded_at");
