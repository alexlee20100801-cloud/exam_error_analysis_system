CREATE TABLE `email_verification_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','verified','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text NOT NULL,
	`description` text,
	`is_encrypted` boolean NOT NULL DEFAULT false,
	`last_modified_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_setting_key_unique` UNIQUE(`setting_key`)
);
