CREATE TABLE `ai_advice_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`advice_data` json NOT NULL,
	`total_error_questions` int NOT NULL DEFAULT 0,
	`mastery_rate` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_advice_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`advice_history_id` int NOT NULL,
	`subject` varchar(50) NOT NULL,
	`knowledge_point` varchar(200),
	`reason` text NOT NULL,
	`suggested_time` varchar(50) NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`completed_at` timestamp,
	`scheduled_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_tasks_id` PRIMARY KEY(`id`)
);
