CREATE TABLE `push_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`push_type` enum('question','knowledge','resource') NOT NULL,
	`target_filters` json NOT NULL,
	`content_config` json NOT NULL,
	`frequency` enum('daily','weekly','monthly','once') NOT NULL,
	`push_time` varchar(5) NOT NULL DEFAULT '09:00',
	`channels` json NOT NULL DEFAULT ('["system"]'),
	`is_enabled` boolean NOT NULL DEFAULT true,
	`next_push_time` timestamp,
	`last_push_time` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`target_user_count` int NOT NULL,
	`success_count` int NOT NULL DEFAULT 0,
	`failed_count` int NOT NULL DEFAULT 0,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`channels` json NOT NULL,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_push_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`push_record_id` int NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`push_type` enum('question','knowledge','resource') NOT NULL,
	`channel` enum('system','email','wechat') NOT NULL,
	`status` enum('sent','failed','read') NOT NULL DEFAULT 'sent',
	`is_read` boolean NOT NULL DEFAULT false,
	`read_at` timestamp,
	`is_clicked` boolean NOT NULL DEFAULT false,
	`clicked_at` timestamp,
	`related_content_id` int,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_push_receipts_id` PRIMARY KEY(`id`)
);
