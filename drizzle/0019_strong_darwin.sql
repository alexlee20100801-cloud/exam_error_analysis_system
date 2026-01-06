CREATE TABLE `practice_pools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`source_error_question_id` int NOT NULL,
	`practice_question_id` int NOT NULL,
	`knowledge_point_id` int,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`status` enum('pending','completed','skipped') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	`score` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_pools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_name` varchar(100) NOT NULL,
	`task_type` enum('generate_questions','send_reminders','cleanup') NOT NULL,
	`cron_expression` varchar(50) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`last_executed_at` timestamp,
	`last_status` enum('success','failed','running'),
	`last_error_message` text,
	`execution_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduled_tasks_task_name_unique` UNIQUE(`task_name`)
);
--> statement-breakpoint
CREATE TABLE `task_execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`started_at` timestamp NOT NULL,
	`completed_at` timestamp,
	`duration` int,
	`items_processed` int,
	`error_message` text,
	`details` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_execution_logs_id` PRIMARY KEY(`id`)
);
