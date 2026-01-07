CREATE TABLE `deduplication_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_name` varchar(100) NOT NULL,
	`text_similarity_threshold` decimal(5,2) NOT NULL DEFAULT '90.00',
	`image_similarity_threshold` decimal(5,2) NOT NULL DEFAULT '85.00',
	`overall_similarity_threshold` decimal(5,2) NOT NULL DEFAULT '90.00',
	`enable_image_comparison` int NOT NULL DEFAULT 1,
	`enable_semantic_comparison` int NOT NULL DEFAULT 1,
	`auto_merge_threshold` decimal(5,2) NOT NULL DEFAULT '95.00',
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deduplication_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deduplication_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_id` varchar(100) NOT NULL,
	`question_id` int NOT NULL,
	`action` enum('keep','merge','discard') NOT NULL,
	`reason` text,
	`duplicate_group_id` varchar(100),
	`similar_question_ids` json,
	`processed_by` varchar(100),
	`processed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deduplication_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `noise_detection_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`noise_type` enum('incomplete','garbled','low_quality_image','missing_answer','invalid_format','spam') NOT NULL,
	`noise_score` decimal(5,2) NOT NULL,
	`detection_details` json,
	`is_filtered` int NOT NULL DEFAULT 0,
	`review_status` enum('pending','confirmed','false_positive') NOT NULL DEFAULT 'pending',
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `noise_detection_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_similarities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_1_id` int NOT NULL,
	`question_2_id` int NOT NULL,
	`text_similarity` decimal(5,2) NOT NULL,
	`image_similarity` decimal(5,2),
	`overall_similarity` decimal(5,2) NOT NULL,
	`similarity_method` varchar(50) NOT NULL,
	`comparison_details` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_similarities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `active_idx` ON `deduplication_config` (`is_active`);--> statement-breakpoint
CREATE INDEX `batch_idx` ON `deduplication_records` (`batch_id`);--> statement-breakpoint
CREATE INDEX `question_idx` ON `deduplication_records` (`question_id`);--> statement-breakpoint
CREATE INDEX `group_idx` ON `deduplication_records` (`duplicate_group_id`);--> statement-breakpoint
CREATE INDEX `question_idx` ON `noise_detection_records` (`question_id`);--> statement-breakpoint
CREATE INDEX `noise_type_idx` ON `noise_detection_records` (`noise_type`);--> statement-breakpoint
CREATE INDEX `review_status_idx` ON `noise_detection_records` (`review_status`);--> statement-breakpoint
CREATE INDEX `q1_q2_idx` ON `question_similarities` (`question_1_id`,`question_2_id`);--> statement-breakpoint
CREATE INDEX `similarity_idx` ON `question_similarities` (`overall_similarity`);