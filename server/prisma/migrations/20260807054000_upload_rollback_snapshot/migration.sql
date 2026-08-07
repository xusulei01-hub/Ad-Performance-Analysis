-- AlterTable
ALTER TABLE "upload_logs" ADD COLUMN "backup_data" TEXT;
ALTER TABLE "upload_logs" ADD COLUMN "rolled_back_at" DATETIME;
