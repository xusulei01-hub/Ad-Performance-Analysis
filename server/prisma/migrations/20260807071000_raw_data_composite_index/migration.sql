-- 新增 (record_date, channel) 复合索引：总览按日期聚合不再全索引扫描
CREATE INDEX "raw_data_record_date_channel_idx" ON "raw_data"("record_date", "channel");

-- 删除被唯一索引 (channel, record_date, campaign_id) 左前缀覆盖的冗余索引
DROP INDEX "raw_data_channel_idx";
DROP INDEX "raw_data_channel_record_date_idx";
