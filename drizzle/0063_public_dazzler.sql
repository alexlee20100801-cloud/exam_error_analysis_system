CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`identifier_type` enum('phone','username','email','wechat') NOT NULL,
	`ip_address` varchar(50) NOT NULL,
	`user_agent` text,
	`success` tinyint NOT NULL DEFAULT 0,
	`fail_reason` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_locks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`identifier_type` enum('phone','username','email','wechat') NOT NULL,
	`lock_reason` varchar(255),
	`failed_attempts` int NOT NULL DEFAULT 0,
	`unlocks_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `login_locks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`login_method` enum('phone','username','wechat','oauth','email') NOT NULL,
	`ip_address` varchar(50) NOT NULL,
	`device_id` varchar(64),
	`user_agent` text,
	`success` tinyint NOT NULL DEFAULT 1,
	`fail_reason` varchar(255),
	`is_new_device` tinyint NOT NULL DEFAULT 0,
	`is_new_location` tinyint NOT NULL DEFAULT 0,
	`risk_level` enum('low','medium','high') NOT NULL DEFAULT 'low',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `login_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`alert_type` enum('new_device','new_location','multiple_failures','suspicious_activity','account_locked') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`ip_address` varchar(50),
	`location` varchar(255),
	`device_info` text,
	`is_read` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `security_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_service_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('aliyun','tencent','custom') NOT NULL,
	`access_key_id` varchar(255),
	`access_key_secret` varchar(255),
	`sign_name` varchar(100),
	`template_code` varchar(100),
	`region` varchar(50),
	`is_active` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sms_service_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`device_id` varchar(64) NOT NULL,
	`device_type` enum('mobile','tablet','desktop','unknown') NOT NULL DEFAULT 'unknown',
	`browser` varchar(50),
	`os` varchar(50),
	`ip_address` varchar(50),
	`is_trusted` tinyint NOT NULL DEFAULT 0,
	`last_active_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `user_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wechat_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`app_id` varchar(100) NOT NULL,
	`app_secret` varchar(255) NOT NULL,
	`redirect_uri` varchar(500),
	`scope` varchar(100) DEFAULT 'snsapi_login',
	`is_active` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `wechat_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `identifier_idx` ON `login_attempts` (`identifier`);--> statement-breakpoint
CREATE INDEX `identifier_type_idx` ON `login_attempts` (`identifier_type`);--> statement-breakpoint
CREATE INDEX `ip_address_idx` ON `login_attempts` (`ip_address`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `login_attempts` (`created_at`);--> statement-breakpoint
CREATE INDEX `identifier_idx` ON `login_locks` (`identifier`);--> statement-breakpoint
CREATE INDEX `identifier_type_idx` ON `login_locks` (`identifier_type`);--> statement-breakpoint
CREATE INDEX `unlocks_at_idx` ON `login_locks` (`unlocks_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `login_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `ip_address_idx` ON `login_logs` (`ip_address`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `login_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `risk_level_idx` ON `login_logs` (`risk_level`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `security_alerts` (`user_id`);--> statement-breakpoint
CREATE INDEX `alert_type_idx` ON `security_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `is_read_idx` ON `security_alerts` (`is_read`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `security_alerts` (`created_at`);--> statement-breakpoint
CREATE INDEX `provider_idx` ON `sms_service_config` (`provider`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `sms_service_config` (`is_active`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `user_devices` (`user_id`);--> statement-breakpoint
CREATE INDEX `device_id_idx` ON `user_devices` (`device_id`);--> statement-breakpoint
CREATE INDEX `last_active_at_idx` ON `user_devices` (`last_active_at`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `wechat_config` (`is_active`);