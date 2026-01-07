CREATE TABLE `upload_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_id` int,
	`upload_type` enum('single','batch') NOT NULL DEFAULT 'batch',
	`total_count` int NOT NULL DEFAULT 0,
	`success_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`average_confidence` decimal(5,2),
	`subject_distribution` varchar(500),
	`grade_distribution` varchar(500),
	`processing_duration` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `upload_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `upload_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_session_id` ON `upload_history` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `upload_history` (`created_at`);