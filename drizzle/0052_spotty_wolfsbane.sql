CREATE TABLE `sitemap_update_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`success` boolean NOT NULL,
	`total_urls` int,
	`sitemap_url` text,
	`error_message` text,
	`execution_time_ms` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sitemap_update_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sitemap_history_updated_at` ON `sitemap_update_history` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_sitemap_history_success` ON `sitemap_update_history` (`success`);