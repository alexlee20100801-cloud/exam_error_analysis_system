ALTER TABLE `users` ADD `subject_preferences` json;--> statement-breakpoint
ALTER TABLE `users` ADD `learning_goals` json;--> statement-breakpoint
ALTER TABLE `users` ADD `daily_study_time` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `users` ADD `preferred_review_time` varchar(10) DEFAULT '20:00';--> statement-breakpoint
ALTER TABLE `users` ADD `notification_enabled` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `review_reminder_enabled` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `goal_reminder_enabled` tinyint DEFAULT 1;