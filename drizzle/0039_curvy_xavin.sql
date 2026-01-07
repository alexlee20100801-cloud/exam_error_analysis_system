CREATE TABLE `quality_improvements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`score_id` int NOT NULL,
	`issue_category` enum('completeness','accuracy','clarity','difficulty','knowledge_tag') NOT NULL,
	`issue_description` text NOT NULL,
	`suggested_fix` text,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`resolved_by` int,
	`resolved_at` timestamp,
	`resolution_note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quality_improvements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quality_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_name` varchar(200) NOT NULL,
	`rule_category` enum('completeness','accuracy','clarity','difficulty','knowledge_tag') NOT NULL,
	`rule_description` text,
	`weight` decimal(5,2) NOT NULL DEFAULT '1.00',
	`threshold` decimal(5,2),
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quality_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quality_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`overall_score` decimal(5,2) NOT NULL,
	`completeness_score` decimal(5,2) NOT NULL,
	`accuracy_score` decimal(5,2) NOT NULL,
	`clarity_score` decimal(5,2) NOT NULL,
	`difficulty_score` decimal(5,2) NOT NULL,
	`knowledge_tag_score` decimal(5,2) NOT NULL,
	`issues_found` text,
	`scoring_method` enum('auto','manual','hybrid') NOT NULL DEFAULT 'auto',
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quality_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `question_idx` ON `quality_improvements` (`question_id`);--> statement-breakpoint
CREATE INDEX `score_idx` ON `quality_improvements` (`score_id`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `quality_improvements` (`issue_category`);--> statement-breakpoint
CREATE INDEX `priority_idx` ON `quality_improvements` (`priority`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `quality_improvements` (`status`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `quality_rules` (`rule_category`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `quality_rules` (`is_active`);--> statement-breakpoint
CREATE INDEX `question_idx` ON `quality_scores` (`question_id`);--> statement-breakpoint
CREATE INDEX `overall_score_idx` ON `quality_scores` (`overall_score`);--> statement-breakpoint
CREATE INDEX `scoring_method_idx` ON `quality_scores` (`scoring_method`);