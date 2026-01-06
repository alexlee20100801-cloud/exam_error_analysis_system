ALTER TABLE `user_reminder_settings` ADD `notification_channels` json NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `wechat_open_id` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `wechat_nickname` varchar(200);