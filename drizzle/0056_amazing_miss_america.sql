CREATE TABLE `ai_classification_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prompt_version_id` int NOT NULL,
	`evaluation_date` timestamp NOT NULL DEFAULT (now()),
	`accuracy` decimal(5,4) NOT NULL,
	`precision` decimal(5,4),
	`recall` decimal(5,4),
	`f1_score` decimal(5,4),
	`test_sample_count` int NOT NULL,
	`confusion_matrix` json,
	`error_cases` json,
	`avg_response_time` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_classification_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crawler_performance_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`selector_rule_id` int NOT NULL,
	`evaluation_date` timestamp NOT NULL DEFAULT (now()),
	`success_rate` decimal(5,4) NOT NULL,
	`avg_data_quality_score` decimal(3,2),
	`total_attempts` int NOT NULL,
	`successful_attempts` int NOT NULL,
	`failed_attempts` int NOT NULL,
	`avg_response_time` int,
	`error_types` json,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawler_performance_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_algorithm_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`evaluation_date` timestamp NOT NULL DEFAULT (now()),
	`avg_satisfaction_score` decimal(3,2),
	`knowledge_coverage_score` decimal(3,2),
	`difficulty_distribution_score` decimal(3,2),
	`question_type_variety_score` decimal(3,2),
	`generation_success_rate` decimal(5,4),
	`avg_generation_time` int,
	`feedback_count` int NOT NULL,
	`feedback_distribution` json,
	`weight_parameters` json,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_algorithm_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_alert_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`metric_type` enum('ai_classification','paper_algorithm','crawler_performance') NOT NULL,
	`metric_name` varchar(100) NOT NULL,
	`operator` enum('<','<=','>','>=','==') NOT NULL,
	`threshold` decimal(10,4) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`notification_channels` json NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`description` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_id` int NOT NULL,
	`metric_type` enum('ai_classification','paper_algorithm','crawler_performance') NOT NULL,
	`metric_id` int NOT NULL,
	`alert_time` timestamp NOT NULL DEFAULT (now()),
	`metric_value` decimal(10,4) NOT NULL,
	`threshold` decimal(10,4) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`status` enum('pending','acknowledged','resolved','ignored') NOT NULL DEFAULT 'pending',
	`notification_sent` int NOT NULL DEFAULT 0,
	`notification_details` json,
	`acknowledged_by` int,
	`acknowledged_at` timestamp,
	`resolved_by` int,
	`resolved_at` timestamp,
	`resolution_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_task_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_name` varchar(255) NOT NULL,
	`task_type` enum('performance_evaluation','weekly_report_generation','alert_check','cache_warmup','ab_test_decision') NOT NULL,
	`execution_time` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','failed','partial') NOT NULL,
	`duration` int,
	`details` json,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_task_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_type` enum('ai_classification','paper_algorithm','crawler_performance','comprehensive') NOT NULL,
	`week_start_date` timestamp NOT NULL,
	`week_end_date` timestamp NOT NULL,
	`report_data` json NOT NULL,
	`summary` text,
	`highlights` json,
	`issues` json,
	`recommendations` json,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`generated_by` int,
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
