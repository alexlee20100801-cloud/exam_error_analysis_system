ALTER TABLE `export_history_records` ADD `file_name` varchar(255);--> statement-breakpoint
ALTER TABLE `export_history_records` ADD `download_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `export_history_records` ADD `last_download_at` timestamp;--> statement-breakpoint
ALTER TABLE `export_history_records` ADD `expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `export_history_records` ADD `is_expired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `export_history_records` ADD `cleaned_at` timestamp;--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `export_history_records` (`expires_at`);--> statement-breakpoint
CREATE INDEX `is_expired_idx` ON `export_history_records` (`is_expired`);