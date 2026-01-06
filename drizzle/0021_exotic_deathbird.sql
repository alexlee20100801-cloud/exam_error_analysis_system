CREATE TABLE `review_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reminder_id` int NOT NULL,
	`user_id` int NOT NULL,
	`question_id` int NOT NULL,
	`question_type` enum('error_question','practice_question') NOT NULL,
	`reviewed_at` timestamp NOT NULL,
	`mastery_level` int,
	`time_spent` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`question_id` int NOT NULL,
	`question_type` enum('error_question','practice_question') NOT NULL,
	`next_review_date` timestamp NOT NULL,
	`review_count` int NOT NULL DEFAULT 0,
	`status` enum('pending','completed','skipped','deleted') NOT NULL DEFAULT 'pending',
	`last_reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_reminders_id` PRIMARY KEY(`id`)
);
