CREATE TABLE `export_history_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`template_id` int,
	`export_type` enum('error_questions','exam_paper','learning_report','custom') NOT NULL,
	`export_format` enum('pdf','word','markdown','html') NOT NULL,
	`question_count` int NOT NULL DEFAULT 0,
	`file_url` varchar(500),
	`file_key` varchar(500),
	`file_size` int,
	`config_snapshot` json,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`processing_time_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `export_history_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `export_templates_enhanced` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`template_type` enum('error_book','review_card','exam_paper','analysis_report','custom') NOT NULL DEFAULT 'custom',
	`is_default` boolean NOT NULL DEFAULT false,
	`is_public` boolean NOT NULL DEFAULT false,
	`is_system_preset` boolean NOT NULL DEFAULT false,
	`filter_config` json,
	`sort_config` json,
	`content_config` json,
	`style_config` json,
	`export_format` enum('pdf','word','markdown','html') NOT NULL DEFAULT 'pdf',
	`usage_count` int NOT NULL DEFAULT 0,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `export_templates_enhanced_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quick_export_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`template_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`shortcut_key` varchar(20),
	`display_order` int NOT NULL DEFAULT 0,
	`show_in_toolbar` boolean NOT NULL DEFAULT true,
	`icon` varchar(50),
	`usage_count` int NOT NULL DEFAULT 0,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quick_export_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `export_history_records` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_id_idx` ON `export_history_records` (`template_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `export_history_records` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `export_history_records` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `export_templates_enhanced` (`user_id`);--> statement-breakpoint
CREATE INDEX `is_public_idx` ON `export_templates_enhanced` (`is_public`);--> statement-breakpoint
CREATE INDEX `template_type_idx` ON `export_templates_enhanced` (`template_type`);--> statement-breakpoint
CREATE INDEX `is_default_idx` ON `export_templates_enhanced` (`is_default`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `quick_export_configs` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_id_idx` ON `quick_export_configs` (`template_id`);