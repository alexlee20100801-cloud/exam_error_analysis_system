ALTER TABLE `users` ADD `is_active` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `admin_notes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_admin_action` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `admin_action_by` int;