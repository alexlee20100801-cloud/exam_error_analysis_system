CREATE TABLE `gsc_data_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data_type` varchar(50) NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`data` json NOT NULL,
	`fetched_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gsc_data_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schema_validation_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_url` varchar(500) NOT NULL,
	`page_type` varchar(50) NOT NULL,
	`schema_type` varchar(50) NOT NULL,
	`validation_status` varchar(20) NOT NULL DEFAULT 'pending',
	`validation_time` timestamp NOT NULL DEFAULT (now()),
	`errors` json,
	`warnings` json,
	`rich_results_eligible` int NOT NULL DEFAULT 0,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schema_validation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_priority_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_url` varchar(500) NOT NULL,
	`old_priority` float,
	`new_priority` float NOT NULL,
	`old_changefreq` varchar(20),
	`new_changefreq` varchar(20) NOT NULL,
	`adjustment_type` varchar(20) NOT NULL,
	`adjusted_by` int,
	`reason` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seo_priority_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_url` varchar(500) NOT NULL,
	`page_type` varchar(50) NOT NULL,
	`date` timestamp NOT NULL,
	`page_views` int NOT NULL DEFAULT 0,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`update_count` int NOT NULL DEFAULT 0,
	`last_update_time` timestamp,
	`calculated_priority` float NOT NULL DEFAULT 0.5,
	`calculated_changefreq` varchar(20) NOT NULL DEFAULT 'weekly',
	`manual_priority` float,
	`manual_changefreq` varchar(20),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seo_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sitemap_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`update_time` timestamp NOT NULL DEFAULT (now()),
	`url_count` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'success',
	`error_message` text,
	`generated_by` varchar(50) NOT NULL DEFAULT 'auto',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sitemap_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `data_type_idx` ON `gsc_data_cache` (`data_type`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `gsc_data_cache` (`expires_at`);--> statement-breakpoint
CREATE INDEX `date_range_idx` ON `gsc_data_cache` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `page_url_idx` ON `schema_validation_results` (`page_url`);--> statement-breakpoint
CREATE INDEX `validation_status_idx` ON `schema_validation_results` (`validation_status`);--> statement-breakpoint
CREATE INDEX `page_type_idx` ON `schema_validation_results` (`page_type`);--> statement-breakpoint
CREATE INDEX `page_url_idx` ON `seo_priority_history` (`page_url`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `seo_priority_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `adjustment_type_idx` ON `seo_priority_history` (`adjustment_type`);--> statement-breakpoint
CREATE INDEX `page_url_idx` ON `seo_stats` (`page_url`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `seo_stats` (`date`);--> statement-breakpoint
CREATE INDEX `page_type_idx` ON `seo_stats` (`page_type`);--> statement-breakpoint
CREATE INDEX `priority_idx` ON `seo_stats` (`calculated_priority`);--> statement-breakpoint
CREATE INDEX `update_time_idx` ON `sitemap_history` (`update_time`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `sitemap_history` (`status`);