CREATE TABLE `sms_send_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`template_code` varchar(100),
	`template_param` text,
	`status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`request_id` varchar(100),
	`biz_id` varchar(100),
	`error_code` varchar(50),
	`error_message` text,
	`ip_address` varchar(45),
	`user_id` int,
	`sent_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sms_send_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wechat_user_bindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`open_id` varchar(100) NOT NULL,
	`union_id` varchar(100),
	`nickname` varchar(100),
	`avatar_url` varchar(500),
	`gender` tinyint,
	`province` varchar(50),
	`city` varchar(50),
	`country` varchar(50),
	`access_token` varchar(255),
	`refresh_token` varchar(255),
	`token_expires_at` timestamp,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`bound_at` timestamp NOT NULL,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `wechat_user_bindings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `phone_idx` ON `sms_send_logs` (`phone_number`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `sms_send_logs` (`status`);--> statement-breakpoint
CREATE INDEX `sent_at_idx` ON `sms_send_logs` (`sent_at`);--> statement-breakpoint
CREATE INDEX `ip_idx` ON `sms_send_logs` (`ip_address`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `sms_send_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `wechat_user_bindings` (`user_id`);--> statement-breakpoint
CREATE INDEX `open_id_idx` ON `wechat_user_bindings` (`open_id`);--> statement-breakpoint
CREATE INDEX `union_id_idx` ON `wechat_user_bindings` (`union_id`);