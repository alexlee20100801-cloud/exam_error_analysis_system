CREATE TABLE `question_analysis_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`image_hash` varchar(64),
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
	`error_analysis` text,
	`correct_answer` text,
	`detailed_explanation` text,
	`detailed_analysis` text,
	`knowledge_point_ids` json,
	`difficulty` enum('easy','medium','hard'),
	`hit_count` int NOT NULL DEFAULT 0,
	`last_hit_at` timestamp,
	`analysis_version` varchar(32) NOT NULL DEFAULT 'v1',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `question_analysis_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_session_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`image_url` text NOT NULL,
	`image_key` varchar(500),
	`ocr_content` text,
	`ocr_confidence` int,
	`title` varchar(500),
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography'),
	`grade` enum('junior1','junior2','junior3','senior1','senior2','senior3'),
	`difficulty` enum('easy','medium','hard'),
	`semester` enum('first','second'),
	`user_notes` text,
	`status` enum('pending','processed','skipped','error') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `upload_session_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_key` varchar(64) NOT NULL,
	`status` enum('pending','editing','completed','cancelled') NOT NULL DEFAULT 'pending',
	`total_count` int NOT NULL DEFAULT 0,
	`processed_count` int NOT NULL DEFAULT 0,
	`common_subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography'),
	`common_grade` enum('junior1','junior2','junior3','senior1','senior2','senior3'),
	`common_difficulty` enum('easy','medium','hard'),
	`common_semester` enum('first','second'),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `upload_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_content_hash` ON `question_analysis_cache` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_image_hash` ON `question_analysis_cache` (`image_hash`);--> statement-breakpoint
CREATE INDEX `idx_subject_grade` ON `question_analysis_cache` (`subject`,`grade`);--> statement-breakpoint
CREATE INDEX `idx_hit_count` ON `question_analysis_cache` (`hit_count`);--> statement-breakpoint
CREATE INDEX `idx_session_id` ON `upload_session_items` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `upload_session_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_session` ON `upload_sessions` (`user_id`,`session_key`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `upload_sessions` (`status`);