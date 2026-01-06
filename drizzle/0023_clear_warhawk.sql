CREATE TABLE `review_task_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`task_id` int NOT NULL,
	`reminder_type` enum('one_day_before','three_hours_before','one_hour_before','custom') NOT NULL,
	`reminder_minutes` int NOT NULL,
	`scheduled_time` timestamp NOT NULL,
	`sent` boolean NOT NULL DEFAULT false,
	`sent_at` timestamp,
	`message` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_task_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_reminder_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`reminder_minutes` json NOT NULL DEFAULT ('[1440,180,60]'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_reminder_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_reminder_settings_user_id_unique` UNIQUE(`user_id`)
);
