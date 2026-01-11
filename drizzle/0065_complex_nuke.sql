CREATE TABLE `ip_blacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`blocked_by` varchar(100),
	`blocked_at` timestamp NOT NULL,
	`expires_at` timestamp,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ip_blacklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `ip_blacklist_ip_address_unique` UNIQUE(`ip_address`)
);
--> statement-breakpoint
CREATE TABLE `ip_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`action` varchar(50) NOT NULL,
	`request_count` int NOT NULL DEFAULT 1,
	`window_start` timestamp NOT NULL,
	`window_end` timestamp NOT NULL,
	`blocked` tinyint NOT NULL DEFAULT 0,
	`blocked_until` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ip_rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ip_active_idx` ON `ip_blacklist` (`ip_address`,`is_active`);--> statement-breakpoint
CREATE INDEX `ip_action_idx` ON `ip_rate_limits` (`ip_address`,`action`);--> statement-breakpoint
CREATE INDEX `window_end_idx` ON `ip_rate_limits` (`window_end`);--> statement-breakpoint
CREATE INDEX `blocked_idx` ON `ip_rate_limits` (`blocked`);