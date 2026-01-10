CREATE TABLE `account_binding_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`binding_type` enum('phone','wechat','username','email') NOT NULL,
	`action` enum('bind','unbind') NOT NULL,
	`old_value` varchar(255),
	`new_value` varchar(255),
	`ip_address` varchar(50),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `account_binding_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(10) NOT NULL,
	`type` enum('login','register','bind','reset') NOT NULL,
	`used` tinyint NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `verification_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wechat_oauth_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(64) NOT NULL,
	`redirect_url` varchar(500),
	`user_id` int,
	`action` enum('login','bind') NOT NULL DEFAULT 'login',
	`used` tinyint NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `wechat_oauth_states_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `print_templates` ADD `is_public` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `usage_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `logo_url` text;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `logo_position` varchar(50) DEFAULT 'top-left';--> statement-breakpoint
ALTER TABLE `print_templates` ADD `logo_width` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `header_align` varchar(20) DEFAULT 'center';--> statement-breakpoint
ALTER TABLE `print_templates` ADD `header_font_size` int DEFAULT 14;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `footer_align` varchar(20) DEFAULT 'center';--> statement-breakpoint
ALTER TABLE `print_templates` ADD `footer_font_size` int DEFAULT 12;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `question_spacing` int DEFAULT 20;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `show_question_number` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `show_difficulty` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `show_subject` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `print_templates` ADD `answer_position` varchar(50) DEFAULT 'after-question';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `phone_verified` tinyint DEFAULT 0;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `account_binding_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `binding_type_idx` ON `account_binding_history` (`binding_type`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `account_binding_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `phone_idx` ON `verification_codes` (`phone`);--> statement-breakpoint
CREATE INDEX `code_idx` ON `verification_codes` (`code`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `verification_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `state_idx` ON `wechat_oauth_states` (`state`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `wechat_oauth_states` (`expires_at`);