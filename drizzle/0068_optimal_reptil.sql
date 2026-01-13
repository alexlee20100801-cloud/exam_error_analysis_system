CREATE TABLE `alert_notification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_id` int NOT NULL,
	`notification_type` enum('email','message','webhook') NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`subject` varchar(500),
	`content` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`retry_count` int NOT NULL DEFAULT 0,
	`max_retries` int NOT NULL DEFAULT 3,
	`next_retry_at` timestamp,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_notification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `education_terminology` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('general','math','physics','chemistry','biology','chinese','english','history','geography','politics') NOT NULL DEFAULT 'general',
	`sub_category` varchar(100),
	`term_chinese` varchar(255) NOT NULL,
	`term_japanese` varchar(255),
	`term_korean` varchar(255),
	`term_english` varchar(255),
	`description_chinese` text,
	`description_japanese` text,
	`description_korean` text,
	`description_english` text,
	`example_chinese` text,
	`example_japanese` text,
	`example_korean` text,
	`example_english` text,
	`japanese_review_status` enum('pending','reviewed','approved','rejected') DEFAULT 'pending',
	`korean_review_status` enum('pending','reviewed','approved','rejected') DEFAULT 'pending',
	`japanese_reviewer_id` int,
	`korean_reviewer_id` int,
	`japanese_reviewed_at` timestamp,
	`korean_reviewed_at` timestamp,
	`japanese_review_notes` text,
	`korean_review_notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `education_terminology_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_alert_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`task_type` enum('performance_evaluation','weekly_report_generation','alert_check','cache_warmup','ab_test_decision','data_backup','cleanup','custom') NOT NULL,
	`consecutive_failure_threshold` int NOT NULL DEFAULT 3,
	`timeout_threshold` int NOT NULL DEFAULT 300,
	`alert_severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`enable_email_notification` int NOT NULL DEFAULT 1,
	`enable_message_notification` int NOT NULL DEFAULT 1,
	`email_recipients` json,
	`message_recipients` json,
	`notification_cooldown` int NOT NULL DEFAULT 3600,
	`max_notifications_per_day` int NOT NULL DEFAULT 10,
	`is_active` int NOT NULL DEFAULT 1,
	`description` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_alert_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`alert_type` enum('consecutive_failure','timeout','error','partial_failure') NOT NULL,
	`alert_message` text NOT NULL,
	`error_details` text,
	`consecutive_failures` int DEFAULT 0,
	`execution_duration` int,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`email_sent` int NOT NULL DEFAULT 0,
	`email_sent_at` timestamp,
	`email_error` text,
	`message_sent` int NOT NULL DEFAULT 0,
	`message_sent_at` timestamp,
	`message_error` text,
	`status` enum('pending','acknowledged','resolved','ignored') NOT NULL DEFAULT 'pending',
	`acknowledged_by` int,
	`acknowledged_at` timestamp,
	`resolved_by` int,
	`resolved_at` timestamp,
	`resolution_notes` text,
	`alert_time` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_execution_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`task_type` enum('performance_evaluation','weekly_report_generation','alert_check','cache_warmup','ab_test_decision','data_backup','cleanup','custom') NOT NULL,
	`last_execution_time` timestamp,
	`last_execution_status` enum('success','failed','partial','running'),
	`last_execution_duration` int,
	`last_error_message` text,
	`next_scheduled_time` timestamp,
	`cron_expression` varchar(100),
	`total_executions` int NOT NULL DEFAULT 0,
	`successful_executions` int NOT NULL DEFAULT 0,
	`failed_executions` int NOT NULL DEFAULT 0,
	`consecutive_failures` int NOT NULL DEFAULT 0,
	`avg_execution_duration` int,
	`health_status` enum('healthy','warning','critical','unknown') NOT NULL DEFAULT 'unknown',
	`is_enabled` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_execution_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terminology_review_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`terminology_id` int NOT NULL,
	`language` enum('japanese','korean') NOT NULL,
	`previous_term` varchar(255),
	`new_term` varchar(255),
	`previous_description` text,
	`new_description` text,
	`action` enum('approved','corrected','rejected') NOT NULL,
	`review_notes` text,
	`reviewer_id` int NOT NULL,
	`reviewer_name` varchar(100),
	`is_native_speaker` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terminology_review_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terminology_validation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_id` varchar(64) NOT NULL,
	`category` enum('math','physics','chemistry','biology','chinese','english','history','geography','politics') NOT NULL,
	`language` enum('japanese','korean') NOT NULL,
	`total_terms` int NOT NULL DEFAULT 0,
	`validated_terms` int NOT NULL DEFAULT 0,
	`corrected_terms` int NOT NULL DEFAULT 0,
	`pending_terms` int NOT NULL DEFAULT 0,
	`validation_score` int,
	`issues` text,
	`recommendations` text,
	`validator_id` int,
	`validator_name` varchar(100),
	`status` enum('in_progress','completed','cancelled') DEFAULT 'in_progress',
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `terminology_validation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `alert_id_idx` ON `alert_notification_logs` (`alert_id`);--> statement-breakpoint
CREATE INDEX `notification_type_idx` ON `alert_notification_logs` (`notification_type`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `alert_notification_logs` (`status`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `education_terminology` (`category`);--> statement-breakpoint
CREATE INDEX `term_chinese_idx` ON `education_terminology` (`term_chinese`);--> statement-breakpoint
CREATE INDEX `japanese_review_status_idx` ON `education_terminology` (`japanese_review_status`);--> statement-breakpoint
CREATE INDEX `korean_review_status_idx` ON `education_terminology` (`korean_review_status`);--> statement-breakpoint
CREATE INDEX `task_name_idx` ON `task_alert_configs` (`task_name`);--> statement-breakpoint
CREATE INDEX `task_type_idx` ON `task_alert_configs` (`task_type`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `task_alert_configs` (`is_active`);--> statement-breakpoint
CREATE INDEX `config_id_idx` ON `task_alerts` (`config_id`);--> statement-breakpoint
CREATE INDEX `task_name_idx` ON `task_alerts` (`task_name`);--> statement-breakpoint
CREATE INDEX `alert_type_idx` ON `task_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `task_alerts` (`status`);--> statement-breakpoint
CREATE INDEX `alert_time_idx` ON `task_alerts` (`alert_time`);--> statement-breakpoint
CREATE INDEX `task_name_unique_idx` ON `task_execution_status` (`task_name`);--> statement-breakpoint
CREATE INDEX `task_type_idx` ON `task_execution_status` (`task_type`);--> statement-breakpoint
CREATE INDEX `health_status_idx` ON `task_execution_status` (`health_status`);--> statement-breakpoint
CREATE INDEX `is_enabled_idx` ON `task_execution_status` (`is_enabled`);--> statement-breakpoint
CREATE INDEX `terminology_id_idx` ON `terminology_review_history` (`terminology_id`);--> statement-breakpoint
CREATE INDEX `language_idx` ON `terminology_review_history` (`language`);--> statement-breakpoint
CREATE INDEX `reviewer_id_idx` ON `terminology_review_history` (`reviewer_id`);--> statement-breakpoint
CREATE INDEX `batch_id_idx` ON `terminology_validation` (`batch_id`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `terminology_validation` (`category`);--> statement-breakpoint
CREATE INDEX `language_idx` ON `terminology_validation` (`language`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `terminology_validation` (`status`);