CREATE TABLE `compliance_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`check_batch_id` varchar(100),
	`overall_status` enum('pass','warning','fail') NOT NULL DEFAULT 'pass',
	`violation_count` int NOT NULL DEFAULT 0,
	`check_details` json,
	`auto_review_passed` int NOT NULL DEFAULT 0,
	`needs_manual_review` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_name` varchar(200) NOT NULL,
	`rule_type` enum('sensitive_word','format_check','content_policy','copyright','out_of_scope','age_appropriate') NOT NULL,
	`rule_content` json NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`is_active` int NOT NULL DEFAULT 1,
	`description` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`check_id` int NOT NULL,
	`question_id` int NOT NULL,
	`rule_id` int NOT NULL,
	`violation_type` varchar(100) NOT NULL,
	`violation_content` text,
	`violation_context` text,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`suggested_action` text,
	`is_resolved` int NOT NULL DEFAULT 0,
	`resolved_by` int,
	`resolved_at` timestamp,
	`resolution_note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manual_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`check_id` int,
	`reviewer_id` int NOT NULL,
	`review_status` enum('approved','rejected','needs_revision','escalated') NOT NULL,
	`review_notes` text,
	`violations_confirmed` json,
	`violations_dismissed` json,
	`revisions_required` json,
	`review_duration` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manual_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewer_id` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`total_reviewed` int NOT NULL DEFAULT 0,
	`approved` int NOT NULL DEFAULT 0,
	`rejected` int NOT NULL DEFAULT 0,
	`needs_revision` int NOT NULL DEFAULT 0,
	`escalated` int NOT NULL DEFAULT 0,
	`avg_review_time` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_name` varchar(200) NOT NULL,
	`trigger_conditions` json,
	`review_steps` json,
	`auto_approval_rules` json,
	`escalation_rules` json,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `question_idx` ON `compliance_checks` (`question_id`);--> statement-breakpoint
CREATE INDEX `batch_idx` ON `compliance_checks` (`check_batch_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `compliance_checks` (`overall_status`);--> statement-breakpoint
CREATE INDEX `manual_review_idx` ON `compliance_checks` (`needs_manual_review`);--> statement-breakpoint
CREATE INDEX `rule_type_idx` ON `compliance_rules` (`rule_type`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `compliance_rules` (`is_active`);--> statement-breakpoint
CREATE INDEX `check_idx` ON `compliance_violations` (`check_id`);--> statement-breakpoint
CREATE INDEX `question_idx` ON `compliance_violations` (`question_id`);--> statement-breakpoint
CREATE INDEX `rule_idx` ON `compliance_violations` (`rule_id`);--> statement-breakpoint
CREATE INDEX `severity_idx` ON `compliance_violations` (`severity`);--> statement-breakpoint
CREATE INDEX `resolved_idx` ON `compliance_violations` (`is_resolved`);--> statement-breakpoint
CREATE INDEX `question_idx` ON `manual_reviews` (`question_id`);--> statement-breakpoint
CREATE INDEX `reviewer_idx` ON `manual_reviews` (`reviewer_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `manual_reviews` (`review_status`);--> statement-breakpoint
CREATE INDEX `created_idx` ON `manual_reviews` (`created_at`);--> statement-breakpoint
CREATE INDEX `reviewer_date_idx` ON `review_stats` (`reviewer_id`,`date`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `review_workflows` (`is_active`);