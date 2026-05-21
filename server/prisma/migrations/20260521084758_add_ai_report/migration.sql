-- CreateTable
CREATE TABLE "ai_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "analysis" TEXT NOT NULL,
    "data_snapshot" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ai_reports_type_idx" ON "ai_reports"("type");

-- CreateIndex
CREATE INDEX "ai_reports_created_at_idx" ON "ai_reports"("created_at");
