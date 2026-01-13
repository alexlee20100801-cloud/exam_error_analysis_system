CREATE TABLE `api_performance_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`user_id` int,
	`response_time` int NOT NULL,
	`status_code` int,
	`request_size` int,
	`response_size` int,
	`is_error` int DEFAULT 0,
	`error_message` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `api_performance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`error_type` varchar(50) NOT NULL,
	`error_code` varchar(20),
	`message` text NOT NULL,
	`stack` text,
	`user_id` int,
	`endpoint` varchar(255),
	`method` varchar(10),
	`status_code` int,
	`request_data` json,
	`response_data` json,
	`severity` varchar(20) DEFAULT 'medium',
	`is_resolved` int DEFAULT 0,
	`resolved_by` int,
	`resolved_at` timestamp,
	`resolution_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `error_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`severity` varchar(20) DEFAULT 'medium',
	`source_type` varchar(50),
	`source_id` int,
	`is_acknowledged` int DEFAULT 0,
	`acknowledged_by` int,
	`acknowledged_at` timestamp,
	`is_resolved` int DEFAULT 0,
	`resolved_by` int,
	`resolved_at` timestamp,
	`resolution_notes` text,
	`notification_sent` int DEFAULT 0,
	`notification_details` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`rule_type` varchar(50) NOT NULL,
	`condition` varchar(50) NOT NULL,
	`threshold` decimal(10,2) NOT NULL,
	`time_window` int NOT NULL,
	`alert_severity` varchar(20) DEFAULT 'medium',
	`enable_notification` int DEFAULT 1,
	`notification_channels` json,
	`is_active` int DEFAULT 1,
	`created_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_resource_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cpu_usage` decimal(5,2),
	`memory_usage` decimal(5,2),
	`disk_usage` decimal(5,2),
	`active_connections` int,
	`requests_per_second` decimal(8,2),
	`average_response_time` int,
	`error_rate` decimal(5,2),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `system_resource_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `endpoint_idx` ON `api_performance_logs` (`endpoint`);--> statement-breakpoint
CREATE INDEX `response_time_idx` ON `api_performance_logs` (`response_time`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `api_performance_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `error_type_idx` ON `error_logs` (`error_type`);--> statement-breakpoint
CREATE INDEX `severity_idx` ON `error_logs` (`severity`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `error_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `error_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `alert_type_idx` ON `monitoring_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `severity_idx` ON `monitoring_alerts` (`severity`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `monitoring_alerts` (`created_at`);--> statement-breakpoint
CREATE INDEX `rule_type_idx` ON `monitoring_rules` (`rule_type`);--> statement-breakpoint
CREATE INDEX `is_active_idx` ON `monitoring_rules` (`is_active`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `system_resource_logs` (`created_at`);