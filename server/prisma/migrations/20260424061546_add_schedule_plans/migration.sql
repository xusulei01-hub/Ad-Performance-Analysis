-- CreateTable
CREATE TABLE "plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "tag" TEXT,
    "tag_icon" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "due_date" DATETIME NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "milestones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "plans_start_date_idx" ON "plans"("start_date");

-- CreateIndex
CREATE INDEX "plans_end_date_idx" ON "plans"("end_date");

-- CreateIndex
CREATE INDEX "plans_priority_idx" ON "plans"("priority");

-- CreateIndex
CREATE INDEX "plans_status_idx" ON "plans"("status");

-- CreateIndex
CREATE INDEX "milestones_plan_id_idx" ON "milestones"("plan_id");

-- CreateIndex
CREATE INDEX "milestones_due_date_idx" ON "milestones"("due_date");
