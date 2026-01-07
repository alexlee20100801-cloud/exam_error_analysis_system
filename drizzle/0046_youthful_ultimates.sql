CREATE TABLE `notification_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notification_type` enum('ab_test_decision','warmup_task_completed','batch_operation_completed','system_alert','custom') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`enable_platform_notification` int NOT NULL DEFAULT 1,
	`enable_email_notification` int NOT NULL DEFAULT 0,
	`enable_sms_notification` int NOT NULL DEFAULT 0,
	`recipients` json NOT NULL,
	`email_template` text,
	`sms_template` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int,
	`notification_type` enum('ab_test_decision','warmup_task_completed','batch_operation_completed','system_alert','custom') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`channel` enum('platform','email','sms') NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`status` enum('pending','sent','failed','delivered') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`sent_at` timestamp,
	`delivered_at` timestamp,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notification_type_idx` ON `notification_configs` (`notification_type`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `notification_configs` (`is_active`);--> statement-breakpoint
CREATE INDEX `config_id_idx` ON `notification_history` (`config_id`);--> statement-breakpoint
CREATE INDEX `notification_type_idx` ON `notification_history` (`notification_type`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `notification_history` (`status`);--> statement-breakpoint
CREATE INDEX `channel_idx` ON `notification_history` (`channel`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `notification_history` (`created_at`);