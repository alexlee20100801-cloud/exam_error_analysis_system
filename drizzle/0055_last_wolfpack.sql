CREATE TABLE `ai_classification_evaluation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prompt_version_id` int NOT NULL,
	`test_set_size` int NOT NULL,
	`overall_accuracy` decimal(5,2) NOT NULL,
	`subject_accuracy` json,
	`grade_accuracy` json,
	`difficulty_accuracy` json,
	`confusion_matrix` json,
	`error_cases` json,
	`evaluated_by` int,
	`evaluated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_classification_evaluation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_classification_test_set` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_content` text NOT NULL,
	`question_image` varchar(500),
	`expected_subject` enum('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
	`expected_grade` enum('grade7','grade8','grade9','grade10','grade11','grade12') NOT NULL,
	`expected_difficulty` enum('easy','medium','hard') NOT NULL,
	`expected_knowledge_points` json,
	`data_source` enum('user_feedback','manual_annotation','expert_review') NOT NULL,
	`annotated_by` int,
	`confidence` decimal(5,2) DEFAULT '1.00',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_classification_test_set_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_prompt_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version_name` varchar(100) NOT NULL,
	`prompt_type` enum('classification','analysis','recommendation') NOT NULL,
	`prompt_content` text NOT NULL,
	`system_message` text,
	`temperature` decimal(3,2) DEFAULT '0.70',
	`max_tokens` int DEFAULT 2000,
	`is_active` tinyint NOT NULL DEFAULT 0,
	`performance_score` decimal(5,2),
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_prompt_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crawler_performance_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_id` int NOT NULL,
	`website_name` varchar(255) NOT NULL,
	`total_attempts` int NOT NULL DEFAULT 0,
	`successful_attempts` int NOT NULL DEFAULT 0,
	`failed_attempts` int NOT NULL DEFAULT 0,
	`average_response_time` int NOT NULL DEFAULT 0,
	`data_quality_score` decimal(5,2) DEFAULT '0.00',
	`error_messages` json,
	`last_run_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crawler_performance_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crawler_selector_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`website_name` varchar(255) NOT NULL,
	`website_url` varchar(500) NOT NULL,
	`rule_type` enum('css_selector','xpath','regex') NOT NULL,
	`target_field` varchar(100) NOT NULL,
	`selector_rule` text NOT NULL,
	`fallback_rule` text,
	`priority` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`success_rate` decimal(5,2) DEFAULT '0.00',
	`last_tested_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crawler_selector_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_algorithm_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_name` varchar(100) NOT NULL,
	`algorithm_version` varchar(50) NOT NULL,
	`error_frequency_weight` decimal(5,2) DEFAULT '0.30',
	`knowledge_coverage_weight` decimal(5,2) DEFAULT '0.25',
	`difficulty_balance_weight` decimal(5,2) DEFAULT '0.20',
	`mastery_level_weight` decimal(5,2) DEFAULT '0.15',
	`recency_weight` decimal(5,2) DEFAULT '0.10',
	`min_quality_score` decimal(5,2) DEFAULT '0.60',
	`is_active` tinyint NOT NULL DEFAULT 0,
	`performance_score` decimal(5,2),
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_algorithm_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_generation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paper_id` int NOT NULL,
	`user_id` int NOT NULL,
	`difficulty_rating` int NOT NULL,
	`knowledge_coverage_rating` int NOT NULL,
	`question_quality_rating` int NOT NULL,
	`overall_satisfaction` int NOT NULL,
	`comments` text,
	`completion_time` int,
	`correct_rate` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_generation_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_quality_evaluation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`evaluation_period` varchar(50) NOT NULL,
	`total_papers` int NOT NULL,
	`average_satisfaction` decimal(5,2) NOT NULL,
	`average_difficulty_rating` decimal(5,2) NOT NULL,
	`average_knowledge_coverage` decimal(5,2) NOT NULL,
	`average_question_quality` decimal(5,2) NOT NULL,
	`average_correct_rate` decimal(5,2),
	`improvement_suggestions` json,
	`evaluated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_quality_evaluation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_prompt_version_id` ON `ai_classification_evaluation_history` (`prompt_version_id`);--> statement-breakpoint
CREATE INDEX `idx_evaluated_at` ON `ai_classification_evaluation_history` (`evaluated_at`);--> statement-breakpoint
CREATE INDEX `idx_expected_subject` ON `ai_classification_test_set` (`expected_subject`);--> statement-breakpoint
CREATE INDEX `idx_data_source` ON `ai_classification_test_set` (`data_source`);--> statement-breakpoint
CREATE INDEX `idx_annotated_by` ON `ai_classification_test_set` (`annotated_by`);--> statement-breakpoint
CREATE INDEX `idx_prompt_type` ON `ai_prompt_versions` (`prompt_type`);--> statement-breakpoint
CREATE INDEX `idx_is_active` ON `ai_prompt_versions` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_created_by` ON `ai_prompt_versions` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_rule_id` ON `crawler_performance_stats` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_website_name` ON `crawler_performance_stats` (`website_name`);--> statement-breakpoint
CREATE INDEX `idx_last_run_at` ON `crawler_performance_stats` (`last_run_at`);--> statement-breakpoint
CREATE INDEX `idx_website_name` ON `crawler_selector_rules` (`website_name`);--> statement-breakpoint
CREATE INDEX `idx_target_field` ON `crawler_selector_rules` (`target_field`);--> statement-breakpoint
CREATE INDEX `idx_is_active` ON `crawler_selector_rules` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_is_active` ON `paper_algorithm_config` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_algorithm_version` ON `paper_algorithm_config` (`algorithm_version`);--> statement-breakpoint
CREATE INDEX `idx_paper_id` ON `paper_generation_feedback` (`paper_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `paper_generation_feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `paper_generation_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_config_id` ON `paper_quality_evaluation_history` (`config_id`);--> statement-breakpoint
CREATE INDEX `idx_evaluation_period` ON `paper_quality_evaluation_history` (`evaluation_period`);--> statement-breakpoint
CREATE INDEX `idx_evaluated_at` ON `paper_quality_evaluation_history` (`evaluated_at`);