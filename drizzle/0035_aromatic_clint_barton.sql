CREATE TABLE `batch_crop_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`file_list` json NOT NULL,
	`total_files` int NOT NULL,
	`processed_files` int NOT NULL DEFAULT 0,
	`failed_files` int NOT NULL DEFAULT 0,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `batch_crop_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crop_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`image_url` varchar(500) NOT NULL,
	`image_hash` varchar(64),
	`regions` json NOT NULL,
	`question_type` enum('choice','blank','short_answer','calculation','essay','mixed'),
	`subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography'),
	`grade` enum('grade7','grade8','grade9','grade10','grade11','grade12'),
	`feedback` enum('accepted','rejected','modified'),
	`usage_count` int NOT NULL DEFAULT 1,
	`last_used_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `crop_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `batch_crop_tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `batch_crop_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `crop_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `question_type_idx` ON `crop_history` (`question_type`);--> statement-breakpoint
CREATE INDEX `image_hash_idx` ON `crop_history` (`image_hash`);