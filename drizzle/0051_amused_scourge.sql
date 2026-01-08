CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`member_joined` int NOT NULL DEFAULT 1,
	`new_comment` int NOT NULL DEFAULT 1,
	`new_question` int NOT NULL DEFAULT 1,
	`review_reminder` int NOT NULL DEFAULT 1,
	`system_notice` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`related_id` int,
	`related_type` varchar(50),
	`is_read` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`read_at` timestamp,
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `notification_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `user_notifications` (`type`);--> statement-breakpoint
CREATE INDEX `is_read_idx` ON `user_notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `user_notifications` (`created_at`);