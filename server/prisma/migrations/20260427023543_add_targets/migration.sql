-- CreateTable
CREATE TABLE "targets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "period_type" TEXT NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "target_cost" REAL NOT NULL DEFAULT 0,
    "target_activations" INTEGER NOT NULL DEFAULT 0,
    "target_accounts" INTEGER NOT NULL DEFAULT 0,
    "target_roi" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "targets_period_type_idx" ON "targets"("period_type");

-- CreateIndex
CREATE INDEX "targets_period_start_idx" ON "targets"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX "targets_period_type_period_start_key" ON "targets"("period_type", "period_start");
