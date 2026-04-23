-- CreateTable
CREATE TABLE "merchant_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "qs_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "lead_date" DATETIME NOT NULL,
    "account_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "merchant_mappings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qs_id" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "merchant_data_user_id_key" ON "merchant_data"("user_id");

-- CreateIndex
CREATE INDEX "merchant_data_qs_id_idx" ON "merchant_data"("qs_id");

-- CreateIndex
CREATE INDEX "merchant_data_channel_idx" ON "merchant_data"("channel");

-- CreateIndex
CREATE INDEX "merchant_data_lead_date_idx" ON "merchant_data"("lead_date");

-- CreateIndex
CREATE INDEX "merchant_data_qs_id_lead_date_idx" ON "merchant_data"("qs_id", "lead_date");

-- CreateIndex
CREATE INDEX "merchant_data_channel_lead_date_idx" ON "merchant_data"("channel", "lead_date");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_mappings_qs_id_key" ON "merchant_mappings"("qs_id");
