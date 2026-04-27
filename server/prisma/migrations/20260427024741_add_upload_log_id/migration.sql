-- AlterTable
ALTER TABLE "raw_data" ADD COLUMN "upload_log_id" INTEGER;

-- CreateIndex
CREATE INDEX "raw_data_upload_log_id_idx" ON "raw_data"("upload_log_id");
