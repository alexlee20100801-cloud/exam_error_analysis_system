CREATE TABLE `account_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`login_account` varchar(320) NOT NULL,
	`initial_password` varchar(255) NOT NULL,
	`password_changed` boolean NOT NULL DEFAULT false,
	`delivery_method` enum('email','sms') NOT NULL,
	`delivery_status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_credentials_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `account_credentials_login_account_unique` UNIQUE(`login_account`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`user_id` int,
	`plan_id` int NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`payment_method` enum('stripe','wechat','alipay'),
	`status` enum('pending','paid','cancelled','refunded','expired') NOT NULL DEFAULT 'pending',
	`paid_at` timestamp,
	`third_party_order_no` varchar(255),
	`buyer_info` json,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_no_unique` UNIQUE(`order_no`)
);
--> statement-breakpoint
CREATE TABLE `payment_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_method` enum('stripe','wechat','alipay') NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT false,
	`config` text NOT NULL,
	`last_modified_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_configs_payment_method_unique` UNIQUE(`payment_method`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`duration_days` int NOT NULL,
	`features` json NOT NULL,
	`max_error_questions` int NOT NULL DEFAULT -1,
	`max_ai_analysis` int NOT NULL DEFAULT -1,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`order_id` int NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`used_ai_analysis` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);
